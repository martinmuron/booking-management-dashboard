import type { Prisma, VirtualKey as PrismaVirtualKeyModel } from '@prisma/client';
import { prisma } from '@/lib/database';
import { nukiApiService } from '@/services/nuki-api.service';
import { resolveNukiPropertyCode, deriveRoomNumber } from '@/utils/nuki-resolver';
import { getNukiPropertyType, hasNukiAccess } from '@/utils/nuki-properties';
import type { VirtualKeyType } from '@/types';

const KEY_GENERATION_STATUSES = new Set(['CHECKED_IN', 'PAYMENT_COMPLETED']);
const RETRY_INTERVAL_MINUTES = 15;

type PrismaClientLike = Pick<typeof prisma, 'booking' | 'virtualKey' | 'nukiKeyRetry'>;

type PrismaVirtualKey = PrismaVirtualKeyModel;

type EnsureOptions = {
  prismaClient?: PrismaClientLike;
  nukiApi?: typeof nukiApiService;
  force?: boolean;
  keyTypes?: VirtualKeyType[];
  keypadCode?: string;
};

type EnsureResult =
  | { status: 'not_found' }
  | { status: 'skipped'; reason: 'property_not_authorized' | 'room_unresolved' | 'status_not_ready' | 'booking_cancelled' }
  | { status: 'already'; reason: 'existing_keys'; keys: PrismaVirtualKey[] }
  | { status: 'failed'; reason: 'nuki_no_keys' | 'nuki_error'; error?: string }
  | { status: 'queued'; queuedKeyTypes: VirtualKeyType[]; universalKeypadCode: string | null }
  | { status: 'created'; keys: PrismaVirtualKey[]; universalKeypadCode: string; createdKeyTypes: VirtualKeyType[]; queuedKeyTypes: VirtualKeyType[] };

export async function ensureNukiKeysForBooking(
  bookingId: string,
  options: EnsureOptions = {}
): Promise<EnsureResult> {
  const client: PrismaClientLike = options.prismaClient ?? prisma;
  const nukiApi = options.nukiApi ?? nukiApiService;
  const forceGeneration = options.force === true;

  const booking = await client.booking.findUnique({
    where: { id: bookingId },
    include: {
      payments: true,
      virtualKeys: true,
    },
  });

  if (!booking) {
    return { status: 'not_found' };
  }

  if (booking.status === 'CANCELLED') {
    return { status: 'skipped', reason: 'booking_cancelled' };
  }

  if (!forceGeneration && !KEY_GENERATION_STATUSES.has(booking.status)) {
    return { status: 'skipped', reason: 'status_not_ready' };
  }

  const propertyCode = await resolveNukiPropertyCode(booking);

  if (!propertyCode || !hasNukiAccess(propertyCode)) {
    return { status: 'skipped', reason: 'property_not_authorized' };
  }

  const expectedKeyTypes = nukiApi.getKeyTypesForProperty(propertyCode ?? booking.propertyName);
  const existingActiveKeys = booking.virtualKeys?.filter(key => key.isActive) ?? [];
  const existingActiveTypes = new Set(existingActiveKeys.map(key => key.keyType));

  const requestedKeyTypes = options.keyTypes ?? expectedKeyTypes;
  const missingKeyTypes = requestedKeyTypes.filter(type => !existingActiveTypes.has(type));

  if (!forceGeneration && missingKeyTypes.length === 0) {
    if (existingActiveKeys.length > 0) {
      return { status: 'already', reason: 'existing_keys', keys: existingActiveKeys };
    }
    // No missing key types, but no active keys either (should not happen). Allow regeneration.
  }

  const propertyType = getNukiPropertyType(propertyCode);
  const roomCode = deriveRoomNumber(booking, propertyCode);

  if (propertyType === 'z-coded' && !roomCode) {
    return { status: 'skipped', reason: 'room_unresolved' };
  }

  const guestName = booking.guestLeaderName || booking.guestLeaderEmail || 'Guest';
  const keyTypesToGenerate = missingKeyTypes.length > 0 ? missingKeyTypes : requestedKeyTypes;

  try {
    const attemptWithCode = async (keypadCode?: string) =>
      nukiApi.createVirtualKeysForBooking(
        guestName,
        new Date(booking.checkInDate),
        new Date(booking.checkOutDate),
        roomCode ?? propertyCode,
        propertyCode,
        {
          keyTypes: keyTypesToGenerate,
          keypadCode,
        }
      );

    let creationAttempt = await attemptWithCode(options.keypadCode ?? booking.universalKeypadCode ?? undefined);

    const hasDuplicateCodeFailure = creationAttempt.failures.some((failure) =>
      failure.error.toLowerCase().includes("parameter 'code' is not valid")
    );

    if (hasDuplicateCodeFailure) {
      console.warn('[NUKI] Duplicate keypad code detected, regenerating...', {
        bookingId: booking.id,
        guestName,
        failures: creationAttempt.failures,
      });

      creationAttempt = await attemptWithCode(undefined);
    }

    const capacityFailures = creationAttempt.failures.filter((failure) =>
      failure.error === 'authorization_capacity_reached'
    );

    if (capacityFailures.length > 0) {
      console.warn('[NUKI] Authorization capacity reached. Running cleanup before retrying...', {
        bookingId: booking.id,
        failures: capacityFailures,
      });

      const cleanupResult = await nukiApi.cleanupExpiredAuthorizations();
      console.log('[NUKI] Cleanup result before retry:', cleanupResult);

      const retryKeyTypes = capacityFailures.map((failure) => failure.keyType);
      const retry = await nukiApi.createVirtualKeysForBooking(
        guestName,
        new Date(booking.checkInDate),
        new Date(booking.checkOutDate),
        roomCode ?? propertyCode,
        propertyCode,
        {
          keyTypes: retryKeyTypes,
          keypadCode: creationAttempt.universalKeypadCode,
        }
      );

      creationAttempt = {
        results: [...creationAttempt.results, ...retry.results],
        universalKeypadCode: creationAttempt.universalKeypadCode,
        attemptedKeyTypes: Array.from(new Set([
          ...creationAttempt.attemptedKeyTypes,
          ...retry.attemptedKeyTypes
        ])),
        failures: [
          ...creationAttempt.failures.filter((failure) => failure.error !== 'authorization_capacity_reached'),
          ...retry.failures,
        ],
      };
    }

    const { results, universalKeypadCode, failures } = creationAttempt;

    const createdKeyTypes = results.map(result => result.keyType as VirtualKeyType);

    if (results.length > 0) {
      await client.virtualKey.createMany({
        data: results.map(result => ({
          bookingId: booking.id,
          keyType: result.keyType as VirtualKeyType,
          nukiKeyId: result.nukiAuth.id,
        })),
        skipDuplicates: true,
      });
    }

    const universalCodeToPersist = booking.universalKeypadCode ?? universalKeypadCode;
    const updateData: Prisma.BookingUpdateArgs['data'] = {};

    if (universalCodeToPersist && booking.universalKeypadCode !== universalCodeToPersist) {
      updateData.universalKeypadCode = universalCodeToPersist;
    }

    if (!forceGeneration && booking.status === 'CHECKED_IN' && createdKeyTypes.length > 0) {
      updateData.status = 'KEYS_DISTRIBUTED';
    }

    if (Object.keys(updateData).length > 0) {
      await client.booking.update({
        where: { id: booking.id },
        data: updateData,
      });
    }

    const queuedKeyTypes: VirtualKeyType[] = [];
    const nextAttemptAt = new Date(Date.now() + RETRY_INTERVAL_MINUTES * 60 * 1000);

    for (const failure of failures) {
      if (!failure.deviceId) {
        console.error('Unable to queue Nuki key retry (missing deviceId):', failure.error);
        continue;
      }

      const existingRetry = await client.nukiKeyRetry.findFirst({
        where: {
          bookingId: booking.id,
          keyType: failure.keyType,
          status: { in: ['PENDING', 'PROCESSING', 'FAILED'] }
        }
      });

      if (existingRetry) {
        await client.nukiKeyRetry.update({
          where: { id: existingRetry.id },
          data: {
            status: 'PENDING',
            keypadCode: universalCodeToPersist ?? existingRetry.keypadCode,
            nextAttemptAt,
            lastError: failure.error,
            attemptCount: existingRetry.attemptCount + 1,
            deviceId: String(failure.deviceId),
          }
        });
      } else {
        await client.nukiKeyRetry.create({
          data: {
            bookingId: booking.id,
            keyType: failure.keyType,
            deviceId: String(failure.deviceId),
            keypadCode: universalCodeToPersist ?? universalKeypadCode,
            nextAttemptAt,
            lastError: failure.error,
            attemptCount: 1,
          }
        });
      }

      queuedKeyTypes.push(failure.keyType);
    }

    const storedKeys = await client.virtualKey.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    if (queuedKeyTypes.length > 0 && createdKeyTypes.length === 0) {
      return {
        status: 'queued',
        queuedKeyTypes,
        universalKeypadCode: universalCodeToPersist ?? null,
      };
    }

    if (createdKeyTypes.length === 0) {
      const capacityFailure = failures.find(failure => failure.error === 'authorization_capacity_reached');
      if (capacityFailure) {
        const current = capacityFailure.currentCount ?? 'unknown';
        const limit = capacityFailure.limit ?? 190;
        return {
          status: 'failed',
          reason: 'nuki_error',
          error: `The ${capacityFailure.deviceName ?? 'selected'} lock has reached its authorization capacity (${current}/${limit}). Expired codes were cleaned up automatically; if the issue persists, free up slots directly in Nuki and try again.`
        };
      }

      const duplicateFailure = failures.find((failure) =>
        failure.error.toLowerCase().includes("parameter 'code' is not valid")
      );

      if (duplicateFailure) {
        return {
          status: 'failed',
          reason: 'nuki_error',
          error: 'Nuki rejected the generated keypad code as invalid. Please retry key generation so a new code can be issued.'
        };
      }

      const failureMessage = failures[0]?.error ?? 'Unable to create any Nuki keys';
      return { status: 'failed', reason: 'nuki_error', error: failureMessage };
    }

    return {
      status: 'created',
      keys: storedKeys,
      universalKeypadCode: universalCodeToPersist ?? universalKeypadCode,
      createdKeyTypes,
      queuedKeyTypes,
    };
  } catch (error) {
    console.error('Failed to auto-generate Nuki keys for booking', bookingId, error);
    return {
      status: 'failed',
      reason: 'nuki_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export type EnsureNukiKeysResult = EnsureResult;
