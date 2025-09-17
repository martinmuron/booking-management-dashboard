import { NextRequest, NextResponse } from 'next/server';
import { nukiApiService } from '@/services/nuki-api.service';
import { prisma } from '@/lib/database';

// GET /api/bookings/[bookingId]/nuki-keys - Get NUKI keys for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;

    // Get booking details
    let booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      booking = await prisma.booking.findUnique({
        where: { hostAwayId: bookingId },
      });
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Get all NUKI keys
    const allNukiKeys = await nukiApiService.getAllKeys();

    // Filter keys that match this booking by date and property
    const bookingCheckIn = new Date(booking.checkInDate);
    const bookingCheckOut = new Date(booking.checkOutDate);

    const matchingKeys = allNukiKeys.filter(key => {
      // Only check guest keys (time-limited)
      if (!key.allowedFromDate || !key.allowedUntilDate) return false;

      // Skip permanent staff keys
      if (key.name && (
        key.name.toLowerCase().includes('nuki') ||
        key.name.toLowerCase().includes('nick') ||
        key.name.toLowerCase().includes('jenny') ||
        key.name.toLowerCase().includes('cleaners') ||
        key.name.toLowerCase().includes('builders') ||
        key.name.toLowerCase().includes('management')
      )) return false;

      const keyFrom = new Date(key.allowedFromDate);
      const keyUntil = new Date(key.allowedUntilDate);

      // Check date overlap (allowing 2-day tolerance)
      const dateTolerance = 2 * 24 * 60 * 60 * 1000;
      const dateMatch = Math.abs(keyFrom.getTime() - bookingCheckIn.getTime()) <= dateTolerance &&
                       Math.abs(keyUntil.getTime() - bookingCheckOut.getTime()) <= dateTolerance;

      if (!dateMatch) return false;

      // Check property match
      const propertyMatch =
        (key.deviceName === '001' && booking.propertyName === 'Ž001') ||
        (key.deviceName === '004' && booking.propertyName === 'Ž004') ||
        (key.deviceName === '101' && booking.propertyName === 'Ž101') ||
        (key.deviceName === '102' && booking.propertyName === 'Ž102') ||
        (key.deviceName === '103' && booking.propertyName === 'Ž103') ||
        (key.deviceName === '104' && booking.propertyName === 'Ž104') ||
        (key.deviceName === '201' && booking.propertyName === 'Ž201') ||
        (key.deviceName === '202' && booking.propertyName === 'Ž202') ||
        (key.deviceName === '203' && booking.propertyName === 'Ž203') ||
        (key.deviceName === '204' && booking.propertyName === 'Ž204') ||
        (key.deviceName === '301' && booking.propertyName === 'Ž301') ||
        (key.deviceName === '302' && booking.propertyName === 'Ž302') ||
        (key.deviceName === '303' && booking.propertyName === 'Ž303') ||
        (key.deviceName === '304' && booking.propertyName === 'Ž304') ||
        (key.deviceName === '401' && booking.propertyName === 'Ž401') ||
        (key.deviceName === '402' && booking.propertyName === 'Ž402') ||
        (key.deviceName === '403' && booking.propertyName === 'Ž403') ||
        (key.deviceName === '404' && booking.propertyName === 'Ž404') ||
        (key.deviceName === '501' && booking.propertyName === 'Ž501') ||
        (key.deviceName === '502' && booking.propertyName === 'Ž502') ||
        (key.deviceName === '503' && booking.propertyName === 'Ž503') ||
        (key.deviceName === '504' && booking.propertyName === 'Ž504') ||
        (key.deviceName === '601' && booking.propertyName === 'Ž601') ||
        (key.deviceName === '602' && booking.propertyName === 'Ž602') ||
        (key.deviceName === '604' && booking.propertyName === 'Ž604') ||
        (key.deviceName === 'Borivojova Entry door' && booking.propertyName === 'Bořivojova 50') ||
        (key.deviceName === 'Řehořova' && booking.propertyName === 'Řehořova') ||
        (key.deviceName === 'Main Door' && booking.propertyName.startsWith('Ž')) ||
        (key.deviceName === 'Laundry' && booking.propertyName.startsWith('Ž')) ||
        (key.deviceName === 'Luggage' && booking.propertyName.startsWith('Ž'));

      if (!propertyMatch) return false;

      // Check name similarity
      if (key.name && booking.guestLeaderName) {
        const keyNameLower = key.name.toLowerCase();
        const guestNameLower = booking.guestLeaderName.toLowerCase();

        // Simple name matching
        const keyNameParts = keyNameLower.split(' ');
        const guestNameParts = guestNameLower.split(' ');

        let similarity = 0;
        keyNameParts.forEach(keyPart => {
          guestNameParts.forEach(guestPart => {
            if (keyPart.includes(guestPart) || guestPart.includes(keyPart)) {
              similarity++;
            }
          });
        });

        return similarity > 0;
      }

      return false;
    });

    // Group keys by device type
    const keysByDevice = matchingKeys.reduce((acc, key) => {
      let keyType = 'ROOM';
      if (key.deviceName === 'Main Door') keyType = 'MAIN_ENTRANCE';
      else if (key.deviceName === 'Laundry') keyType = 'LAUNDRY_ROOM';
      else if (key.deviceName === 'Luggage') keyType = 'LUGGAGE_ROOM';
      else if (key.deviceName === 'Borivojova Entry door') keyType = 'MAIN_ENTRANCE';
      else if (key.deviceName === 'Řehořova') keyType = 'MAIN_ENTRANCE';

      if (!acc[keyType]) acc[keyType] = [];
      acc[keyType].push(key);
      return acc;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          propertyName: booking.propertyName,
          guestLeaderName: booking.guestLeaderName,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate
        },
        matchingKeys,
        keysByDevice,
        totalKeys: matchingKeys.length
      }
    });

  } catch (error) {
    console.error('Error fetching NUKI keys for booking:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch NUKI keys' },
      { status: 500 }
    );
  }
}