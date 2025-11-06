import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { ensureNukiKeysForBooking } from '@/services/auto-key.service';

const prisma = new PrismaClient();

const BOOKING_TOKEN = process.argv[2] || 'HENIXGLSJS';

async function generateKeys() {
  console.log(`🔑 Generating NUKI keys for booking: ${BOOKING_TOKEN}\n`);

  // Find the booking
  const booking = await prisma.booking.findUnique({
    where: { checkInToken: BOOKING_TOKEN },
    include: {
      virtualKeys: true,
      payments: true
    }
  });

  if (!booking) {
    console.error('❌ Booking not found!');
    process.exit(1);
  }

  console.log('📋 Booking Details:');
  console.log(`   ID: ${booking.id}`);
  console.log(`   Status: ${booking.status}`);
  console.log(`   Property: ${booking.propertyName}`);
  console.log(`   Guest: ${booking.guestLeaderName}`);
  console.log(`   Check-in: ${booking.checkInDate.toISOString()}`);
  console.log(`   Universal Code: ${booking.universalKeypadCode || 'NOT SET'}`);
  console.log(`   Active Keys: ${booking.virtualKeys.filter(k => k.isActive).length}`);
  console.log();

  // Ensure the booking status is correct
  if (booking.status !== 'CHECKED_IN' && booking.status !== 'KEYS_DISTRIBUTED' && booking.status !== 'COMPLETED') {
    console.log('⚠️  Booking status is not in CHECKED_IN/KEYS_DISTRIBUTED/COMPLETED state');
    console.log('   Updating status to CHECKED_IN...');

    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CHECKED_IN', updatedAt: new Date() }
    });

    console.log('   ✅ Status updated to CHECKED_IN');
    console.log();
  }

  // Generate keys
  console.log('🔄 Generating NUKI keys...');

  try {
    const result = await ensureNukiKeysForBooking(booking.id, {
      force: true,
      allowEarlyGeneration: true
    });

    console.log('\n📊 Key Generation Result:');
    console.log(`   Status: ${result.status}`);

    if (result.status === 'created') {
      console.log(`   ✅ Created Keys: ${result.createdKeyTypes.join(', ')}`);
      console.log(`   🔢 Universal Code: ${result.universalKeypadCode}`);
      if (result.queuedKeyTypes.length > 0) {
        console.log(`   ⏳ Queued Keys: ${result.queuedKeyTypes.join(', ')}`);
      }
    } else if (result.status === 'already') {
      console.log(`   ℹ️  Keys already exist (${result.keys.length} active)`);
    } else if (result.status === 'queued') {
      console.log(`   ⏳ Queued for retry: ${result.queuedKeyTypes.join(', ')}`);
      console.log(`   🔢 Universal Code: ${result.universalKeypadCode || 'NOT SET'}`);
    } else if (result.status === 'skipped') {
      console.log(`   ⚠️  Skipped: ${result.reason}`);
    } else if (result.status === 'too_early') {
      console.log(`   ⏰ Too early: ${result.daysUntilGeneration} days until generation`);
      console.log(`   📅 Keys available: ${result.generationDate.toISOString()}`);
    } else if (result.status === 'failed') {
      console.log(`   ❌ Failed: ${result.reason}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    // Fetch updated booking to show final state
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: booking.id },
      include: { virtualKeys: true }
    });

    console.log('\n📋 Final State:');
    console.log(`   Status: ${updatedBooking!.status}`);
    console.log(`   Universal Code: ${updatedBooking!.universalKeypadCode || 'NOT SET'}`);
    console.log(`   Active Virtual Keys: ${updatedBooking!.virtualKeys.filter(k => k.isActive).length}`);
    updatedBooking!.virtualKeys.filter(k => k.isActive).forEach(key => {
      console.log(`      - ${key.keyType} (Nuki ID: ${key.nukiKeyId})`);
    });

    console.log('\n✅ Key generation complete!');
    console.log(`\n🔗 Check-in URL: https://www.nickandjenny.cz/checkin/${BOOKING_TOKEN}`);

  } catch (error) {
    console.error('\n❌ Failed to generate keys:', error);
    throw error;
  }
}

(async () => {
  try {
    await generateKeys();
  } catch (error) {
    console.error('Unexpected failure:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
