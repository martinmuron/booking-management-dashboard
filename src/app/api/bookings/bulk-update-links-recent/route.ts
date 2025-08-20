import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';

export async function POST(request: NextRequest) {
  try {
    const { offset = 0, limit = 50 } = await request.json();
    
    console.log(`🔄 Starting recent bulk update: offset=${offset}, limit=${limit}`);
    
    // First, get the IDs of the 1000 most recent bookings
    const recentBookingIds = await prisma.booking.findMany({
      take: 1000,
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });
    
    console.log(`📋 Found ${recentBookingIds.length} recent booking IDs`);
    
    if (recentBookingIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No bookings found',
        processed: 0,
        successful: 0,
        failed: 0,
        hasMore: false,
        nextOffset: offset,
        totalCount: 0,
        progress: 100
      });
    }
    
    // Now get a chunk of those recent bookings for processing
    const recentBookings = await prisma.booking.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc' // Most recent first
      },
      where: {
        id: {
          in: recentBookingIds.map(b => b.id)
        }
      }
    });

    console.log(`📊 Processing ${recentBookings.length} recent bookings in this chunk`);

    if (recentBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No more recent bookings to process',
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
    for (let i = 0; i < recentBookings.length; i++) {
      const booking = recentBookings[i];
      
      try {
        const hostAwayId = parseInt(booking.hostAwayId);
        if (isNaN(hostAwayId)) {
          throw new Error(`Invalid HostAway ID: ${booking.hostAwayId}`);
        }

        // Get the base URL from environment or use current deployment URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://booking-management-dashboard-2u9agl2o7-future-developments.vercel.app';
        const checkInLink = `${baseUrl}/checkin/${booking.checkInToken}`;
        
        console.log(`🔗 [${i+1}/${recentBookings.length}] Updating recent booking ${booking.id} (HostAway ${hostAwayId})`);
        
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
      if (i < recentBookings.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
      }
    }

    // Check if there are more recent bookings to process (within the 1000 limit)
    const recentBookingsTotal = recentBookingIds.length;
    const nextOffset = offset + limit;
    const hasMore = nextOffset < recentBookingsTotal;

    const summary = {
      success: true,
      message: `Processed recent chunk: ${successCount} successful, ${failureCount} failed out of ${recentBookings.length}`,
      processed: recentBookings.length,
      successful: successCount,
      failed: failureCount,
      failures: failures.slice(0, 5), // Only return first 5 failures
      hasMore,
      nextOffset,
      totalCount: recentBookingsTotal,
      progress: Math.round(((offset + recentBookings.length) / recentBookingsTotal) * 100)
    };

    console.log('✅ Recent chunk completed:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Recent bulk update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Recent bulk update failed'
      },
      { status: 500 }
    );
  }
}