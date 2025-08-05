import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

export async function POST(request: NextRequest) {
  console.log('🚀 Booking sync API endpoint called');
  
  try {
    // Perform smart booking sync
    const syncResult = await bookingService.syncBookingsFromHostAway();
    
    console.log('📊 Sync result:', syncResult);
    
    return NextResponse.json({
      success: syncResult.success,
      data: {
        newBookings: syncResult.newBookings,
        updatedBookings: syncResult.updatedBookings,
        totalBookings: syncResult.totalBookings,
        isInitialSync: syncResult.isInitialSync,
        message: syncResult.message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Booking sync API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Booking sync failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  console.log('📋 Get bookings API endpoint called');
  
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    
    // Fetch bookings from database
    const bookings = await bookingService.getBookings({
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined
    });
    
    console.log(`📊 Retrieved ${bookings.length} bookings from database`);
    
    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get bookings API error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}