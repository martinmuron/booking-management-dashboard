import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';

export async function POST(request: NextRequest) {
  try {
    const { offset = 0, limit = 50 } = await request.json();
    
    console.log(`🔄 Starting chunked bulk update: offset=${offset}, limit=${limit}`);
    
    // Get a chunk of existing bookings
    const existingBookings = await prisma.booking.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Processing ${existingBookings.length} bookings in this chunk`);

    if (existingBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No more bookings to process',
        processed: 0,
        successful: 0,
        failed: 0,
        hasMore: false,
        nextOffset: offset
      });
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{bookingId: string, error: string}> = [];

    // Process bookings one by one to avoid overwhelming the API
    for (let i = 0; i < existingBookings.length; i++) {
      const booking = existingBookings[i];
      
      try {
        const hostAwayId = parseInt(booking.hostAwayId);
        if (isNaN(hostAwayId)) {
          throw new Error(`Invalid HostAway ID: ${booking.hostAwayId}`);
        }

        // Get the base URL from environment or use current deployment URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://booking-management-dashboard-9p751gc3u-future-developments.vercel.app';
        const checkInLink = `${baseUrl}/checkin/${booking.checkInToken}`;
        
        console.log(`🔗 [${i+1}/${existingBookings.length}] Updating booking ${booking.id} (HostAway ${hostAwayId})`);
        
        const result = await hostAwayService.updateReservationCustomField(
          hostAwayId,
          'reservation_check_in_link_nick_jenny',
          checkInLink
        );

        if (result.success) {
          successCount++;
          console.log(`✅ Successfully updated booking ${booking.id}`);
        } else {
          failureCount++;
          failures.push({
            bookingId: booking.id,
            error: result.error || 'Unknown error'
          });
          console.error(`❌ Failed to update booking ${booking.id}: ${result.error}`);
        }
      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failures.push({
          bookingId: booking.id,
          error: errorMessage
        });
        console.error(`❌ Error updating booking ${booking.id}:`, error);
      }

      // Small delay between requests to avoid rate limiting
      if (i < existingBookings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
      }
    }

    // Check if there are more bookings to process
    const totalCount = await prisma.booking.count();
    const nextOffset = offset + limit;
    const hasMore = nextOffset < totalCount;

    const summary = {
      success: true,
      message: `Processed chunk: ${successCount} successful, ${failureCount} failed out of ${existingBookings.length}`,
      processed: existingBookings.length,
      successful: successCount,
      failed: failureCount,
      failures: failures.slice(0, 5), // Only return first 5 failures
      hasMore,
      nextOffset,
      totalCount,
      progress: Math.round(((offset + existingBookings.length) / totalCount) * 100)
    };

    console.log('✅ Chunk completed:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Chunked bulk update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Chunked bulk update failed'
      },
      { status: 500 }
    );
  }
}