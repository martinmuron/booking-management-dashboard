import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

export async function POST(request: NextRequest) {
  console.log('🔍 Check for new bookings API called');
  
  try {
    // Get timestamp from request body for incremental sync
    const { lastCheck } = await request.json().catch(() => ({ lastCheck: null }));
    
    // Sync only recent bookings (last 24 hours if no lastCheck provided)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const checkFromDate = lastCheck ? new Date(lastCheck) : yesterday;
    const dateFrom = checkFromDate.toISOString().split('T')[0];
    
    console.log(`🔍 Checking for bookings updated since: ${dateFrom}`);
    
    // Perform incremental sync
    const syncResult = await bookingService.syncBookingsFromHostAway({
      dateFrom,
      forceFullSync: false // Only sync new/changed bookings
    });
    
    console.log('📊 New booking check result:', syncResult);
    
    return NextResponse.json({
      success: syncResult.success,
      hasNewBookings: syncResult.newBookings > 0 || syncResult.updatedBookings > 0,
      data: {
        newBookings: syncResult.newBookings,
        updatedBookings: syncResult.updatedBookings,
        totalBookings: syncResult.totalBookings,
        message: syncResult.message
      },
      checkTime: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ New booking check API error:', error);
    
    return NextResponse.json({
      success: false,
      hasNewBookings: false,
      error: 'Failed to check for new bookings',
      message: error instanceof Error ? error.message : 'Unknown error',
      checkTime: new Date().toISOString()
    }, { status: 500 });
  }
}