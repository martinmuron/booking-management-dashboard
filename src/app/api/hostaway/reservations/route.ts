import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

// Import types from the service file
type HostAwayReservation = {
  id: number;
  checkInDate: string;
  checkOutDate: string;
  guestFirstName: string;
  guestLastName: string;
  personCapacity: number;
  status: string;
  listingId: number;
  channelId: number;
  listing?: {
    name: string;
    address: string;
  };
};

type HostAwayListing = {
  id: number;
  name: string;
  address: string;
};

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
  console.log('🔄 HostAway API route called at:', new Date().toISOString());
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const checkInDateFrom = searchParams.get('checkInDateFrom');
    const checkInDateTo = searchParams.get('checkInDateTo');
    const status = searchParams.get('status');

    console.log('🔍 Attempting to fetch from HostAway API with params:', {
      limit, offset, checkInDateFrom, checkInDateTo, status
    });

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

    const [reservationsResponse, listingsResponse] = await Promise.race([fetchPromise, timeoutPromise]) as [
      { result?: unknown[] }, 
      { result?: unknown[] }
    ];

    // Extract the actual reservation and listing arrays from the API responses
    const reservations = reservationsResponse?.result || [];
    const listings = listingsResponse?.result || [];

    // Transform data for dashboard - using unknown and letting the service handle type safety
    const transformedReservations = reservations.map((reservation: unknown) => 
      hostAwayService.transformReservationForDashboard(reservation as HostAwayReservation, listings as HostAwayListing[])
    );

    console.log(`Successfully fetched ${transformedReservations.length} reservations from HostAway`);

    return NextResponse.json({
      success: true,
      data: transformedReservations,
      count: transformedReservations.length,
      source: 'hostaway'
    });

  } catch (error) {
    console.error('❌ HostAway API error, falling back to mock data:', error);
    console.log('📊 Returning mock data with', mockTransformedReservations.length, 'reservations');
    
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