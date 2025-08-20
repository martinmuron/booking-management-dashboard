import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { hostAwayService } from '@/services/hostaway.service';

export async function POST() {
  try {
    console.log('🔄 Starting bulk update of HostAway check-in links for existing reservations...');
    
    // Get all existing bookings that have check-in tokens but might not have updated HostAway
    const existingBookings = await prisma.booking.findMany({
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${existingBookings.length} existing bookings to update`);

    if (existingBookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No existing bookings found to update',
        updated: 0,
        failed: 0,
        total: 0
      });
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{bookingId: string, error: string}> = [];

    // Process bookings in batches to avoid overwhelming HostAway API
    const batchSize = 5; // Process 5 at a time to respect rate limits
    const batches = [];
    for (let i = 0; i < existingBookings.length; i += batchSize) {
      batches.push(existingBookings.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches of ${batchSize} bookings each`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`🔄 Processing batch ${batchIndex + 1}/${batches.length}...`);

      // Process batch in parallel
      const batchPromises = batch.map(async (booking) => {
        try {
          const hostAwayId = parseInt(booking.hostAwayId);
          if (isNaN(hostAwayId)) {
            throw new Error(`Invalid HostAway ID: ${booking.hostAwayId}`);
          }

          // Get the base URL from environment or use current deployment URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'https://booking-management-dashboard-8ab3pcwoc-future-developments.vercel.app';
          const checkInLink = `${baseUrl}/checkin/${booking.checkInToken}`;
          
          console.log(`🔗 Updating booking ${booking.id} (HostAway ${hostAwayId}) with check-in link`);
          
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
      });

      await Promise.all(batchPromises);

      // Add delay between batches to respect rate limits
      if (batchIndex < batches.length - 1) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    const summary = {
      success: true,
      message: `Bulk update completed: ${successCount} successful, ${failureCount} failed out of ${existingBookings.length} total`,
      updated: successCount,
      failed: failureCount,
      total: existingBookings.length,
      failures: failures.slice(0, 10) // Only return first 10 failures to avoid large response
    };

    console.log('✅ Bulk update completed:', summary);

    return NextResponse.json(summary);

  } catch (error) {
    console.error('❌ Bulk update failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Bulk update failed'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check how many bookings would be updated
export async function GET() {
  try {
    const count = await prisma.booking.count();

    return NextResponse.json({
      success: true,
      message: `Found ${count} existing bookings that can be updated with HostAway check-in links`,
      count: count
    });

  } catch (error) {
    console.error('❌ Failed to count bookings:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}