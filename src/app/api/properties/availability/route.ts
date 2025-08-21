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

    // Get all listings for comparison and fallback
    const allListings = await hostAwayService.getListings();
    
    // Apply guest capacity filter if specified
    const capacityFiltered = guestCount
      ? allListings.filter(l => (l.personCapacity ?? 0) >= (guestCount || 0))
      : allListings;

    // Choose which listings to check - prefer server-side filtered results if they exist and make sense
    const shouldUseServerSideResults = filteredListings.length > 0 && filteredListings.length < capacityFiltered.length;
    const listingsForResult = shouldUseServerSideResults ? filteredListings : capacityFiltered;
    const detailedResults = await Promise.all(listingsForResult.map(async (listing) => {
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

    let availableProperties = detailedResults.filter(r => r.availability.available);
    let unavailableProperties = detailedResults.filter(r => !r.availability.available);

    // SMART FALLBACK: If NO properties show as available but server-side search found some,
    // this likely means calendar data is corrupted/not configured properly.
    // In this case, trust the server-side search and mark those as "likely available"
    const calendarDataSeemsBroken = availableProperties.length === 0 && filteredListings.length > 0;
    
    if (calendarDataSeemsBroken) {
      // Mark properties that were found by server-side search as potentially available
      const serverFilteredIds = new Set(filteredListings.map(l => l.id));
      
      availableProperties = detailedResults
        .filter(r => serverFilteredIds.has(r.listing.id))
        .map(r => ({
          ...r,
          availability: {
            ...r.availability,
            available: true, // Override calendar result
            fallbackReason: 'Server-side search found this property available, but calendar data appears incomplete'
          }
        }));
      
      unavailableProperties = detailedResults.filter(r => !serverFilteredIds.has(r.listing.id));
    }

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
          unavailable: unavailableProperties.length,
          fallbackUsed: calendarDataSeemsBroken
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