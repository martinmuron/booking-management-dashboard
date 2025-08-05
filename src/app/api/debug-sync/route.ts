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
      sampleReservations: reservations.slice(0, 3).map(r => ({
        id: r.id,
        checkInDate: r.checkInDate,
        checkOutDate: r.checkOutDate,
        guestName: `${r.guestFirstName} ${r.guestLastName}`,
        status: r.status
      })),
      reservationDateRange: reservations.length > 0 ? {
        earliest: Math.min(...reservations.map(r => new Date(r.checkInDate).getTime())),
        latest: Math.max(...reservations.map(r => new Date(r.checkInDate).getTime()))
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