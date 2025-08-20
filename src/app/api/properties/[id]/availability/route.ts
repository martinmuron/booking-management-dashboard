import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listingId = parseInt(params.id);
    const searchParams = request.nextUrl.searchParams;
    
    const checkInDate = searchParams.get('checkIn');
    const checkOutDate = searchParams.get('checkOut');
    
    if (!checkInDate || !checkOutDate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'checkIn and checkOut dates are required' 
        },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(checkInDate) || !dateRegex.test(checkOutDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dates must be in YYYY-MM-DD format' 
        },
        { status: 400 }
      );
    }

    // Check if check-in is before check-out
    if (new Date(checkInDate) >= new Date(checkOutDate)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Check-in date must be before check-out date' 
        },
        { status: 400 }
      );
    }

    const availability = await hostAwayService.checkAvailability(
      listingId, 
      checkInDate, 
      checkOutDate
    );
    
    return NextResponse.json({
      success: true,
      data: {
        listingId,
        checkInDate,
        checkOutDate,
        ...availability
      }
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check availability',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}