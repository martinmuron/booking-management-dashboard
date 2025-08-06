import { NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

// GET /api/bookings - Fetch all bookings from database
export async function GET() {
  try {
    console.log('📋 [DEBUG] Fetching bookings from database...');
    console.log('📋 [DEBUG] DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('📋 [DEBUG] DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');
    
    // Test database connection first
    const { prisma } = await import('@/lib/database');
    
    console.log('📋 [DEBUG] Testing basic database connection...');
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('📋 [DEBUG] Database connection test result:', dbTest);
    
    console.log('📋 [DEBUG] Counting total bookings...');
    const totalCount = await prisma.booking.count();
    console.log('📋 [DEBUG] Total bookings in database:', totalCount);
    
    console.log('📋 [DEBUG] Getting first booking to test...');
    const firstBooking = await prisma.booking.findFirst();
    console.log('📋 [DEBUG] First booking exists:', !!firstBooking);
    if (firstBooking) {
      console.log('📋 [DEBUG] First booking sample:', {
        id: firstBooking.id,
        hostAwayId: firstBooking.hostAwayId,
        propertyName: firstBooking.propertyName,
        guestName: firstBooking.guestLeaderName
      });
    }
    
    console.log('📋 [DEBUG] Calling bookingService.getBookings...');
    // Fetch ALL bookings from our database (no limit)
    const bookings = await bookingService.getBookings();
    
    console.log(`📋 [DEBUG] bookingService.getBookings returned ${bookings.length} bookings`);
    console.log('📋 [DEBUG] Sample of returned bookings:', bookings.slice(0, 2).map(b => ({
      id: b.id,
      hostAwayId: b.hostAwayId,
      propertyName: b.propertyName,
      guestName: b.guestLeaderName
    })));
    
    return NextResponse.json({
      success: true,
      data: bookings,
      count: bookings.length,
      debug: {
        totalInDatabase: totalCount,
        hasFirstBooking: !!firstBooking,
        serviceReturned: bookings.length
      },
      message: 'Bookings fetched successfully'
    });
  } catch (error) {
    console.error('❌ [DEBUG] Error fetching bookings:', error);
    console.error('❌ [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
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