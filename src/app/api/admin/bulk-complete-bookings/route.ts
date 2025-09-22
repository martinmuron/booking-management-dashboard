import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// POST /api/admin/bulk-complete-bookings - Bulk update past bookings to COMPLETED status
export async function POST() {
  try {
    console.log('🔄 Starting bulk completion of past bookings...');

    // Get current date (start of today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Marking as COMPLETED: bookings with checkout date before ${today.toISOString()}`);

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
      select: {
        id: true,
        guestLeaderName: true,
        checkOutDate: true,
        checkInDate: true
      }
    });

    console.log(`🔍 Found ${bookingsToComplete.length} past bookings to mark as completed`);

    if (bookingsToComplete.length === 0) {
      return NextResponse.json({
        success: true,
        completedCount: 0,
        message: 'No past checked-in bookings found to complete'
      });
    }

    // Show details of bookings to be completed
    console.log('📋 Bookings to be completed:');
    bookingsToComplete.forEach(booking => {
      console.log(`  - ${booking.guestLeaderName} (${booking.checkInDate.toDateString()} → ${booking.checkOutDate.toDateString()})`);
    });

    // Bulk update all past bookings to COMPLETED
    const updateResult = await prisma.booking.updateMany({
      where: {
        status: 'CHECKED_IN',
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

    return NextResponse.json({
      success: true,
      completedCount: updateResult.count,
      bookingsDetails: bookingsToComplete.map(b => ({
        guestName: b.guestLeaderName,
        checkOut: b.checkOutDate.toDateString()
      })),
      message: `Successfully marked ${updateResult.count} past bookings as COMPLETED`
    });

  } catch (error) {
    console.error('❌ Bulk completion failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to bulk complete past bookings'
    }, { status: 500 });
  }
}
