import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { resolveNukiPropertyCode } from '@/utils/nuki-resolver';
import { VirtualKeyType } from '@/types';

const deviceLabels: Record<VirtualKeyType, string> = {
  MAIN_ENTRANCE: 'Main Entrance',
  LUGGAGE_ROOM: 'Luggage Room',
  LAUNDRY_ROOM: 'Laundry Room',
  ROOM: 'Room'
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        virtualKeys: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const propertyCode = await resolveNukiPropertyCode(booking);
    const isAuthorized = Boolean(propertyCode);
    const hasKeys = booking.virtualKeys.length > 0;
    const pendingRetries = await prisma.nukiKeyRetry.findMany({
      where: {
        bookingId: booking.id,
        status: { in: ['PENDING', 'PROCESSING'] }
      }
    });

    const existingKeys = booking.virtualKeys.map(key => ({
      id: key.nukiKeyId,
      code: booking.universalKeypadCode ?? '—',
      device: deviceLabels[key.keyType] ?? key.keyType,
      keyType: key.keyType,
      name: booking.guestLeaderName,
      isActive: key.isActive,
      allowedFromDate: booking.checkInDate.toISOString(),
      allowedUntilDate: booking.checkOutDate.toISOString(),
      matchedGuest: booking.guestLeaderName
    }));

    return NextResponse.json({
      success: true,
      data: {
        hasKeys,
        existingKeys,
        totalKeys: existingKeys.length,
        universalKeypadCode: booking.universalKeypadCode ?? null,
        queuedKeyTypes: pendingRetries.map(retry => retry.keyType),
        booking: {
          isAuthorized
        }
      }
    });
  } catch (error) {
    console.error('Failed to load stored Nuki keys for booking', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stored keys' },
      { status: 500 }
    );
  }
}
