// Show existing NUKI keys for specific bookings
async function showExistingKeys() {
  const bookings = [
    'BK_47141139', // U Průhonu (unauthorized)
    'BK_45799790'  // Ž103 (authorized)
  ];

  for (const bookingId of bookings) {
    console.log(`\n🔍 CHECKING BOOKING: ${bookingId}`);
    console.log('=' .repeat(50));

    try {
      // Get booking details
      const bookingResponse = await fetch(`https://www.nickandjenny.cz/api/bookings/${bookingId}`);
      const bookingData = await bookingResponse.json();

      if (!bookingData.success) {
        console.log('❌ Booking not found');
        continue;
      }

      const booking = bookingData.data;
      console.log(`📍 Property: ${booking.propertyName}`);
      console.log(`👤 Guest: ${booking.guestLeaderName}`);
      console.log(`📅 Check-in: ${booking.checkInDate.split('T')[0]}`);
      console.log(`📅 Check-out: ${booking.checkOutDate.split('T')[0]}`);

      // Check if property is authorized for NUKI
      const NUKI_AUTHORIZED_PROPERTIES = [
        "Bořivojova 50", "Řehořova", "Ž001", "Ž004", "Ž101", "Ž102", "Ž103", "Ž104",
        "Ž201", "Ž202", "Ž203", "Ž204", "Ž301", "Ž302", "Ž303", "Ž304",
        "Ž401", "Ž402", "Ž403", "Ž404", "Ž501", "Ž502", "Ž503", "Ž504",
        "Ž601", "Ž602", "Ž604"
      ];

      const isAuthorized = NUKI_AUTHORIZED_PROPERTIES.includes(booking.propertyName);
      console.log(`🔐 NUKI Authorized: ${isAuthorized ? '✅ YES' : '❌ NO'}`);

      if (!isAuthorized) {
        console.log('   → This property does not have smart lock access');
        continue;
      }

      // Get NUKI keys
      const nukiResponse = await fetch('https://www.nickandjenny.cz/api/nuki/keys');
      const nukiData = await nukiResponse.json();

      if (!nukiData.success) {
        console.log('❌ Failed to get NUKI keys');
        continue;
      }

      const allKeys = nukiData.data;
      const bookingCheckIn = new Date(booking.checkInDate);
      const bookingCheckOut = new Date(booking.checkOutDate);

      // Find matching keys
      const matchingKeys = allKeys.filter(key => {
        // Only guest keys
        if (!key.allowedFromDate || !key.allowedUntilDate) return false;

        // Skip staff keys
        if (key.name && (
          key.name.toLowerCase().includes('nuki') ||
          key.name.toLowerCase().includes('nick') ||
          key.name.toLowerCase().includes('jenny') ||
          key.name.toLowerCase().includes('cleaners') ||
          key.name.toLowerCase().includes('builders') ||
          key.name.toLowerCase().includes('management')
        )) return false;

        const keyFrom = new Date(key.allowedFromDate);
        const keyUntil = new Date(key.allowedUntilDate);

        // Check date overlap (2-day tolerance)
        const dateTolerance = 2 * 24 * 60 * 60 * 1000;
        const dateMatch = Math.abs(keyFrom.getTime() - bookingCheckIn.getTime()) <= dateTolerance &&
                         Math.abs(keyUntil.getTime() - bookingCheckOut.getTime()) <= dateTolerance;

        if (!dateMatch) return false;

        // Check property match
        const propertyMatch =
          (key.deviceName === '103' && booking.propertyName === 'Ž103') ||
          (key.deviceName === 'Main Door' && booking.propertyName.startsWith('Ž')) ||
          (key.deviceName === 'Laundry' && booking.propertyName.startsWith('Ž')) ||
          (key.deviceName === 'Luggage' && booking.propertyName.startsWith('Ž'));

        if (!propertyMatch) return false;

        // Check name similarity
        if (key.name && booking.guestLeaderName) {
          const keyNameLower = key.name.toLowerCase();
          const guestNameLower = booking.guestLeaderName.toLowerCase();

          const keyNameParts = keyNameLower.split(' ');
          const guestNameParts = guestNameLower.split(' ');

          let similarity = 0;
          keyNameParts.forEach(keyPart => {
            guestNameParts.forEach(guestPart => {
              if (keyPart.includes(guestPart) || guestPart.includes(keyPart)) {
                similarity++;
              }
            });
          });

          return similarity > 0;
        }

        return false;
      });

      console.log(`\n🔑 EXISTING NUKI KEYS: ${matchingKeys.length} found`);

      if (matchingKeys.length > 0) {
        matchingKeys.forEach((key, index) => {
          console.log(`   ${index + 1}. ${key.name} (${key.deviceName})`);
          console.log(`      Status: ${key.isActive ? '✅ Active' : '❌ Inactive'}`);
          console.log(`      Valid: ${key.allowedFromDate?.split('T')[0]} to ${key.allowedUntilDate?.split('T')[0]}`);
          console.log(`      NUKI ID: ${key.id}`);
        });

        // Group by device type
        const byDevice = matchingKeys.reduce((acc, key) => {
          const device = key.deviceName;
          if (!acc[device]) acc[device] = [];
          acc[device].push(key);
          return acc;
        }, {});

        console.log(`\n📋 KEYS BY DEVICE TYPE:`);
        Object.entries(byDevice).forEach(([device, keys]) => {
          console.log(`   ${device}: ${keys.length} key(s)`);
        });

        // Show what universal code might be
        const roomKeys = matchingKeys.filter(k => k.deviceName.match(/^\d+$/));
        if (roomKeys.length > 0) {
          console.log(`\n🔐 POTENTIAL UNIVERSAL CODE:`);
          console.log(`   These keys likely share the same 6-digit keypad code`);
          console.log(`   Check NUKI app or generate via API for actual code`);
        }

      } else {
        console.log('   → No matching NUKI keys found for this booking');
        console.log('   → Keys may need to be generated or dates may not match');
      }

    } catch (error) {
      console.error(`❌ Error processing ${bookingId}:`, error.message);
    }
  }
}

showExistingKeys();