import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { nukiService } from '@/services/nuki.service';
import { hostAwayService } from '@/services/hostaway.service';
import { hasNukiAccess, NUKI_AUTHORIZED_PROPERTIES } from '@/utils/nuki-properties';
import { VirtualKeyType } from '@/types';
import type { Booking as BookingModel } from '@prisma/client';

const DATE_TOLERANCE_MS = 48 * 60 * 60 * 1000; // 48 hours tolerance around stay dates

type Params = {
  params: Promise<{ bookingId: string }>;
};

type NukiKeyMatch = {
  id: string;
  code: string;
  device: string;
  keyType: VirtualKeyType;
  name: string;
  allowedFromDate?: string;
  allowedUntilDate?: string;
  isActive: boolean;
};

type NukiAuthorization = Awaited<ReturnType<typeof nukiService.getAllAuthorizations>>[number] & {
  smartlockId?: number;
  smartlockIds?: number[];
};

function isAuthorizedProperty(code: string | null): code is typeof NUKI_AUTHORIZED_PROPERTIES[number] {
  if (!code) return false;
  return (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).includes(code);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameSimilarity(guestName: string, keyName: string): number {
  const guestParts = normalize(guestName).split(' ').filter(part => part.length >= 3);
  const keyParts = normalize(keyName).split(' ');
  let matches = 0;

  for (const guestPart of guestParts) {
    if (guestPart && keyParts.some(part => part.includes(guestPart))) {
      matches++;
    }
  }

  return matches;
}

function mapDeviceToKeyType(deviceName: string | undefined): VirtualKeyType | null {
  if (!deviceName) return null;

  if (deviceName === 'Main Door' || deviceName === 'Borivojova Entry door' || deviceName === 'Řehořova') {
    return VirtualKeyType.MAIN_ENTRANCE;
  }

  if (deviceName === 'Laundry') {
    return VirtualKeyType.LAUNDRY_ROOM;
  }

  if (deviceName === 'Luggage') {
    return VirtualKeyType.LUGGAGE_ROOM;
  }

  if (/^\d{3}$/.test(deviceName)) {
    return VirtualKeyType.ROOM;
  }

  return null;
}

function isDeviceRelevant(propertyCode: string, deviceName: string | undefined): boolean {
  if (!deviceName) return false;

  if (propertyCode.startsWith('Ž')) {
    const trimmed = deviceName.trim();
    const roomCode = propertyCode.slice(1);

    if (trimmed === roomCode) {
      return true;
    }

    return ['Main Door', 'Laundry', 'Luggage'].includes(trimmed);
  }

  if (propertyCode === 'Bořivojova 50') {
    return deviceName === 'Borivojova Entry door';
  }

  if (propertyCode === 'Řehořova') {
    return deviceName === 'Řehořova';
  }

  return false;
}

function overlapsStay(
  allowedFrom: string | undefined,
  allowedUntil: string | undefined,
  checkIn: Date,
  checkOut: Date
): boolean {
  if (!allowedFrom || !allowedUntil) {
    return false;
  }

  const keyFrom = new Date(allowedFrom).getTime();
  const keyUntil = new Date(allowedUntil).getTime();
  const stayStart = checkIn.getTime() - DATE_TOLERANCE_MS;
  const stayEnd = checkOut.getTime() + DATE_TOLERANCE_MS;

  return keyFrom <= stayEnd && keyUntil >= stayStart;
}

async function resolveNukiPropertyCode(booking: BookingModel): Promise<string | null> {
  if (booking.propertyName && hasNukiAccess(booking.propertyName)) {
    return booking.propertyName;
  }

  if (!booking.hostAwayId) {
    return null;
  }

  const reservationId = Number(booking.hostAwayId.replace(/[^0-9]/g, ''));
  if (!reservationId) {
    return null;
  }

  const [reservation, listings] = await Promise.all([
    hostAwayService.getReservationById(reservationId),
    hostAwayService.getListings()
  ]);

  if (!reservation?.listingMapId) {
    return null;
  }

  const listing = listings.find(item => item.id === reservation.listingMapId);
  const internalName = listing?.name?.trim();

  if (internalName && hasNukiAccess(internalName)) {
    return internalName;
  }

  return null;
}

async function fetchBooking(bookingId: string): Promise<BookingModel | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (booking) {
    return booking;
  }

  return prisma.booking.findUnique({
    where: { hostAwayId: bookingId },
  });
}

function buildResponsePayload(
  booking: BookingModel,
  propertyCode: string | null,
  matches: NukiKeyMatch[],
  universalCode: string | null
) {
  const keysByType = matches.reduce<Record<string, NukiKeyMatch[]>>((acc, key) => {
    const typeKey = key.keyType;
    if (!acc[typeKey]) {
      acc[typeKey] = [];
    }
    acc[typeKey].push(key);
    return acc;
  }, {});

  return {
    booking: {
      id: booking.id,
      propertyName: booking.propertyName,
      guestLeaderName: booking.guestLeaderName,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      isAuthorized: !!propertyCode,
    },
    existingKeys: matches.map(match => ({
      id: match.id,
      device: match.device,
      keyType: match.keyType,
      name: match.name,
      isActive: match.isActive,
      allowedFromDate: match.allowedFromDate,
      allowedUntilDate: match.allowedUntilDate,
    })),
    universalKeypadCode: universalCode,
    keysByType,
    totalKeys: matches.length,
    hasKeys: matches.length > 0,
  };
}

async function matchNukiKeysToBooking(
  booking: BookingModel,
  propertyCode: string,
  smartlocks: Awaited<ReturnType<typeof nukiService.getAllDevices>>,
  authorizations: Awaited<ReturnType<typeof nukiService.getAllAuthorizations>>
): Promise<NukiKeyMatch[]> {
  const deviceNameById = new Map<number, string>();
  for (const lock of smartlocks) {
    deviceNameById.set(lock.smartlockId, lock.name);
  }

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const now = Date.now();

  const groupedByCode = new Map<string, Array<{
    auth: NukiAuthorization;
    deviceName: string;
    similarity: number;
  }>>();

  for (const auth of authorizations) {
    if (auth.type !== 13 || !auth.code) {
      continue;
    }

    const authWithDevice = auth as NukiAuthorization;
    const smartlockId: number | undefined = typeof authWithDevice.smartlockId === 'number'
      ? authWithDevice.smartlockId
      : Array.isArray(authWithDevice.smartlockIds)
        ? authWithDevice.smartlockIds[0]
        : undefined;
    if (!smartlockId) {
      continue;
    }

    const deviceName = deviceNameById.get(smartlockId);
    if (!isDeviceRelevant(propertyCode, deviceName)) {
      continue;
    }

    if (!overlapsStay(auth.allowedFromDate, auth.allowedUntilDate, checkIn, checkOut)) {
      continue;
    }

    const similarity = auth.name ? nameSimilarity(booking.guestLeaderName, auth.name) : 0;

    const codeKey = String(auth.code);
    const entries = groupedByCode.get(codeKey) ?? [];
    entries.push({ auth, deviceName: deviceName || '', similarity });
    groupedByCode.set(codeKey, entries);
  }

  const matches: NukiKeyMatch[] = [];

  for (const [codeKey, entries] of groupedByCode.entries()) {
    if (entries.length === 0) {
      continue;
    }

    // Determine whether this code belongs to the booking by checking similarity
    const bestEntry = entries.reduce((best, current) => {
      if (!best || current.similarity > best.similarity) {
        return current;
      }
      return best;
    });

    const hasNameMatch = bestEntry.similarity > 0;
    const shouldInclude = hasNameMatch || groupedByCode.size === 1 || entries.length === 1;

    if (!shouldInclude) {
      continue;
    }

    for (const entry of entries) {
      const keyType = mapDeviceToKeyType(entry.deviceName);
      if (!keyType) {
        continue;
      }

      const auth = entry.auth as NukiAuthorization;
      const codeString = String(codeKey).padStart(6, '0');
      const allowedUntil = auth.allowedUntilDate ? new Date(auth.allowedUntilDate).getTime() : null;
      const isActive = !!auth.enabled && (!allowedUntil || allowedUntil >= now);

      matches.push({
        id: String(auth.id),
        code: codeString,
        device: entry.deviceName,
        keyType,
        name: auth.name || booking.guestLeaderName,
        allowedFromDate: auth.allowedFromDate,
        allowedUntilDate: auth.allowedUntilDate,
        isActive,
      });
    }
  }

  return matches;
}

async function persistMatches(bookingId: string, matches: NukiKeyMatch[]) {
  for (const match of matches) {
    await prisma.virtualKey.upsert({
      where: { nukiKeyId: match.id },
      update: {
        bookingId,
        keyType: match.keyType,
        isActive: match.isActive,
        deactivatedAt: match.isActive ? null : new Date(),
      },
      create: {
        bookingId,
        nukiKeyId: match.id,
        keyType: match.keyType,
        isActive: match.isActive,
      },
    });
  }
}

// GET /api/bookings/[bookingId]/existing-keys - Get existing NUKI keys for a booking
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { bookingId } = await params;

    const booking = await fetchBooking(bookingId);

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const propertyCode = await resolveNukiPropertyCode(booking);

    if (!isAuthorizedProperty(propertyCode)) {
      return NextResponse.json({
        success: true,
        data: buildResponsePayload(booking, null, [], null),
      });
    }

    if (!process.env.NUKI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'NUKI_API_KEY is not configured',
      }, { status: 500 });
    }

    const [smartlocks, authorizations] = await Promise.all([
      nukiService.getAllDevices(),
      nukiService.getAllAuthorizations()
    ]);

    const matches = await matchNukiKeysToBooking(booking, propertyCode, smartlocks, authorizations);

    if (matches.length === 0) {
      return NextResponse.json({
        success: true,
        data: buildResponsePayload(booking, propertyCode, [], null),
      });
    }

    await persistMatches(booking.id, matches);

    const codes = Array.from(new Set(matches.map(match => match.code)));
    const primaryCode = codes[0] ?? null;

    if (primaryCode && booking.universalKeypadCode !== primaryCode) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { universalKeypadCode: primaryCode },
      });
    }

    return NextResponse.json({
      success: true,
      data: buildResponsePayload(booking, propertyCode, matches, primaryCode),
    });
  } catch (error) {
    console.error('Error fetching existing NUKI keys:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch existing keys' },
      { status: 500 }
    );
  }
}
