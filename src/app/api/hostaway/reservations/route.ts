import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

// Mock data as fallback when HostAway API fails
const mockTransformedReservations = [
  {
    id: "123456",
    propertyName: "Downtown Loft",
    guestLeaderName: "John Smith",
    checkInDate: "2024-08-10",
    numberOfGuests: 2,
    hostawaStatus: "confirmed"
  },
  {
    id: "123457",
    propertyName: "Seaside Villa",
    guestLeaderName: "Maria Garcia", 
    checkInDate: "2024-08-12",
    numberOfGuests: 4,
    hostawaStatus: "confirmed"
  },
  {
    id: "123458",
    propertyName: "Mountain Cabin",
    guestLeaderName: "David Johnson",
    checkInDate: "2024-08-08", 
    numberOfGuests: 6,
    hostawaStatus: "confirmed"
  }
];

export async function GET(request: NextRequest) {
  console.log('HostAway API route called');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const checkInDateFrom = searchParams.get('checkInDateFrom');
    const checkInDateTo = searchParams.get('checkInDateTo');
    const status = searchParams.get('status');

    console.log('Attempting to fetch from HostAway...');

    // Add timeout to the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('HostAway API timeout')), 10000);
    });

    const fetchPromise = Promise.all([
      hostAwayService.getReservations({
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined,
        checkInDateFrom: checkInDateFrom || undefined,
        checkInDateTo: checkInDateTo || undefined,
        status: status || undefined,
      }),
      hostAwayService.getListings()
    ]);

    const [reservations, listings] = await Promise.race([fetchPromise, timeoutPromise]) as [unknown[], unknown[]];

    // Transform data for dashboard
    const transformedReservations = reservations.map((reservation: unknown) => 
      hostAwayService.transformReservationForDashboard(reservation as Record<string, unknown>, listings as Record<string, unknown>[])
    );

    console.log(`Successfully fetched ${transformedReservations.length} reservations from HostAway`);

    return NextResponse.json({
      success: true,
      data: transformedReservations,
      count: transformedReservations.length,
      source: 'hostaway'
    });

  } catch (error) {
    console.error('HostAway API error, falling back to mock data:', error);
    
    // Return mock data as fallback
    return NextResponse.json({
      success: true,
      data: mockTransformedReservations,
      count: mockTransformedReservations.length,
      source: 'mock',
      warning: 'Using mock data - HostAway API unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}