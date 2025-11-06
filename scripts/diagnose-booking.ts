import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { nukiApiService } from '@/services/nuki-api.service';

const prisma = new PrismaClient();

const BOOKING_TOKEN = 'HENIXGLSJS';

async function diagnoseBooking() {
  console.log(`🔍 Diagnosing booking with token: ${BOOKING_TOKEN}\n`);

  // Find the booking
  const booking = await prisma.booking.findUnique({
    where: { checkInToken: BOOKING_TOKEN },
    include: {
      guests: true,
      payments: true,
      virtualKeys: {
        orderBy: { createdAt: 'desc' }
      },
      nukiKeyRetries: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!booking) {
    console.error('❌ Booking not found!');
    return;
  }

  console.log('📋 BOOKING DETAILS:');
  console.log('-------------------');
  console.log(`ID: ${booking.id}`);
  console.log(`HostAway ID: ${booking.hostAwayId}`);
  console.log(`Property: ${booking.propertyName}`);
  console.log(`Guest: ${booking.guestLeaderName}`);
  console.log(`Email: ${booking.guestLeaderEmail}`);
  console.log(`Check-in: ${booking.checkInDate.toISOString()}`);
  console.log(`Check-out: ${booking.checkOutDate.toISOString()}`);
  console.log(`Status: ${booking.status}`);
  console.log(`Universal Code: ${booking.universalKeypadCode || 'NOT SET'}`);
  console.log(`Room Number: ${booking.roomNumber || 'NOT SET'}`);
  console.log();

  console.log('👥 GUESTS:');
  console.log('----------');
  if (booking.guests.length === 0) {
    console.log('⚠️ NO GUESTS REGISTERED');
  } else {
    booking.guests.forEach((guest, idx) => {
      console.log(`${idx + 1}. ${guest.firstName} ${guest.lastName}${guest.isLeadGuest ? ' (LEAD)' : ''}`);
      console.log(`   Email: ${guest.email || 'N/A'}`);
      console.log(`   DOB: ${guest.dateOfBirth?.toISOString().split('T')[0] || 'N/A'}`);
      console.log(`   Nationality: ${guest.nationality || 'N/A'}`);
    });
  }
  console.log();

  console.log('💳 PAYMENTS:');
  console.log('------------');
  if (booking.payments.length === 0) {
    console.log('⚠️ NO PAYMENTS RECORDED');
  } else {
    booking.payments.forEach((payment, idx) => {
      console.log(`${idx + 1}. ${payment.amount} ${payment.currency} - ${payment.status}`);
      console.log(`   Method: ${payment.method || 'N/A'}`);
      console.log(`   Paid At: ${payment.paidAt?.toISOString() || 'N/A'}`);
      console.log(`   Stripe Intent: ${payment.stripePaymentIntentId || 'N/A'}`);
    });
  }
  console.log();

  console.log('🔑 VIRTUAL KEYS (Database):');
  console.log('---------------------------');
  if (booking.virtualKeys.length === 0) {
    console.log('❌ NO VIRTUAL KEYS IN DATABASE');
  } else {
    booking.virtualKeys.forEach((key, idx) => {
      console.log(`${idx + 1}. ${key.keyType} (${key.isActive ? '✅ Active' : '❌ Inactive'})`);
      console.log(`   Nuki Key ID: ${key.nukiKeyId}`);
      console.log(`   Created: ${key.createdAt.toISOString()}`);
      console.log(`   Deactivated: ${key.deactivatedAt?.toISOString() || 'N/A'}`);
    });
  }
  console.log();

  console.log('🔄 NUKI KEY RETRIES:');
  console.log('--------------------');
  if (booking.nukiKeyRetries.length === 0) {
    console.log('ℹ️  No retry records');
  } else {
    booking.nukiKeyRetries.forEach((retry, idx) => {
      console.log(`${idx + 1}. ${retry.keyType} - ${retry.status}`);
      console.log(`   Device ID: ${retry.deviceId}`);
      console.log(`   Attempts: ${retry.attemptCount}/${retry.maxAttempts}`);
      console.log(`   Next Attempt: ${retry.nextAttemptAt.toISOString()}`);
      console.log(`   Last Error: ${retry.lastError || 'N/A'}`);
    });
  }
  console.log();

  // Check NUKI API for keys
  console.log('🌐 CHECKING NUKI API:');
  console.log('---------------------');

  try {
    const nukiKeys = await nukiApiService.listVirtualKeys();
    console.log(`Total keys in NUKI: ${nukiKeys.length}`);

    // Filter keys by the keypad code
    const bookingKeys = booking.universalKeypadCode
      ? nukiKeys.filter(k => k.name.includes(booking.universalKeypadCode!))
      : [];

    console.log(`Keys matching universal code (${booking.universalKeypadCode}): ${bookingKeys.length}`);

    if (bookingKeys.length > 0) {
      bookingKeys.forEach((key, idx) => {
        console.log(`${idx + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
        console.log(`   Smart Lock ID: ${key.smartlockId}`);
        console.log(`   Type: ${key.type}`);
        console.log(`   Enabled: ${key.enabled}`);
      });
    }

    // Also check by guest name
    const nameKeys = nukiKeys.filter(k =>
      k.name.toLowerCase().includes(booking.guestLeaderName.toLowerCase().split(' ')[0].toLowerCase())
    );
    console.log(`\nKeys matching guest name (${booking.guestLeaderName}): ${nameKeys.length}`);
    if (nameKeys.length > 0) {
      nameKeys.forEach((key, idx) => {
        console.log(`${idx + 1}. ${key.name}`);
        console.log(`   ID: ${key.id}`);
      });
    }
  } catch (error) {
    console.error('❌ Failed to fetch NUKI keys:', error);
  }

  console.log();

  // Analyze the conditions
  console.log('🔍 CONDITION ANALYSIS:');
  console.log('----------------------');

  const checkInCompleted = booking.guests.length > 0 && booking.status !== 'PENDING';
  const hasVirtualKeys = booking.virtualKeys.filter(k => k.isActive).length > 0;
  const hasUniversalCode = Boolean(booking.universalKeypadCode);
  const hasAccessArtifacts = hasVirtualKeys || hasUniversalCode;

  const now = new Date();
  const checkInDate = new Date(booking.checkInDate);
  const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const within3DayWindow = daysUntilCheckIn <= 3;

  const cityTaxAmount = 0; // This would need to be calculated based on guests
  const hasPaidPayment = booking.payments.some(p => p.status === 'succeeded' || p.paidAt);
  const hasPaymentIntent = booking.payments.some(p => p.stripePaymentIntentId);
  const hasSettledCityTax = checkInCompleted || cityTaxAmount === 0 || hasPaymentIntent || hasPaidPayment;

  console.log(`✓ Booking exists: ✅`);
  console.log(`✓ Check-in completed: ${checkInCompleted ? '✅' : '❌'} (Status: ${booking.status}, Guests: ${booking.guests.length})`);
  console.log(`✓ Has virtual keys: ${hasVirtualKeys ? '✅' : '❌'} (${booking.virtualKeys.filter(k => k.isActive).length} active)`);
  console.log(`✓ Has universal code: ${hasUniversalCode ? '✅' : '❌'} (${booking.universalKeypadCode})`);
  console.log(`✓ Has access artifacts: ${hasAccessArtifacts ? '✅' : '❌'}`);
  console.log(`✓ Within 3-day window: ${within3DayWindow ? '✅' : '❌'} (${daysUntilCheckIn} days until check-in)`);
  console.log(`✓ Has settled city tax: ${hasSettledCityTax ? '✅' : '❌'}`);

  const canShowKeys = checkInCompleted && hasAccessArtifacts && within3DayWindow && hasSettledCityTax;
  console.log();
  console.log(`🎯 CAN SHOW KEYS: ${canShowKeys ? '✅ YES' : '❌ NO'}`);

  if (!canShowKeys) {
    console.log('\n❌ ISSUES PREVENTING KEY DISPLAY:');
    if (!checkInCompleted) console.log('   - Check-in not completed');
    if (!hasAccessArtifacts) console.log('   - No access artifacts (no keys and no universal code)');
    if (!within3DayWindow) console.log('   - Outside 3-day check-in window');
    if (!hasSettledCityTax) console.log('   - City tax not settled');
  }
}

(async () => {
  try {
    await diagnoseBooking();
  } catch (error) {
    console.error('Unexpected failure:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
