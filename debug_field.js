// Simple debug script to check HostAway custom field directly
// No dotenv import needed - we'll pass environment variables manually

// We'll manually call the HostAway API to check the specific reservation
async function checkReservationCustomField() {
  console.log('🔍 Checking HostAway API directly...');

  // HostAway credentials
  const CLIENT_ID = process.env.HOSTAWAY_CLIENT_ID;
  const CLIENT_SECRET = process.env.HOSTAWAY_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing HostAway credentials');
    return;
  }

  try {
    // Get access token
    console.log('🔐 Getting HostAway access token...');
    const authResponse = await fetch('https://api.hostaway.com/v1/accessTokens', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: 'general'
      })
    });

    const authData = await authResponse.json();
    if (!authData.access_token) {
      console.error('❌ Failed to get access token:', authData);
      return;
    }

    console.log('✅ Got access token');

    // Get recent reservations - check more and sort by creation date
    console.log('📋 Fetching recent reservations...');
    const reservationsResponse = await fetch('https://api.hostaway.com/v1/reservations?includeResources=1&limit=20&sortOrder=latestActivity', {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Cache-Control': 'no-cache'
      }
    });

    const reservationsData = await reservationsResponse.json();

    if (!reservationsData.result || reservationsData.result.length === 0) {
      console.log('❌ No reservations found');
      return;
    }

    console.log(`✅ Found ${reservationsData.result.length} reservations`);

    // Check each reservation for custom field 81717
    for (const reservation of reservationsData.result) {
      console.log(`\n🎯 Reservation ${reservation.id} - ${reservation.guestFirstName} ${reservation.guestLastName}`);

      if (reservation.customFieldValues && reservation.customFieldValues.length > 0) {
        console.log(`📋 Has ${reservation.customFieldValues.length} custom fields:`);

        // Look for Nick Jenny field (81717)
        const nickJennyField = reservation.customFieldValues.find(field =>
          field.customFieldId === 81717
        );

        if (nickJennyField) {
          console.log('🎯 **FOUND NICK JENNY FIELD 81717:**');
          console.log('   Raw value:', JSON.stringify(nickJennyField.value));
          console.log('   Value length:', nickJennyField.value ? nickJennyField.value.length : 0);
          console.log('   Full field:', JSON.stringify(nickJennyField, null, 2));

          // Check if it contains "Test:"
          if (nickJennyField.value && nickJennyField.value.includes('Test:')) {
            console.log('🚨 **FOUND "Test:" PREFIX IN HOSTAWAY DATA!**');
            console.log('   This explains the issue - the prefix is stored in HostAway');
          }
        } else {
          console.log('❌ Nick Jenny field 81717 not found');
        }

        // Show all fields for debugging
        console.log('📋 All custom fields:');
        reservation.customFieldValues.forEach(field => {
          console.log(`   Field ${field.customFieldId}: "${field.value}"`);
        });
      } else {
        console.log('❌ No custom fields found');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkReservationCustomField();