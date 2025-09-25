import type { Prisma, VirtualKey as PrismaVirtualKeyModel } from '@prisma/client';
import { prisma } from '@/lib/database';
import { nukiApiService } from '@/services/nuki-api.service';
import { resolveNukiPropertyCode, deriveRoomNumber } from '@/utils/nuki-resolver';
import { getNukiPropertyType, hasNukiAccess } from '@/utils/nuki-properties';
import type { VirtualKeyType } from '@/types';

const KEY_GENERATION_STATUSES = new Set(['CHECKED_IN', 'PAYMENT_COMPLETED']);

type PrismaClientLike = {
  booking: {
    findUnique: (args: Prisma.BookingFindUniqueArgs) => Promise<BookingWithRelations | null>;
    update: (args: Prisma.BookingUpdateArgs) => Promise<BookingWithRelations>;
  };
  virtualKey: {
    findMany: (args: Prisma.VirtualKeyFindManyArgs) => Promise<PrismaVirtualKey[]>;
    createMany: (args: Prisma.VirtualKeyCreateManyArgs) => Promise<Prisma.BatchPayload>;
  };
};

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    payments: true;
    virtualKeys: true;
  };
}>;

type PrismaVirtualKey = PrismaVirtualKeyModel;

type EnsureOptions = {
  prismaClient?: PrismaClientLike;
  nukiApi?: typeof nukiApiService;
  force?: boolean;
};

type EnsureResult =
  | { status: 'not_found' }
  | { status: 'skipped'; reason: 'property_not_authorized' | 'room_unresolved' | 'status_not_ready' | 'booking_cancelled' }
  | { status: 'already'; reason: 'existing_keys'; keys: PrismaVirtualKey[] }
  | { status: 'failed'; reason: 'nuki_no_keys' | 'nuki_error'; error?: string }
  | { status: 'created'; keys: PrismaVirtualKey[]; universalKeypadCode: string };

export async function ensureNukiKeysForBooking(
  bookingId: string,
  options: EnsureOptions = {}
): Promise<EnsureResult> {
  const client = options.prismaClient ?? (prisma as PrismaClientLike);
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

  const existingActiveKeys = booking.virtualKeys?.filter(key => key.isActive) ?? [];
  if (existingActiveKeys.length > 0) {
    return { status: 'already', reason: 'existing_keys', keys: existingActiveKeys };
  }

  const propertyType = getNukiPropertyType(propertyCode);
  const roomCode = deriveRoomNumber(booking, propertyCode);

  if (propertyType === 'z-coded' && !roomCode) {
    return { status: 'skipped', reason: 'room_unresolved' };
  }

  const guestName = booking.guestLeaderName || booking.guestLeaderEmail || 'Guest';

  try {
    const { results, universalKeypadCode } = await nukiApi.createVirtualKeysForBooking(
      guestName,
      new Date(booking.checkInDate),
      new Date(booking.checkOutDate),
      roomCode ?? propertyCode,
      propertyCode,
    );

    if (!results.length) {
      return { status: 'failed', reason: 'nuki_no_keys' };
    }

    await client.virtualKey.createMany({
      data: results.map(result => ({
        bookingId: booking.id,
        keyType: result.keyType as VirtualKeyType,
        nukiKeyId: result.nukiAuth.id,
      })),
    });

    const storedKeys = await client.virtualKey.findMany({
      where: { bookingId: booking.id },
      orderBy: { createdAt: 'asc' },
    });

    const updateData: Prisma.BookingUpdateArgs['data'] = {
      universalKeypadCode,
    };

    if (!forceGeneration && booking.status === 'CHECKED_IN') {
      updateData.status = 'KEYS_DISTRIBUTED';
    }

    await client.booking.update({
      where: { id: booking.id },
      data: updateData,
    });

    return {
      status: 'created',
      keys: storedKeys,
      universalKeypadCode,
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
