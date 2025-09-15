import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { VirtualKeyService } from '@/services/virtual-key.service';
import { nukiApiService } from '@/services/nuki-api.service';

// POST /api/cron/checkout-completion - Automatically mark bookings as COMPLETED after checkout date
export async function POST(request: NextRequest) {
  try {
    console.log('🕐 Running checkout completion cron job...');

    // Verify this is a cron job (Vercel sends a special header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'development-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Checking for bookings with checkout date before: ${today.toISOString()}`);

    // Find bookings that should be completed:
    // - Status is CHECKED_IN (guests have checked in)
    // - Checkout date has passed (before today)
    const bookingsToComplete = await prisma.booking.findMany({
      where: {
        status: 'CHECKED_IN',
        checkOutDate: {
          lt: today  // checkout date is before today
        }
      },
      include: {
        virtualKeys: true  // Include virtual keys for deactivation
      }
    });

    console.log(`🔍 Found ${bookingsToComplete.length} bookings ready for completion`);

    let completedCount = 0;
    let keysDeactivatedCount = 0;
    const errors: string[] = [];

    for (const booking of bookingsToComplete) {
      try {
        console.log(`✅ Completing booking ${booking.id} - Guest: ${booking.guestLeaderName} - Checkout: ${booking.checkOutDate.toDateString()}`);

        // Update booking status to COMPLETED
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'COMPLETED',
            updatedAt: new Date()
          }
        });

        completedCount++;

        // Deactivate virtual keys if they exist and are still active
        const activeKeys = booking.virtualKeys?.filter(key => key.isActive) || [];

        if (activeKeys.length > 0) {
          console.log(`🔑 Deactivating ${activeKeys.length} virtual keys for booking ${booking.id}`);

          try {
            // Deactivate keys in NUKI system
            const nukiKeyIds = activeKeys.map(key => key.nukiKeyId);
            await nukiApiService.revokeAllKeysForBooking(nukiKeyIds);

            // Deactivate keys in our database
            await VirtualKeyService.deactivateAllKeysForBooking(booking.id);

            keysDeactivatedCount += activeKeys.length;
            console.log(`✅ Successfully deactivated keys for booking ${booking.id}`);
          } catch (keyError) {
            console.error(`⚠️ Failed to deactivate keys for booking ${booking.id}:`, keyError);
            errors.push(`Failed to deactivate keys for booking ${booking.id}: ${keyError instanceof Error ? keyError.message : 'Unknown error'}`);
            // Continue with completion even if key deactivation fails
          }
        } else {
          console.log(`ℹ️ No active virtual keys found for booking ${booking.id}`);
        }

      } catch (bookingError) {
        const errorMsg = `Failed to complete booking ${booking.id}: ${bookingError instanceof Error ? bookingError.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const result = {
      success: true,
      processedBookings: bookingsToComplete.length,
      completedBookings: completedCount,
      keysDeactivated: keysDeactivatedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      message: `Checkout completion job finished: ${completedCount}/${bookingsToComplete.length} bookings completed, ${keysDeactivatedCount} keys deactivated`
    };

    console.log('✅ Checkout completion cron job finished:', result);
    return NextResponse.json(result);

  } catch (error) {
    const errorMsg = `Checkout completion cron job failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('❌', errorMsg);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}