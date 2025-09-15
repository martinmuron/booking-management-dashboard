// Script to bulk complete past bookings that are stuck at CHECKED_IN status
// Run this once to fix the current 110 stuck bookings

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function bulkCompletePastBookings() {
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
      console.log('✅ No past checked-in bookings found to complete');
      return;
    }

    // Show details of bookings to be completed
    console.log('📋 Bookings to be completed:');
    bookingsToComplete.forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.guestLeaderName} (${booking.checkInDate.toDateString()} → ${booking.checkOutDate.toDateString()})`);
    });

    console.log('\n🚀 Proceeding with bulk update...');

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

    // Verify the change
    const completedCount = await prisma.booking.count({
      where: { status: 'COMPLETED' }
    });

    const checkedInCount = await prisma.booking.count({
      where: { status: 'CHECKED_IN' }
    });

    console.log('📊 Updated status counts:');
    console.log(`  - COMPLETED: ${completedCount} bookings`);
    console.log(`  - CHECKED_IN: ${checkedInCount} bookings`);

    console.log('🎉 Bulk completion finished successfully!');

  } catch (error) {
    console.error('❌ Bulk completion failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
bulkCompletePastBookings();