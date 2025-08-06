import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';

interface GuestSubmission {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
}

// GET /api/check-in - Get booking details for check-in
export async function GET(request: NextRequest) {
  let token: string | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Check-in token is required' },
        { status: 400 }
      );
    }
    
    let booking;
    try {
      // Try to fetch with guests first
      booking = await prisma.booking.findUnique({
        where: { checkInToken: token },
        include: {
          guests: true,
          payments: true
        }
      });
    } catch (guestError) {
      console.log('Failed to fetch guests, trying without:', guestError);
      // If guests table has issues, fetch booking without guests
      try {
        booking = await prisma.booking.findUnique({
          where: { checkInToken: token },
          include: {
            payments: true
          }
        });
        // Add empty guests array to maintain expected structure
        if (booking) {
          Object.assign(booking, { guests: [] });
        }
      } catch (bookingError) {
        console.log('Failed to fetch booking at all, trying minimal:', bookingError);
        // Last resort: try to get just the booking without any includes
        booking = await prisma.booking.findUnique({
          where: { checkInToken: token }
        });
        if (booking) {
          Object.assign(booking, { guests: [], payments: [] });
        }
      }
    }
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in token' },
        { status: 404 }
      );
    }
    
    // Try to enrich booking with property address from HostAway
    let enrichedBooking = booking;
    try {
      if (booking.hostAwayId) {
        // Get all listings to find the address
        const listings = await hostAwayService.getListings();
        const matchingListing = listings.find(l => l.id.toString() === booking.hostAwayId);
        if (matchingListing?.address) {
          // Add property address to booking response
          enrichedBooking = Object.assign({}, booking, { 
            propertyAddress: matchingListing.address 
          });
        }
      }
    } catch (addressError) {
      console.log('Could not fetch property address, continuing without:', addressError);
      // Continue without address - this is not critical
    }
    
    return NextResponse.json({
      success: true,
      data: { booking: enrichedBooking },
      message: 'Booking details fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching check-in details:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      token: token || 'undefined',
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: `Failed to fetch check-in details: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// POST /api/check-in - Complete check-in process
export async function POST(request: NextRequest) {
  let token: string | undefined;
  let guests: GuestSubmission[] | undefined;
  
  try {
    const body = await request.json();
    ({ token, guests } = body);
    const { paymentIntentId } = body;
    
    if (!token || !guests) {
      return NextResponse.json(
        { success: false, error: 'Token and guests are required' },
        { status: 400 }
      );
    }
    
    // Validate token and get booking
    const booking = await prisma.booking.findUnique({
      where: { checkInToken: token }
    });
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Invalid check-in token' },
        { status: 404 }
      );
    }
    
    // Save guest information
    await prisma.guest.deleteMany({
      where: { bookingId: booking.id }
    });
    
    const guestData = guests.map((guest: GuestSubmission, index: number) => ({
      bookingId: booking.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : null,
      nationality: guest.nationality,
      isLeadGuest: index === 0
    }));
    
    await prisma.guest.createMany({
      data: guestData
    });
    
    // Update booking status
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'CHECKED_IN',
        updatedAt: new Date()
      }
    });
    
    // Save payment if provided
    if (paymentIntentId) {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: 0, // Will be updated by Stripe webhook
          currency: 'eur',
          status: 'paid',
          stripePaymentIntentId: paymentIntentId
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        bookingId: booking.id,
        status: 'CHECKED_IN'
      },
      message: 'Check-in completed successfully'
    });
  } catch (error) {
    console.error('Error completing check-in:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      token: token || 'undefined',
      guestsCount: guests?.length,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { success: false, error: `Failed to complete check-in: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}