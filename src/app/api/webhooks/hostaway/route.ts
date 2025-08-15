import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';
import { bookingService } from '@/services/booking.service';

// Import the HostAwayReservation type from the service
interface HostAwayReservation {
  id: number;
  listingMapId: number;
  listingName: string;
  channelId: number;
  channelName: string;
  reservationId: string;
  guestName: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string | null;
  phone: string | null;
  numberOfGuests: number;
  adults: number;
  children?: number;
  infants?: number;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  totalPrice: number;
  currency: string;
  status: string;
  confirmationCode: string;
  guestAddress?: string;
  guestCity?: string;
  guestCountry?: string;
  guestZipCode?: string;
  doorCode?: string;
  checkInTime?: number;
  checkOutTime?: number;
}

import { addWebhookLog } from '@/lib/webhook-logs';

// Helper function to log webhook activity
async function logWebhookActivity(data: {
  eventType: string;
  status: 'success' | 'error';
  message: string;
  reservationId?: string;
  error?: string;
}) {
  await addWebhookLog(data);
}

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
    
    // Log webhook received
    await logWebhookActivity({
      eventType,
      status: 'success',
      message: `Webhook received: ${eventType}`,
      reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
    });
    
    // Handle different webhook events
    switch (eventType) {
      case 'reservation created':
      case 'reservation_created':
        await handleReservationCreated(reservationData);
        await logWebhookActivity({
          eventType,
          status: 'success',
          message: `Successfully processed new reservation`,
          reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
        });
        break;
        
      case 'reservation updated':
      case 'reservation_updated':
        await handleReservationUpdated(reservationData);
        await logWebhookActivity({
          eventType,
          status: 'success',
          message: `Successfully processed reservation update`,
          reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
        });
        break;
        
      case 'new message received':
      case 'message_received':
        console.log('📨 New message received - logging only');
        await logWebhookActivity({
          eventType,
          status: 'success',
          message: `Message received (not processed)`,
          reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
        });
        // Future: Handle guest messages
        break;
        
      default:
        console.log(`⚠️  Unknown event type: ${eventType} - logging and continuing`);
        await logWebhookActivity({
          eventType,
          status: 'success',
          message: `Unknown event type received: ${eventType}`,
          reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
        });
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
    
    // Log the error
    await logWebhookActivity({
      eventType: 'error',
      status: 'error',
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
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
    const reservationId = Number(reservationData.id || reservationData.reservationId);
    
    if (!reservationId || isNaN(reservationId)) {
      console.log('⚠️  No valid reservation ID found in payload');
      return;
    }
    
    console.log(`🔍 Fetching full reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    // Sync this specific reservation to our database using the main booking service
    await syncSingleReservation(fullReservation, 'created');
    
  } catch (error) {
    console.error('❌ Error handling reservation created:', error);
  }
}

async function handleReservationUpdated(reservationData: Record<string, unknown>) {
  console.log('✏️  Processing reservation updated');
  
  try {
    // Extract reservation ID
    const reservationId = Number(reservationData.id || reservationData.reservationId);
    
    if (!reservationId || isNaN(reservationId)) {
      console.log('⚠️  No valid reservation ID found in payload');
      return;
    }
    
    console.log(`🔍 Fetching updated reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    // Sync this specific reservation to our database using the main booking service
    await syncSingleReservation(fullReservation, 'updated');
    
  } catch (error) {
    console.error('❌ Error handling reservation updated:', error);
  }
}

async function syncSingleReservation(reservation: HostAwayReservation, action: 'created' | 'updated') {
  try {
    console.log(`🔄 [WEBHOOK] Syncing single reservation ${reservation.id} via booking service (${action})`);
    
    // Use the main booking service to sync this single reservation
    // This ensures consistency with manual sync operations
    const syncResult = await bookingService.syncSpecificReservation(reservation);
    
    if (syncResult.success) {
      console.log(`✅ [WEBHOOK] Successfully synced reservation ${reservation.id}: ${syncResult.message}`);
    } else {
      console.error(`❌ [WEBHOOK] Failed to sync reservation ${reservation.id}: ${syncResult.message}`);
    }
    
    return syncResult;
    
  } catch (error) {
    console.error(`❌ [WEBHOOK] Error syncing reservation ${reservation.id}:`, error);
    throw error;
  }
}