import { NextResponse } from 'next/server';
import { hostAwayService } from '@/services/hostaway.service';

export async function GET() {
  try {
    console.log('🔍 Debug sync endpoint called');

    // Calculate 30 days back date (same as sync logic)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);
    const dateFrom = pastDate.toISOString().split('T')[0];
    
    console.log('📅 Date filter:', dateFrom, 'to future');

    // Same params as sync
    const fetchParams = {
      checkInDateFrom: dateFrom,
      limit: 200
    };

    console.log('🔍 Fetching with params:', fetchParams);

    // Get reservations
    const reservations = await hostAwayService.getReservations(fetchParams);
    
    console.log('📊 Raw reservations count:', reservations.length);

    // Return detailed debug info
    return NextResponse.json({
      success: true,
      dateFrom,
      fetchParams,
      totalReservations: reservations.length,
      sampleReservations: reservations.slice(0, 5).map(r => ({
        id: r.id,
        arrivalDate: r.arrivalDate,
        departureDate: r.departureDate,
        guestName: `${r.guestFirstName} ${r.guestLastName}`,
        guestEmail: r.guestEmail,
        phone: r.phone,
        status: r.status,
        listingMapId: r.listingMapId,
        listingName: r.listingName,
        numberOfGuests: r.numberOfGuests,
        rawReservation: r // Show full object to see all fields
      })),
      reservationDateRange: reservations.length > 0 ? {
        earliest: (() => {
          try {
            const validDates = reservations
              .map(r => r.arrivalDate)
              .filter(date => date && date !== null && date !== '')
              .map(date => new Date(date))
              .filter(date => !isNaN(date.getTime()));
            return validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))).toISOString() : 'Invalid dates found';
          } catch (e) {
            return 'Date parsing error';
          }
        })(),
        latest: (() => {
          try {
            const validDates = reservations
              .map(r => r.arrivalDate)
              .filter(date => date && date !== null && date !== '')
              .map(date => new Date(date))
              .filter(date => !isNaN(date.getTime()));
            return validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))).toISOString() : 'Invalid dates found';
          } catch (e) {
            return 'Date parsing error';
          }
        })()
      } : null
    });

  } catch (error) {
    console.error('❌ Debug sync error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}