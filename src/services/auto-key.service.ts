import type { Prisma, VirtualKey as PrismaVirtualKeyModel } from '@prisma/client';
import { prisma } from '@/lib/database';
import { nukiApiService } from '@/services/nuki-api.service';
import { hostAwayService } from '@/services/hostaway.service';
import { getNukiPropertyMapping } from '@/utils/nuki-properties-mapping';
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

  // Get HostAway listing ID for precise Nuki mapping
  let listingId: number | undefined;
  let listingMapping: ReturnType<typeof getNukiPropertyMapping> = null;

  try {
    if (booking.hostAwayId) {
      const reservationId = Number(booking.hostAwayId.replace(/[^0-9]/g, ''));
      if (reservationId) {
        const reservation = await hostAwayService.getReservationById(reservationId);
        if (reservation?.listingMapId) {
          listingId = reservation.listingMapId;
          listingMapping = getNukiPropertyMapping(listingId);
          if (listingMapping) {
            console.log(`✅ [NUKI] Property authorized via HostAway listing ID ${listingMapping.listingId}: ${listingMapping.name} (${listingMapping.propertyType})`);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to fetch HostAway listing ID:', error);
  }

  // Authorization check: HostAway listing ID mapping only
  if (!listingMapping) {
    return { status: 'skipped', reason: 'property_not_authorized' };
  }

  const expectedKeyTypes = await nukiApi.getKeyTypesForProperty(listingId);
  const existingActiveKeys = booking.virtualKeys?.filter(key => key.isActive) ?? [];
  const existingActiveTypes = new Set(existingActiveKeys.map(key => key.keyType));

  const requestedKeyTypes = options.keyTypes ?? expectedKeyTypes;
  const missingKeyTypes = requestedKeyTypes.filter(type => !existingActiveTypes.has(type));

  if (missingKeyTypes.length === 0) {
    if (existingActiveKeys.length > 0) {
      return { status: 'already', reason: 'existing_keys', keys: existingActiveKeys };
    }
    // No missing key types, but no active keys either (should not happen). Allow regeneration.
  }

  // Get room code from listing mapping (Prokopova properties only)
  const roomCode = listingMapping.propertyType === 'prokopova' ? listingMapping.roomCode : undefined;

  const guestName = booking.guestLeaderName || booking.guestLeaderEmail || 'Guest';
  const keyTypesToGenerate = missingKeyTypes;

  try {
    const attemptWithCode = async (keypadCode?: string) =>
      nukiApi.createVirtualKeysForBooking(
        guestName,
        new Date(booking.checkInDate),
        new Date(booking.checkOutDate),
        roomCode ?? booking.propertyName ?? 'Unknown',
        listingId,
        {
          keyTypes: keyTypesToGenerate,
          keypadCode,
        }
      );

    let creationAttempt = await attemptWithCode(options.keypadCode ?? booking.universalKeypadCode ?? undefined);

    const hasDuplicateCodeFailure = creationAttempt.failures.some((failure) =>
      failure.error.toLowerCase().includes("parameter 'code' is not valid") ||
      failure.error.toLowerCase().includes("code' exists already") ||
      (failure.error.includes('409') && failure.error.toLowerCase().includes('exists already'))
    );
    let regeneratedCode = false;

    if (hasDuplicateCodeFailure) {
      console.warn('🔄 [NUKI] Duplicate keypad code detected, regenerating...', {
        bookingId: booking.id,
        hostAwayId: booking.hostAwayId,
        guestName,
        propertyName: booking.propertyName,
        checkInDate: booking.checkInDate,
        originalCode: booking.universalKeypadCode,
        failures: creationAttempt.failures.map(f => ({
          keyType: f.keyType,
          deviceName: f.deviceName,
          error: f.error
        })),
        timestamp: new Date().toISOString(),
      });

      creationAttempt = await attemptWithCode(undefined);
      regeneratedCode = true;
    }

    const capacityFailures = creationAttempt.failures.filter((failure) =>
      failure.error === 'authorization_capacity_reached'
    );

    if (capacityFailures.length > 0) {
      console.warn('⚠️ [NUKI] Authorization capacity reached. Running cleanup before retrying...', {
        bookingId: booking.id,
        hostAwayId: booking.hostAwayId,
        guestName,
        propertyName: booking.propertyName,
        checkInDate: booking.checkInDate,
        affectedDevices: capacityFailures.map(f => ({
          keyType: f.keyType,
          deviceName: f.deviceName,
          deviceId: f.deviceId,
          currentCount: f.currentCount,
          limit: f.limit,
          utilizationRate: f.currentCount && f.limit ? `${Math.round((f.currentCount / f.limit) * 100)}%` : 'unknown'
        })),
        failureCount: capacityFailures.length,
        timestamp: new Date().toISOString(),
      });

      const cleanupResult = await nukiApi.cleanupExpiredAuthorizations();
      console.log('[NUKI] Cleanup result before retry:', cleanupResult);

      const retryKeyTypes = capacityFailures.map((failure) => failure.keyType);
      const retry = await nukiApi.createVirtualKeysForBooking(
        guestName,
        new Date(booking.checkInDate),
        new Date(booking.checkOutDate),
        roomCode ?? booking.propertyName ?? 'Unknown',
        listingId,
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

    const universalCodeToPersist = regeneratedCode
      ? universalKeypadCode
      : booking.universalKeypadCode ?? universalKeypadCode;
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
      console.warn('⏳ [NUKI] Key generation queued for retry', {
        bookingId: booking.id,
        hostAwayId: booking.hostAwayId,
        guestName,
        propertyName: booking.propertyName,
        checkInDate: booking.checkInDate,
        queuedKeyTypes,
        nextRetryIn: `${RETRY_INTERVAL_MINUTES} minutes`,
        nextRetryAt: new Date(Date.now() + RETRY_INTERVAL_MINUTES * 60 * 1000).toISOString(),
        failureDetails: failures.map(f => ({
          keyType: f.keyType,
          deviceName: f.deviceName,
          deviceId: f.deviceId,
          error: f.error,
          errorCategory: f.error === 'authorization_capacity_reached' ? 'CAPACITY' :
                        f.error.toLowerCase().includes('code') ? 'KEYPAD_CODE' :
                        'OTHER'
        })),
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'queued',
        queuedKeyTypes,
        universalKeypadCode: universalCodeToPersist ?? null,
      };
    }

    if (createdKeyTypes.length === 0) {
      console.error('❌ [NUKI] Key generation failed - REQUIRES ADMIN ATTENTION', {
        severity: 'HIGH',
        bookingId: booking.id,
        hostAwayId: booking.hostAwayId,
        guestName,
        propertyName: booking.propertyName,
        checkInDate: booking.checkInDate,
        daysUntilCheckIn: Math.ceil((new Date(booking.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        failureCount: failures.length,
        failureDetails: failures.map(f => ({
          keyType: f.keyType,
          deviceName: f.deviceName,
          deviceId: f.deviceId,
          error: f.error,
          errorCategory: f.error === 'authorization_capacity_reached' ? 'CAPACITY' :
                        f.error.toLowerCase().includes('code') ? 'KEYPAD_CODE' :
                        f.error.toLowerCase().includes('offline') ? 'DEVICE_OFFLINE' :
                        'OTHER',
          priority: f.keyType === 'MAIN_ENTRANCE' ? 'CRITICAL' : 'HIGH'
        })),
        actionRequired: 'Check device status, verify connectivity, or manually create keys in Nuki app',
        timestamp: new Date().toISOString(),
      });
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
    console.error('🚨 [NUKI] Critical failure in auto-key generation - URGENT ADMIN ATTENTION REQUIRED', {
      severity: 'CRITICAL',
      bookingId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      actionRequired: 'Investigate system error and retry key generation manually',
      timestamp: new Date().toISOString(),
    });
    return {
      status: 'failed',
      reason: 'nuki_error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export type EnsureNukiKeysResult = EnsureResult;
