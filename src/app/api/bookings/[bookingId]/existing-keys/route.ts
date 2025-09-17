import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// GET /api/bookings/[bookingId]/existing-keys - Get existing NUKI keys for a booking
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

    // Check if property is authorized for NUKI
    const NUKI_AUTHORIZED_PROPERTIES = [
      "Bořivojova 50", "Řehořova", "Ž001", "Ž004", "Ž101", "Ž102", "Ž103", "Ž104",
      "Ž201", "Ž202", "Ž203", "Ž204", "Ž301", "Ž302", "Ž303", "Ž304",
      "Ž401", "Ž402", "Ž403", "Ž404", "Ž501", "Ž502", "Ž503", "Ž504",
      "Ž601", "Ž602", "Ž604"
    ];

    const isAuthorized = NUKI_AUTHORIZED_PROPERTIES.includes(booking.propertyName);

    if (!isAuthorized) {
      return NextResponse.json({
        success: true,
        data: {
          booking: {
            id: booking.id,
            propertyName: booking.propertyName,
            isAuthorized: false
          },
          existingKeys: [],
          message: 'Property does not have NUKI smart lock access'
        }
      });
    }

    // Use our pre-computed mapping (for demo - normally would fetch from NUKI API)
    const existingKeysMappings: Record<string, any[]> = {
      'BK_45799790': [ // Ž103 - Oscar Canon
        {
          id: '68c3695489e3a04d6b7b984a',
          name: 'Oscar Canon',
          device: '103',
          keyType: 'ROOM',
          isActive: true,
          allowedFromDate: '2025-09-17T10:00:00.000Z',
          allowedUntilDate: '2025-09-19T11:00:00.000Z'
        },
        {
          id: '68c62c415e2d0f3e86e83c15',
          name: 'Oscar Canon',
          device: 'Main Door',
          keyType: 'MAIN_ENTRANCE',
          isActive: true,
          allowedFromDate: '2025-09-16T10:00:00.000Z',
          allowedUntilDate: '2025-09-19T11:00:00.000Z'
        }
      ]
    };

    const existingKeys = existingKeysMappings[booking.id] || [];

    // Generate universal keypad code if keys exist
    let universalKeypadCode = null;
    if (existingKeys.length > 0) {
      // In real implementation, this would come from NUKI API
      // For demo, generate a consistent code based on booking
      const hash = booking.id.split('_')[1];
      universalKeypadCode = (parseInt(hash.slice(-6), 16) % 900000 + 100000).toString();
    }

    return NextResponse.json({
      success: true,
      data: {
        booking: {
          id: booking.id,
          propertyName: booking.propertyName,
          guestLeaderName: booking.guestLeaderName,
          checkInDate: booking.checkInDate,
          checkOutDate: booking.checkOutDate,
          isAuthorized: true
        },
        existingKeys,
        universalKeypadCode,
        keysByType: existingKeys.reduce((acc, key) => {
          if (!acc[key.keyType]) acc[key.keyType] = [];
          acc[key.keyType].push(key);
          return acc;
        }, {} as Record<string, any[]>),
        totalKeys: existingKeys.length,
        hasKeys: existingKeys.length > 0
      }
    });

  } catch (error) {
    console.error('Error fetching existing NUKI keys:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch existing keys' },
      { status: 500 }
    );
  }
}