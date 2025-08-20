import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const checkInDate = searchParams.get('checkIn');
    const checkOutDate = searchParams.get('checkOut');
    const guests = searchParams.get('guests');
    
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

    // Try HostAway server-side filtered listings using availability window and optional guest count
    const guestCount = guests ? parseInt(guests) : undefined;
    const filteredListings = await hostAwayService.searchListings({
      availabilityDateStart: checkInDate,
      availabilityDateEnd: checkOutDate,
      availabilityGuestNumber: !isNaN(Number(guestCount)) ? guestCount : undefined,
    });

    // As a secondary safety, if server-side filtering returns nothing, fall back to client-side capacity filter on all listings
    const listingsForResult = filteredListings.length > 0
      ? filteredListings
      : await hostAwayService.getListings();
    const capacityFiltered = guestCount
      ? listingsForResult.filter(l => (l.personCapacity ?? 0) >= (guestCount || 0))
      : listingsForResult;

    // For each listing, compute availability via calendar to be precise for the date range
    const detailedResults = await Promise.all(capacityFiltered.map(async (listing) => {
      const availability = await hostAwayService.checkAvailability(
        listing.id,
        checkInDate,
        checkOutDate
      );
      return {
        listing: {
          id: listing.id,
          name: listing.name,
          address: listing.address,
          personCapacity: listing.personCapacity,
          bedroomsNumber: listing.bedroomsNumber,
          bathroomsNumber: listing.bathroomsNumber,
          thumbnailUrl: listing.thumbnailUrl,
          listingImages: listing.listingImages,
          airbnbListingUrl: listing.airbnbListingUrl,
          vrboListingUrl: listing.vrboListingUrl,
          expediaListingUrl: listing.expediaListingUrl
        },
        availability
      };
    }));

    const availableProperties = detailedResults.filter(r => r.availability.available);
    const unavailableProperties = detailedResults.filter(r => !r.availability.available);

    return NextResponse.json({
      success: true,
      data: {
        searchCriteria: {
          checkInDate,
          checkOutDate,
          guests: guests ? parseInt(guests) : undefined
        },
        summary: {
          total: detailedResults.length,
          available: availableProperties.length,
          unavailable: unavailableProperties.length
        },
        availableProperties,
        unavailableProperties
      }
    });
  } catch (error) {
    console.error('Error checking bulk availability:', error);
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