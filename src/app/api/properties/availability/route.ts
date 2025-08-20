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

    // Get all listings first
    const listings = await hostAwayService.getListings();
    
    // Filter by guest capacity if specified
    let filteredListings = listings;
    if (guests) {
      const guestCount = parseInt(guests);
      if (!isNaN(guestCount)) {
        filteredListings = listings.filter(listing => 
          (listing.personCapacity || 0) >= guestCount
        );
      }
    }

    // Check availability for each listing
    const availabilityPromises = filteredListings.map(async (listing) => {
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
        availability: {
          available: availability.available,
          unavailableDates: availability.unavailableDates,
          minimumStay: availability.minimumStay,
          averagePrice: availability.averagePrice
        }
      };
    });

    const results = await Promise.all(availabilityPromises);
    
    // Separate available and unavailable properties
    const availableProperties = results.filter(result => result.availability.available);
    const unavailableProperties = results.filter(result => !result.availability.available);

    return NextResponse.json({
      success: true,
      data: {
        searchCriteria: {
          checkInDate,
          checkOutDate,
          guests: guests ? parseInt(guests) : undefined
        },
        summary: {
          total: results.length,
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