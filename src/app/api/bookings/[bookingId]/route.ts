import { NextRequest, NextResponse } from 'next/server';

// Mock booking data - will be replaced with database queries
const mockBookings = {
  'BK001': {
    id: 'BK001',
    propertyName: 'Downtown Loft',
    checkInDate: '2024-08-10T15:00:00Z',
    checkOutDate: '2024-08-15T11:00:00Z',
    numberOfGuests: 3,
    guestLeaderName: 'John Smith',
    cityTaxAmount: 15.00,
    cityTaxPerPerson: 5.00,
    status: 'confirmed'
  },
  'BK002': {
    id: 'BK002',
    propertyName: 'Seaside Villa',
    checkInDate: '2024-08-12T16:00:00Z',
    checkOutDate: '2024-08-18T10:00:00Z',
    numberOfGuests: 4,
    guestLeaderName: 'Maria Garcia',
    cityTaxAmount: 20.00,
    cityTaxPerPerson: 5.00,
    status: 'confirmed'
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    
    // Mock data lookup - replace with actual database query
    const booking = mockBookings[bookingId as keyof typeof mockBookings];
    
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch booking',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}