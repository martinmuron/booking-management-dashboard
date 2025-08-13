import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function POST(request: NextRequest) {
  console.log('🔔 HostAway webhook received');
  
  try {
    // Parse the webhook payload
    const payload = await request.json();
    console.log('📋 Webhook payload:', JSON.stringify(payload, null, 2));
    
    // Extract event information
    const eventType = payload.event || payload.type || 'unknown';
    const reservationData = payload.reservation || payload.data || payload;
    
    console.log(`🎯 Event type: ${eventType}`);
    
    // Handle different webhook events
    switch (eventType) {
      case 'reservation created':
      case 'reservation_created':
        await handleReservationCreated(reservationData);
        break;
        
      case 'reservation updated':
      case 'reservation_updated':
        await handleReservationUpdated(reservationData);
        break;
        
      case 'new message received':
      case 'message_received':
        console.log('📨 New message received - logging only');
        // Future: Handle guest messages
        break;
        
      default:
        console.log(`⚠️  Unknown event type: ${eventType} - logging and continuing`);
        // Return 200 for unknown events as per HostAway documentation
        break;
    }
    
    // Always return 200 for successful webhook processing
    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
      eventType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Return 200 even on errors to prevent HostAway retries for data issues
    // Log the error but don't fail the webhook delivery
    return NextResponse.json({
      success: true, // Return success to prevent retries
      message: 'Webhook received but processing encountered an issue',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}

async function handleReservationCreated(reservationData: Record<string, unknown>) {
  console.log('➕ Processing new reservation created');
  
  try {
    // Extract reservation ID
    const reservationId = reservationData.id || reservationData.reservationId;
    
    if (!reservationId) {
      console.log('⚠️  No reservation ID found in payload');
      return;
    }
    
    console.log(`🔍 Fetching full reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    // Sync this specific reservation to our database
    await syncReservationToDatabase(fullReservation, 'created');
    
  } catch (error) {
    console.error('❌ Error handling reservation created:', error);
  }
}

async function handleReservationUpdated(reservationData: Record<string, unknown>) {
  console.log('✏️  Processing reservation updated');
  
  try {
    // Extract reservation ID
    const reservationId = reservationData.id || reservationData.reservationId;
    
    if (!reservationId) {
      console.log('⚠️  No reservation ID found in payload');
      return;
    }
    
    console.log(`🔍 Fetching updated reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    // Sync this specific reservation to our database
    await syncReservationToDatabase(fullReservation, 'updated');
    
  } catch (error) {
    console.error('❌ Error handling reservation updated:', error);
  }
}

async function syncReservationToDatabase(reservation: Record<string, unknown>, action: 'created' | 'updated') {
  try {
    const { prisma } = await import('@/lib/database');
    
    // Validate required fields
    if (!reservation.arrivalDate || !reservation.departureDate) {
      console.log(`⚠️  Skipping reservation ${reservation.id}: Missing dates`);
      return;
    }
    
    const checkInDate = new Date(reservation.arrivalDate);
    const checkOutDate = new Date(reservation.departureDate);
    
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      console.log(`⚠️  Skipping reservation ${reservation.id}: Invalid dates`);
      return;
    }
    
    // Get listings for property name lookup
    const listings = await hostAwayService.getListings();
    const listing = listings.find(l => l.id === reservation.listingMapId);
    
    const bookingData = {
      hostAwayId: reservation.id.toString(),
      propertyName: reservation.listingName || listing?.name || `Property ${reservation.listingMapId}`,
      guestLeaderName: `${reservation.guestFirstName} ${reservation.guestLastName}`.trim(),
      guestLeaderEmail: reservation.guestEmail || 'noemail@example.com',
      guestLeaderPhone: reservation.phone || null,
      checkInDate,
      checkOutDate,
      numberOfGuests: reservation.numberOfGuests || reservation.adults || 1,
      roomNumber: listing?.address || null,
      // Don't overwrite our platform status if it exists
      status: 'PENDING' as const
    };
    
    // Check if booking already exists
    const existingBooking = await prisma.booking.findUnique({
      where: { hostAwayId: reservation.id.toString() }
    });
    
    if (existingBooking) {
      console.log(`📝 Updating existing booking: ${existingBooking.id}`);
      
      // Update existing booking (preserve our platform status and token)
      await prisma.booking.update({
        where: { id: existingBooking.id },
        data: {
          propertyName: bookingData.propertyName,
          guestLeaderName: bookingData.guestLeaderName,
          guestLeaderEmail: bookingData.guestLeaderEmail,
          guestLeaderPhone: bookingData.guestLeaderPhone,
          checkInDate: bookingData.checkInDate,
          checkOutDate: bookingData.checkOutDate,
          numberOfGuests: bookingData.numberOfGuests,
          roomNumber: bookingData.roomNumber,
          updatedAt: new Date()
          // Keep existing status and checkInToken
        }
      });
      
      console.log(`✅ Updated booking ${existingBooking.id} from webhook (${action})`);
      
    } else {
      console.log(`➕ Creating new booking from webhook`);
      
      // Generate check-in token for new booking
      const checkInToken = Math.random().toString(36).substring(2, 12).toUpperCase();
      
      // Create new booking
      const newBooking = await prisma.booking.create({
        data: {
          id: `BK_${reservation.id}`,
          ...bookingData,
          checkInToken
        }
      });
      
      console.log(`✅ Created new booking ${newBooking.id} from webhook (${action})`);
    }
    
  } catch (error) {
    console.error('❌ Error syncing reservation to database:', error);
    throw error;
  }
}