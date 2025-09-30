import { NextResponse } from 'next/server';
import { bookingService } from '@/services/booking.service';

async function handler() {
  try {
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

export const GET = handler;
export const POST = handler;
