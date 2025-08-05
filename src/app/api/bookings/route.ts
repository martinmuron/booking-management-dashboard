import { NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

// GET /api/bookings - Fetch all bookings from database
export async function GET() {
  try {
    console.log('📋 Fetching bookings from database...');
    
    // Fetch bookings from our database
    const bookings = await bookingService.getBookings({
      limit: 100 // Get first 100 bookings
    });
    
    console.log(`📊 Retrieved ${bookings.length} bookings from database`);
    
    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length,
      message: 'Bookings fetched successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Trigger booking sync from HostAway
export async function POST() {
  try {
    console.log('🔄 Manual booking sync triggered');
    
    // Trigger booking sync from HostAway
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
      message: 'Bookings synchronized successfully'
    });
  } catch (error) {
    console.error('❌ Error synchronizing bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to synchronize bookings' },
      { status: 500 }
    );
  }
}