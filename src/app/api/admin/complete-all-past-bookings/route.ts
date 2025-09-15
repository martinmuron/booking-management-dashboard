import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// POST /api/admin/complete-all-past-bookings - Mark ALL past bookings as COMPLETED regardless of current status
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting comprehensive completion of ALL past bookings...');

    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Marking as COMPLETED: ALL bookings with checkout date before ${today.toISOString()}`);

    // First, let's see what we're working with
    const allPastBookings = await prisma.booking.findMany({
      where: {
        checkOutDate: {
          lt: today  // checkout date is before today
        }
      },
      select: {
        id: true,
        guestLeaderName: true,
        checkOutDate: true,
        checkInDate: true,
        status: true
      }
    });

    console.log(`🔍 Found ${allPastBookings.length} total past bookings (all statuses)`);

    if (allPastBookings.length === 0) {
      return NextResponse.json({
        success: true,
        completedCount: 0,
        message: 'No past bookings found to complete'
      });
    }

    // Group by current status for reporting
    const statusCounts = allPastBookings.reduce((acc, booking) => {
      acc[booking.status] = (acc[booking.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('📊 Current status breakdown of past bookings:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count} bookings`);
    });

    // Show sample of bookings to be completed
    console.log('\n📋 Sample of past bookings to be completed:');
    allPastBookings.slice(0, 10).forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.guestLeaderName} (${booking.status}) - Checkout: ${booking.checkOutDate.toDateString()}`);
    });

    if (allPastBookings.length > 10) {
      console.log(`  ... and ${allPastBookings.length - 10} more`);
    }

    console.log('\n🚀 Proceeding with comprehensive bulk update...');

    // Update ALL past bookings to COMPLETED (regardless of current status)
    const updateResult = await prisma.booking.updateMany({
      where: {
        checkOutDate: {
          lt: today
        }
      },
      data: {
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    });

    console.log(`✅ Successfully marked ${updateResult.count} bookings as COMPLETED`);

    // Verify the final counts
    const totalBookings = await prisma.booking.count();
    const completedCount = await prisma.booking.count({
      where: { status: 'COMPLETED' }
    });
    const checkedInCount = await prisma.booking.count({
      where: { status: 'CHECKED_IN' }
    });
    const pendingCount = await prisma.booking.count({
      where: { status: 'PENDING' }
    });

    console.log('\n📊 Final status counts after update:');
    console.log(`  - Total bookings: ${totalBookings}`);
    console.log(`  - COMPLETED: ${completedCount} bookings`);
    console.log(`  - CHECKED_IN: ${checkedInCount} bookings`);
    console.log(`  - PENDING: ${pendingCount} bookings`);

    return NextResponse.json({
      success: true,
      completedCount: updateResult.count,
      beforeUpdate: {
        totalPastBookings: allPastBookings.length,
        statusBreakdown: statusCounts
      },
      afterUpdate: {
        totalBookings,
        completed: completedCount,
        checkedIn: checkedInCount,
        pending: pendingCount
      },
      message: `Successfully marked ${updateResult.count} past bookings as COMPLETED (from all previous statuses)`
    });

  } catch (error) {
    console.error('❌ Comprehensive completion failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to complete all past bookings'
    }, { status: 500 });
  }
}