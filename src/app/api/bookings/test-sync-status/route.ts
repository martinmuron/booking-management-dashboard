import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';
import { bookingService } from '@/services/booking.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get('reservationId');
    
    if (!reservationId) {
      return NextResponse.json({
        success: false,
        error: 'reservationId query parameter is required'
      }, { status: 400 });
    }
    
    console.log(`🧪 Testing sync for reservation ${reservationId}...`);
    
    // Fetch the reservation with custom fields
    const reservation = await hostAwayService.getReservationById(parseInt(reservationId));
    
    if (!reservation) {
      return NextResponse.json({
        success: false,
        error: `Reservation ${reservationId} not found in HostAway`
      }, { status: 404 });
    }
    
    console.log('📋 Reservation custom fields:', (reservation as any).customFieldValues);
    
    // Test the sync
    const syncResult = await bookingService.syncSpecificReservation(reservation);
    
    return NextResponse.json({
      success: true,
      message: 'Test sync completed',
      reservation: {
        id: reservation.id,
        guestName: reservation.guestName,
        checkInDate: reservation.arrivalDate,
        customFields: (reservation as any).customFieldValues || []
      },
      syncResult
    });
    
  } catch (error) {
    console.error('❌ Test sync failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Test sync failed'
    }, { status: 500 });
  }
}