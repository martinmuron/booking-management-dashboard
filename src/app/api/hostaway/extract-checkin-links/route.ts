import { NextRequest, NextResponse } from 'next/server';
import { hostAwayService, type HostAwayReservation, type HostAwayCustomField } from '@/services/hostaway.service';

interface CheckInLinkData {
  reservationId: number;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  propertyName: string;
  checkInLink: string;
  checkInStatus?: string;
  customFieldId: number;
  fieldType: 'existing_checkin_url' | 'checkin_reservation_url' | 'nick_jenny_field';
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Extracting check-in links from existing HostAway reservations...');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Fetch reservations with custom fields included
    const result = await hostAwayService.getReservations({
      limit,
      offset,
      // includeResources: '1' is already included in getReservations
    });

    const reservations: HostAwayReservation[] = Array.isArray(result) ? result : result.data || [];
    const checkInLinks: CheckInLinkData[] = [];
    
    console.log(`📋 Processing ${reservations.length} reservations for check-in links...`);
    
    for (const reservation of reservations) {
      // Check if reservation has custom field values
      const customFields: HostAwayCustomField[] | undefined = reservation.customFieldValues;

      if (customFields && Array.isArray(customFields)) {
        // Look for existing check-in fields by specific field IDs
        const checkInField = customFields.find((field: HostAwayCustomField) => 
          field.customFieldId && field.value && [
            60175, // reservation_checkin_online_url
            60177, // reservation_checkin_reservation_url  
            81717  // reservation_check_in_link_nick_jenny (new Nick Jenny field)
          ].includes(field.customFieldId)
        );
        
        // Look for check-in status field
        const statusField = customFields.find((field: HostAwayCustomField) => 
          field.customFieldId === 60179 // reservation_checkin_online_status
        );
        
        if (checkInField && checkInField.value) {
          const customFieldId = checkInField.customFieldId;
          if (!customFieldId) {
            continue;
          }
          // Determine field type
          let fieldType: 'existing_checkin_url' | 'checkin_reservation_url' | 'nick_jenny_field';
          if (customFieldId === 60175) fieldType = 'existing_checkin_url';
          else if (customFieldId === 60177) fieldType = 'checkin_reservation_url';
          else fieldType = 'nick_jenny_field';
          
          checkInLinks.push({
            reservationId: reservation.id,
            guestName: reservation.guestName,
            checkInDate: reservation.arrivalDate,
            checkOutDate: reservation.departureDate,
            propertyName: reservation.listingName,
            checkInLink: checkInField.value,
            checkInStatus: statusField?.value || undefined,
            customFieldId,
            fieldType
          });
          
          console.log(`✅ Found check-in link for reservation ${reservation.id}: ${checkInField.value} (status: ${statusField?.value || 'unknown'})`);
        }
      }
    }
    
    const totalCount = Array.isArray(result) ? reservations.length : result.totalCount;
    
    console.log(`📊 Extraction complete: Found ${checkInLinks.length} reservations with check-in links out of ${reservations.length} processed`);
    
    return NextResponse.json({
      success: true,
      message: `Found ${checkInLinks.length} reservations with existing check-in links`,
      data: checkInLinks,
      pagination: {
        total: totalCount,
        processed: reservations.length,
        limit,
        offset,
        hasMore: Array.isArray(result) ? false : (offset + limit) < totalCount
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to extract check-in links:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to extract check-in links from HostAway reservations'
    }, { status: 500 });
  }
}
