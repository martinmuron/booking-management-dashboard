import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { ubyPortService } from '@/services/ubyport.service';

// POST /api/cron/ubyport-exports - Process UbyPort exports for bookings that checked in today
export async function POST(request: NextRequest) {
  try {
    console.log('🕐 Running UbyPort export cron job...');

    // Verify this is a cron job (Vercel sends a special header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'development-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    console.log(`📅 Processing UbyPort exports for check-ins on ${startOfDay.toDateString()}...`);

    // Find bookings that have their check-in date TODAY and have export data ready for submission
    const todayCheckIns = await prisma.booking.findMany({
      where: {
        // Must have checked in (completed the check-in process)
        status: 'CHECKED_IN',
        // Check-in date is today (the night they arrive)
        checkInDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        // Only process bookings that have export data ready or failed exports
        ubyPortExport: {
          status: {
            in: ['EXPORTED', 'FAILED'] // Ready to submit or retry failed
          }
        }
      },
      include: {
        guests: true,
        ubyPortExport: true
      }
    });

    console.log(`📋 Found ${todayCheckIns.length} bookings that checked in today requiring UbyPort export`);

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[]
    };

    // Process each booking
    for (const booking of todayCheckIns) {
      try {
        results.processed++;
        
        console.log(`🔄 Processing UbyPort export for booking ${booking.id} (${booking.guestLeaderName})...`);

        // Generate and submit UbyPort export
        const exportResult = await ubyPortService.generateExportOnCheckIn(booking.id);

        if (exportResult.success) {
          results.successful++;
          const statusMsg = exportResult.confirmationPdf 
            ? `✅ UbyPort export submitted to Czech Police for booking ${booking.id}: ${exportResult.message}` 
            : `📋 UbyPort export data prepared for booking ${booking.id}: ${exportResult.message}`;
          console.log(statusMsg);
        } else {
          results.failed++;
          const errorMsg = `Failed to export booking ${booking.id}: ${exportResult.error}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }

      } catch (error) {
        results.failed++;
        const errorMsg = `Error processing booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    const summary = `Processed ${results.processed} bookings: ${results.successful} successful, ${results.failed} failed, ${results.skipped} skipped`;
    console.log(`📊 UbyPort export cron job complete: ${summary}`);

    return NextResponse.json({
      success: true,
      message: `UbyPort export cron job completed: ${summary}`,
      results
    });

  } catch (error) {
    console.error('❌ UbyPort export cron job failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'UbyPort export cron job failed'
    }, { status: 500 });
  }
}