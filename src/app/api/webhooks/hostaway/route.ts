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
    
    // Extract event information - HostAway sends different structures
    const eventType = payload.event || payload.type || payload.eventType || 'unknown';
    const reservationData = payload.reservation || payload.data || payload.result || payload;
    
    console.log(`🎯 Event type: ${eventType}`);
    console.log(`📋 Payload structure:`, {
      hasEvent: !!payload.event,
      hasType: !!payload.type,
      hasEventType: !!payload.eventType,
      hasReservation: !!payload.reservation,
      hasData: !!payload.data,
      hasResult: !!payload.result,
      topLevelKeys: Object.keys(payload)
    });
    
    // Log webhook received
    await logWebhookActivity({
      eventType,
      status: 'success',
      message: `Webhook received: ${eventType}`,
      reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
    });
    
    // Handle different webhook events - check multiple formats HostAway might use
    const normalizedEventType = eventType.toLowerCase().trim();
    console.log(`🔍 Normalized event type: "${normalizedEventType}"`);
    
    switch (normalizedEventType) {
      case 'reservation created':
      case 'reservation_created':
      case 'reservation.created':  // HostAway uses dot notation!
      case 'reservationcreated':
      case 'create':
      case 'created':
        console.log('📌 Matched: reservation created event');
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
      case 'reservation.updated':  // HostAway uses dot notation!
      case 'reservationupdated':
      case 'update':
      case 'updated':
      case 'modified':
        console.log('📌 Matched: reservation updated event');
        await handleReservationUpdated(reservationData);
        await logWebhookActivity({
          eventType,
          status: 'success',
          message: `Successfully processed reservation update`,
          reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
        });
        break;
        
        
      default:
        // Check if this is a message event that we want to ignore
        if (normalizedEventType.includes('message')) {
          console.log(`📨 Ignoring message event: "${eventType}"`);
          await logWebhookActivity({
            eventType,
            status: 'success',
            message: `Message event ignored: ${eventType}`,
            reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
          });
          break;
        }
        
        console.log(`⚠️  Unknown event type: "${eventType}" (normalized: "${normalizedEventType}")`);
        console.log('🔍 Attempting to process as reservation update anyway...');
        
        // Try to process it as a reservation update if it has an ID
        if (reservationData?.id || reservationData?.reservationId) {
          console.log('🔄 Found reservation ID, processing as update');
          await handleReservationUpdated(reservationData);
          await logWebhookActivity({
            eventType,
            status: 'success',
            message: `Processed unknown event type "${eventType}" as reservation update`,
            reservationId: reservationData?.id?.toString() || reservationData?.reservationId?.toString()
          });
        } else {
          await logWebhookActivity({
            eventType,
            status: 'success',
            message: `Unknown event type received: ${eventType} - no reservation ID found`,
            reservationId: undefined
          });
        }
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
  console.log('📦 Webhook payload data:', JSON.stringify(reservationData, null, 2));
  
  try {
    // Extract reservation ID
    const reservationId = Number(reservationData.id || reservationData.reservationId);
    
    if (!reservationId || isNaN(reservationId)) {
      console.log('⚠️  No valid reservation ID found in payload');
      console.log('🔍 Available keys in payload:', Object.keys(reservationData));
      return;
    }
    
    console.log(`🔍 Fetching full reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    console.log(`✅ Successfully fetched reservation ${reservationId} from HostAway:`, {
      id: fullReservation.id,
      guestName: fullReservation.guestName,
      arrivalDate: fullReservation.arrivalDate,
      departureDate: fullReservation.departureDate,
      listingName: fullReservation.listingName
    });
    
    // Sync this specific reservation to our database using the main booking service
    const result = await syncSingleReservation(fullReservation, 'created');
    console.log(`📊 Sync result for reservation ${reservationId}:`, result);
    
  } catch (error) {
    console.error('❌ Error handling reservation created:', error);
  }
}

async function handleReservationUpdated(reservationData: Record<string, unknown>) {
  console.log('✏️  Processing reservation updated');
  console.log('📦 Webhook payload data:', JSON.stringify(reservationData, null, 2));
  
  try {
    // Extract reservation ID
    const reservationId = Number(reservationData.id || reservationData.reservationId);
    
    if (!reservationId || isNaN(reservationId)) {
      console.log('⚠️  No valid reservation ID found in payload');
      console.log('🔍 Available keys in payload:', Object.keys(reservationData));
      return;
    }
    
    console.log(`🔍 Fetching updated reservation details for ID: ${reservationId}`);
    
    // Fetch complete reservation details from HostAway API
    const fullReservation = await hostAwayService.getReservationById(reservationId);
    
    if (!fullReservation) {
      console.log(`❌ Could not fetch reservation ${reservationId} from HostAway API`);
      return;
    }
    
    console.log(`✅ Successfully fetched reservation ${reservationId} from HostAway:`, {
      id: fullReservation.id,
      guestName: fullReservation.guestName,
      arrivalDate: fullReservation.arrivalDate,
      departureDate: fullReservation.departureDate,
      listingName: fullReservation.listingName
    });
    
    // Sync this specific reservation to our database using the main booking service
    const result = await syncSingleReservation(fullReservation, 'updated');
    console.log(`📊 Sync result for reservation ${reservationId}:`, result);
    
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