import type { Booking } from '@prisma/client';
import { hostAwayService } from '@/services/hostaway.service';
import { hasNukiAccess, NUKI_DEVICE_ROOM_CODES } from '@/utils/nuki-properties';
import { getRoomCodeFromListingId } from '@/utils/prokopova-room-mapping';

function normalize(input: string) {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase();
}

function findThreeDigitCode(value: string): string | null {
  const normalized = normalize(value);

  const zMatch = normalized.match(/Z\s*(\d{3})/);
  if (zMatch) {
    return zMatch[1];
  }

  const roomMatch = normalized.match(/ROOM\s*(\d{3})/);
  if (roomMatch) {
    return roomMatch[1];
  }

  const explicitMatch = normalized.match(/\b(\d{3})\b/);
  if (explicitMatch) {
    return explicitMatch[1];
  }

  return null;
}

/**
 * Attempt to resolve a canonical Nuki property identifier for the given booking.
 */
export async function resolveNukiPropertyCode(booking: Booking): Promise<string | null> {
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
    hostAwayService.getListings(),
  ]);

  if (!reservation?.listingMapId) {
    return null;
  }

  const listing = listings.find(item => item.id === reservation.listingMapId);
  const internalName = (listing?.internalListingName || listing?.name)?.trim();

  if (internalName && hasNukiAccess(internalName)) {
    return internalName;
  }

  const candidates: string[] = [];

  if (internalName) {
    candidates.push(internalName);
  }

  if (listing?.address) {
    candidates.push(listing.address);
  }

  if (booking.propertyName) {
    candidates.push(booking.propertyName);
  }

  if (booking.roomNumber) {
    candidates.push(booking.roomNumber);
  }

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (hasNukiAccess(candidate)) {
      return candidate;
    }

    const normalizedCandidate = normalize(candidate);
    if (normalizedCandidate.includes('PROKOPOVA')) {
      return 'Prokopova 197/9';
    }
  }

  return null;
}

/**
 * Infer the three-digit room code (if any) for a booking / property combination.
 * Uses HostAway listing ID mapping as primary method for accurate room detection.
 */
export async function deriveRoomNumber(booking: Booking, propertyCode?: string | null): Promise<string | null> {
  // Primary method: Use HostAway listing ID mapping for 100% accuracy
  if (booking.hostAwayId) {
    try {
      const reservationId = Number(booking.hostAwayId.replace(/[^0-9]/g, ''));
      if (reservationId) {
        const [reservation, listings] = await Promise.all([
          hostAwayService.getReservationById(reservationId),
          hostAwayService.getListings(),
        ]);

        if (reservation?.listingMapId) {
          const roomCode = getRoomCodeFromListingId(reservation.listingMapId);
          if (roomCode && NUKI_DEVICE_ROOM_CODES.has(roomCode)) {
            return roomCode;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to resolve room code from HostAway listing ID, falling back to property name parsing:', error);
    }
  }

  // Fallback method: Extract room code from property names/room numbers
  const candidates = [propertyCode, booking.propertyName, booking.roomNumber]
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const code = findThreeDigitCode(candidate);
    if (code && NUKI_DEVICE_ROOM_CODES.has(code)) {
      return code;
    }
  }

  return null;
}
