import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reservationId } = await params;
    
    if (!reservationId) {
      return NextResponse.json({
        success: false,
        error: 'Reservation ID is required'
      }, { status: 400 });
    }

    console.log(`🔍 API: Fetching reservation ${reservationId} from HostAway`);
    
    const reservation = await hostAwayService.getReservationById(parseInt(reservationId));
    
    if (reservation) {
      return NextResponse.json({
        success: true,
        data: reservation
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Reservation not found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('❌ Get reservation API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}