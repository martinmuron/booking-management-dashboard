import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';
import { nukiApiService } from '@/services/nuki-api.service';
import { VirtualKeyService } from '@/services/virtual-key.service';

// POST /api/virtual-keys - Generate virtual keys for a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if keys already exist for this booking
    const existingKeys = await prisma.virtualKey.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' }
    });
    if (existingKeys.length > 0) {
      return NextResponse.json({
        success: true,
        data: { keys: existingKeys },
        message: 'Virtual keys already exist for this booking'
      });
    }

    // Admin can force generation even if check-in is far in the future
    const result = await ensureNukiKeysForBooking(booking.id, {
      force: true,
      allowEarlyGeneration: true
    });

    switch (result.status) {
      case 'failed':
        return NextResponse.json(
          { success: false, error: result.error ?? result.reason },
          { status: 500 }
        );

      case 'skipped':
        return NextResponse.json(
          { success: false, error: `Key generation skipped: ${result.reason}` },
          { status: 400 }
        );

      case 'too_early':
        // This shouldn't happen with allowEarlyGeneration=true, but handle it gracefully
        return NextResponse.json(
          {
            success: false,
            error: `Keys cannot be generated yet. Check-in is ${result.daysUntilGeneration} days away. Keys will be available 3 days before check-in.`
          },
          { status: 400 }
        );

      case 'queued':
        return NextResponse.json({
          success: true,
          data: {
            keys: existingKeys,
            universalKeypadCode: booking.universalKeypadCode,
            queuedKeyTypes: result.queuedKeyTypes
          },
          message: 'Key generation scheduled for retry'
        });

      case 'created':
        return NextResponse.json({
          success: true,
          data: {
            keys: result.keys,
            universalKeypadCode: result.universalKeypadCode,
            queuedKeyTypes: result.queuedKeyTypes,
          },
          message: `Successfully generated ${result.createdKeyTypes.length} virtual keys.`
        });

      case 'already':
        return NextResponse.json({
          success: true,
          data: {
            keys: existingKeys,
            universalKeypadCode: booking.universalKeypadCode,
            queuedKeyTypes: [],
          },
          message: 'Virtual keys already exist for this booking.'
        });

      case 'not_found':
        return NextResponse.json(
          { success: false, error: 'Booking no longer exists.' },
          { status: 404 }
        );

      default:
        return NextResponse.json({
          success: true,
          data: {
            keys: existingKeys,
            universalKeypadCode: booking.universalKeypadCode,
            queuedKeyTypes: [],
          },
          message: 'No changes were required.'
        });
    }
  } catch (error) {
    console.error('Error generating virtual keys:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to generate virtual keys' },
      { status: 500 }
    );
  }
}

// DELETE /api/virtual-keys - Deactivate virtual keys for a booking
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get existing virtual keys for the booking
    const existingKeys = await VirtualKeyService.getActiveVirtualKeys(bookingId);
    
    if (existingKeys.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active virtual keys found for this booking'
      });
    }

    // Revoke keys via Nuki API
    const nukiKeyIds = existingKeys.map(key => key.nukiKeyId);
    await nukiApiService.revokeAllKeysForBooking(nukiKeyIds);

    // Deactivate keys in our database
    await VirtualKeyService.deactivateAllKeysForBooking(bookingId);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deactivated ${existingKeys.length} virtual keys`
    });
  } catch (error) {
    console.error('Error deactivating virtual keys:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to deactivate virtual keys' },
      { status: 500 }
    );
  }
}
