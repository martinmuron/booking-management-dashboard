import { NextRequest, NextResponse } from 'next/server';
import { nukiApiService } from '@/services/nuki-api.service';
import { VirtualKeyService } from '@/services/virtual-key.service';
import { prisma } from '@/lib/database';
import { VirtualKeyType } from '@/types';

// POST /api/virtual-keys - Generate virtual keys for a booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, roomNumber } = body;
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    if (!roomNumber) {
      return NextResponse.json(
        { success: false, error: 'Room number is required' },
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
    const existingKeys = await VirtualKeyService.getVirtualKeysByBookingId(bookingId);
    if (existingKeys.length > 0) {
      return NextResponse.json({
        success: true,
        data: { keys: existingKeys },
        message: 'Virtual keys already exist for this booking'
      });
    }

    // Create virtual keys via Nuki API with universal keypad code
    const { results: nukiResults, universalKeypadCode } = await nukiApiService.createVirtualKeysForBooking(
      booking.guestLeaderName,
      new Date(booking.checkInDate),
      new Date(booking.checkOutDate),
      roomNumber,
      [
        VirtualKeyType.MAIN_ENTRANCE,
        VirtualKeyType.ROOM,
        VirtualKeyType.LUGGAGE_ROOM,
        VirtualKeyType.LAUNDRY_ROOM,
      ]
    );

    if (nukiResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Failed to create any virtual keys via Nuki API' },
        { status: 500 }
      );
    }

    // Store the keys in our database
    const virtualKeys = await VirtualKeyService.createVirtualKeys(
      bookingId,
      nukiResults.map(result => ({
        keyType: result.keyType,
        nukiKeyId: result.nukiAuth.id,
      }))
    );

    // Update booking with universal keypad code
    await prisma.booking.update({
      where: { id: bookingId },
      data: { universalKeypadCode },
    });
    
    return NextResponse.json({
      success: true,
      data: { 
        keys: virtualKeys,
        universalKeypadCode,
        roomNumber,
        nukiDetails: nukiResults.map(r => ({
          keyType: r.keyType,
          nukiKeyId: r.nukiAuth.id,
          name: r.nukiAuth.name,
          allowedFrom: r.nukiAuth.allowedFromDate,
          allowedUntil: r.nukiAuth.allowedUntilDate,
        }))
      },
      message: `Successfully generated ${virtualKeys.length} virtual keys with universal code ${universalKeypadCode} for room ${roomNumber}`
    });
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