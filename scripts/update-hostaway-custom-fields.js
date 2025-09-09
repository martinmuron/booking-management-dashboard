#!/usr/bin/env node

/**
 * Script to update HostAway reservations with Nick Jenny check-in links
 * This updates the custom field (ID: 81717) with the check-in URL
 */

const SITE_URL = 'https://www.nickandjenny.cz';
const CUSTOM_FIELD_ID = 81717; // Nick Jenny check-in link field

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries} for ${url}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function getRecentBookings() {
  console.log('📋 Fetching recent bookings from database...');
  const response = await fetchWithRetry(`${SITE_URL}/api/bookings?limit=3`);
  
  if (response.success && response.data) {
    // Filter to get bookings with valid HostAway IDs and check-in tokens
    const validBookings = response.data.filter(b => 
      b.hostAwayId && 
      b.checkInToken &&
      !b.hostAwayId.startsWith('BK_') // Ensure it's a real HostAway ID
    );
    
    console.log(`Found ${validBookings.length} valid bookings with HostAway IDs`);
    return validBookings;
  }
  
  throw new Error('Failed to fetch bookings');
}

async function updateHostAwayCustomField(reservationId, checkInLink) {
  console.log(`\n🔄 Updating reservation ${reservationId}...`);
  console.log(`   Check-in link: ${checkInLink}`);
  
  // Call our API endpoint that handles the HostAway update
  const response = await fetchWithRetry(
    `${SITE_URL}/api/hostaway/update-custom-field`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reservationId: reservationId,
        customFieldId: CUSTOM_FIELD_ID,
        value: checkInLink
      })
    }
  );
  
  if (response.success) {
    console.log(`   ✅ Successfully updated reservation ${reservationId}`);
    return true;
  } else {
    console.error(`   ❌ Failed to update: ${response.error}`);
    return false;
  }
}

async function verifyUpdate(reservationId) {
  console.log(`   🔍 Verifying update for reservation ${reservationId}...`);
  
  const response = await fetchWithRetry(
    `${SITE_URL}/api/hostaway/reservation/${reservationId}`
  );
  
  if (response.success && response.data) {
    const customFields = response.data.customFieldValues || [];
    const nickJennyField = customFields.find(f => 
      f.customFieldId === CUSTOM_FIELD_ID
    );
    
    if (nickJennyField && nickJennyField.value) {
      console.log(`   ✅ Verified: Field contains ${nickJennyField.value}`);
      return true;
    } else {
      console.log(`   ⚠️  Field not found or empty`);
      return false;
    }
  }
  
  return false;
}

async function main() {
  console.log('🚀 Starting HostAway Custom Field Update Process');
  console.log('━'.repeat(60));
  
  try {
    // Step 1: Get recent bookings
    const bookings = await getRecentBookings();
    
    if (bookings.length === 0) {
      console.log('❌ No valid bookings found to update');
      return;
    }
    
    console.log(`\n📝 Will update ${bookings.length} reservations:`);
    bookings.forEach(b => {
      console.log(`   - ${b.hostAwayId}: ${b.guestLeaderName} (${b.propertyName})`);
    });
    
    // Step 2: Update each booking
    console.log('\n' + '━'.repeat(60));
    const results = [];
    
    for (const booking of bookings) {
      const checkInLink = `${SITE_URL}/checkin/${booking.checkInToken}`;
      
      const success = await updateHostAwayCustomField(
        booking.hostAwayId,
        checkInLink
      );
      
      if (success) {
        // Step 3: Verify the update
        const verified = await verifyUpdate(booking.hostAwayId);
        results.push({
          reservationId: booking.hostAwayId,
          guestName: booking.guestLeaderName,
          success: true,
          verified: verified,
          checkInLink: checkInLink
        });
      } else {
        results.push({
          reservationId: booking.hostAwayId,
          guestName: booking.guestLeaderName,
          success: false,
          verified: false,
          checkInLink: checkInLink
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Step 4: Summary
    console.log('\n' + '━'.repeat(60));
    console.log('📊 SUMMARY:');
    console.log('━'.repeat(60));
    
    const successCount = results.filter(r => r.success).length;
    const verifiedCount = results.filter(r => r.verified).length;
    
    console.log(`Total processed: ${results.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Verified in HostAway: ${verifiedCount}`);
    
    console.log('\nDetailed Results:');
    results.forEach(r => {
      const status = r.success ? (r.verified ? '✅' : '⚠️') : '❌';
      console.log(`${status} ${r.reservationId} - ${r.guestName}`);
      console.log(`   Link: ${r.checkInLink}`);
      console.log(`   Updated: ${r.success ? 'Yes' : 'No'}`);
      console.log(`   Verified: ${r.verified ? 'Yes' : 'No'}`);
    });
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);