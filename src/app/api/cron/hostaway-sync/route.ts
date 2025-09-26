import { NextRequest, NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'development-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const syncResult = await bookingService.syncBookingsFromHostAway();

    return NextResponse.json({
      success: syncResult.success,
      message: syncResult.message,
      newBookings: syncResult.newBookings,
      updatedBookings: syncResult.updatedBookings,
      totalBookings: syncResult.totalBookings,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('HostAway sync cron failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
