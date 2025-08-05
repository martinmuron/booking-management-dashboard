import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const checkInDateFrom = searchParams.get('checkInDateFrom');
    const checkInDateTo = searchParams.get('checkInDateTo');
    const status = searchParams.get('status');

    // Fetch reservations and listings in parallel
    const [reservations, listings] = await Promise.all([
      hostAwayService.getReservations({
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        checkInDateFrom: checkInDateFrom || undefined,
        checkInDateTo: checkInDateTo || undefined,
        status: status || undefined,
      }),
      hostAwayService.getListings()
    ]);

    // Transform data for dashboard
    const transformedReservations = reservations.map(reservation => 
      hostAwayService.transformReservationForDashboard(reservation, listings)
    );

    return NextResponse.json({
      success: true,
      data: transformedReservations,
      count: transformedReservations.length
    });

  } catch (error) {
    console.error('Error fetching HostAway reservations:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch reservations',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}