// Analyze specific reservation 47646462 in detail
async function analyzeReservation() {
  console.log('🔍 Analyzing reservation 47646462...');

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

    // Fetch specific reservation
    console.log('🎯 Fetching reservation 47646462 directly...');
    const reservationResponse = await fetch('https://api.hostaway.com/v1/reservations/47646462?includeResources=1', {
      headers: {
        'Authorization': `Bearer ${authData.access_token}`,
        'Cache-Control': 'no-cache'
      }
    });

    const reservationData = await reservationResponse.json();

    if (!reservationData.result) {
      console.error('❌ Reservation not found or error:', reservationData);
      return;
    }

    const reservation = reservationData.result;

    console.log('\n🎯 **COMPLETE RESERVATION ANALYSIS**');
    console.log('=====================================');

    // Basic info
    console.log('**BASIC INFO:**');
    console.log('- ID:', reservation.id);
    console.log('- Guest:', reservation.guestFirstName, reservation.guestLastName);
    console.log('- Email:', reservation.guestEmail);
    console.log('- Phone:', reservation.phone);
    console.log('- Check-in:', reservation.arrivalDate);
    console.log('- Check-out:', reservation.departureDate);
    console.log('- Status:', reservation.status);
    console.log('- Channel:', reservation.channelName, `(ID: ${reservation.channelId})`);
    console.log('- Listing:', reservation.listingMapId);
    console.log('- Guests:', reservation.numberOfGuests);
    console.log('- Total Price:', reservation.totalPrice, reservation.currency);

    // Custom fields analysis
    console.log('\n**CUSTOM FIELDS:**');
    if (reservation.customFieldValues && reservation.customFieldValues.length > 0) {
      console.log(`Found ${reservation.customFieldValues.length} custom fields:`);

      reservation.customFieldValues.forEach(field => {
        console.log(`\n- Field ${field.customFieldId}:`);
        console.log(`  Name: ${field.customField?.name || 'Unknown'}`);
        console.log(`  Value: "${field.value}"`);
        console.log(`  Created: ${field.insertedOn}`);
        console.log(`  Updated: ${field.updatedOn}`);

        if (field.customFieldId === 81717) {
          console.log('  🎯 **THIS IS THE NICK JENNY FIELD!**');

          if (field.insertedOn !== field.updatedOn) {
            console.log('  🚨 **FIELD WAS MODIFIED AFTER CREATION!**');
            console.log(`     Original: ${field.insertedOn}`);
            console.log(`     Modified: ${field.updatedOn}`);
            console.log('     This indicates manual editing after webhook');
          }

          if (field.value && field.value.includes('Test:')) {
            console.log('  🚨 **CONTAINS "Test:" PREFIX!**');
            console.log('     This prefix was manually added, not from our webhook');
          }
        }
      });
    } else {
      console.log('❌ No custom fields found');
    }

    // Timestamps analysis
    console.log('\n**TIMESTAMPS:**');
    console.log('- Reservation created:', reservation.insertedOn || 'Unknown');
    console.log('- Last updated:', reservation.updatedOn || 'Unknown');

    // Look for any other relevant data
    console.log('\n**ADDITIONAL DATA:**');
    console.log('- Confirmation Code:', reservation.confirmationCode);
    console.log('- Channel Reservation ID:', reservation.reservationId);
    console.log('- Door Code:', reservation.doorCode || 'None');

    console.log('\n**RAW CUSTOM FIELD 81717 DATA:**');
    const nickJennyField = reservation.customFieldValues?.find(f => f.customFieldId === 81717);
    if (nickJennyField) {
      console.log(JSON.stringify(nickJennyField, null, 2));
    } else {
      console.log('Field 81717 not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the analysis
analyzeReservation();