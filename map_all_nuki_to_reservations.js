// Map ALL existing NUKI keys to reservations - comprehensive mapping
async function mapAllNukiKeysToReservations() {
  console.log('🔍 COMPREHENSIVE NUKI KEY → RESERVATION MAPPING');
  console.log('=' .repeat(60));

  try {
    // Fetch all NUKI keys
    console.log('\n📋 Fetching all NUKI keys...');
    const nukiResponse = await fetch('https://www.nickandjenny.cz/api/nuki/keys');
    const nukiData = await nukiResponse.json();

    if (!nukiData.success) {
      console.log('❌ Failed to get NUKI keys');
      return;
    }

    // Fetch all bookings
    console.log('📋 Fetching all bookings...');
    const bookingsResponse = await fetch('https://www.nickandjenny.cz/api/bookings');
    const bookingsData = await bookingsResponse.json();

    if (!bookingsData.success) {
      console.log('❌ Failed to get bookings');
      return;
    }

    const allNukiKeys = nukiData.data;
    const allBookings = bookingsData.data;

    console.log(`Found ${allNukiKeys.length} NUKI keys and ${allBookings.length} bookings`);

    // Filter to guest keys only (exclude permanent staff keys)
    const guestKeys = allNukiKeys.filter(key => {
      // Must have time limits
      if (!key.allowedFromDate || !key.allowedUntilDate) return false;

      // Skip permanent staff keys
      if (key.name && (
        key.name.toLowerCase().includes('nuki') ||
        key.name.toLowerCase().includes('nick') ||
        key.name.toLowerCase().includes('jenny') ||
        key.name.toLowerCase().includes('cleaners') ||
        key.name.toLowerCase().includes('builders') ||
        key.name.toLowerCase().includes('management') ||
        key.name.toLowerCase().includes('web')
      )) return false;

      return true;
    });

    console.log(`\n🎯 Processing ${guestKeys.length} guest keys for mapping...`);

    // Authorized properties for NUKI
    const NUKI_AUTHORIZED_PROPERTIES = [
      "Bořivojova 50", "Řehořova", "Ž001", "Ž004", "Ž101", "Ž102", "Ž103", "Ž104",
      "Ž201", "Ž202", "Ž203", "Ž204", "Ž301", "Ž302", "Ž303", "Ž304",
      "Ž401", "Ž402", "Ž403", "Ž404", "Ž501", "Ž502", "Ž503", "Ž504",
      "Ž601", "Ž602", "Ž604"
    ];

    const mappingResults = [];
    let mappedCount = 0;

    // Process each guest key
    for (let i = 0; i < guestKeys.length; i++) {
      const key = guestKeys[i];
      const progress = `[${i + 1}/${guestKeys.length}]`;

      const keyFrom = new Date(key.allowedFromDate);
      const keyUntil = new Date(key.allowedUntilDate);

      // Find potential bookings for this key
      const potentialBookings = allBookings.filter(booking => {
        // Check if property is NUKI authorized
        if (!NUKI_AUTHORIZED_PROPERTIES.includes(booking.propertyName)) return false;

        const bookingCheckIn = new Date(booking.checkInDate);
        const bookingCheckOut = new Date(booking.checkOutDate);

        // Date matching with tolerance
        const dateTolerance = 3 * 24 * 60 * 60 * 1000; // 3 days tolerance
        const dateMatch = Math.abs(keyFrom.getTime() - bookingCheckIn.getTime()) <= dateTolerance &&
                         Math.abs(keyUntil.getTime() - bookingCheckOut.getTime()) <= dateTolerance;

        if (!dateMatch) return false;

        // Property/device matching
        const propertyMatch =
          (key.deviceName === '001' && booking.propertyName === 'Ž001') ||
          (key.deviceName === '004' && booking.propertyName === 'Ž004') ||
          (key.deviceName === '101' && booking.propertyName === 'Ž101') ||
          (key.deviceName === '102' && booking.propertyName === 'Ž102') ||
          (key.deviceName === '103' && booking.propertyName === 'Ž103') ||
          (key.deviceName === '104' && booking.propertyName === 'Ž104') ||
          (key.deviceName === '201' && booking.propertyName === 'Ž201') ||
          (key.deviceName === '202' && booking.propertyName === 'Ž202') ||
          (key.deviceName === '203' && booking.propertyName === 'Ž203') ||
          (key.deviceName === '204' && booking.propertyName === 'Ž204') ||
          (key.deviceName === '301' && booking.propertyName === 'Ž301') ||
          (key.deviceName === '302' && booking.propertyName === 'Ž302') ||
          (key.deviceName === '303' && booking.propertyName === 'Ž303') ||
          (key.deviceName === '304' && booking.propertyName === 'Ž304') ||
          (key.deviceName === '401' && booking.propertyName === 'Ž401') ||
          (key.deviceName === '402' && booking.propertyName === 'Ž402') ||
          (key.deviceName === '403' && booking.propertyName === 'Ž403') ||
          (key.deviceName === '404' && booking.propertyName === 'Ž404') ||
          (key.deviceName === '501' && booking.propertyName === 'Ž501') ||
          (key.deviceName === '502' && booking.propertyName === 'Ž502') ||
          (key.deviceName === '503' && booking.propertyName === 'Ž503') ||
          (key.deviceName === '504' && booking.propertyName === 'Ž504') ||
          (key.deviceName === '601' && booking.propertyName === 'Ž601') ||
          (key.deviceName === '602' && booking.propertyName === 'Ž602') ||
          (key.deviceName === '604' && booking.propertyName === 'Ž604') ||
          (key.deviceName === 'Borivojova Entry door' && booking.propertyName === 'Bořivojova 50') ||
          (key.deviceName === 'Řehořova' && booking.propertyName === 'Řehořova') ||
          // Shared facilities for Z properties
          (key.deviceName === 'Main Door' && booking.propertyName.startsWith('Ž')) ||
          (key.deviceName === 'Laundry' && booking.propertyName.startsWith('Ž')) ||
          (key.deviceName === 'Luggage' && booking.propertyName.startsWith('Ž'));

        return propertyMatch;
      });

      if (potentialBookings.length === 0) continue;

      // Find best name match
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const booking of potentialBookings) {
        if (!key.name || !booking.guestLeaderName) continue;

        const keyNameLower = key.name.toLowerCase().replace(/[^\w\s]/g, '');
        const guestNameLower = booking.guestLeaderName.toLowerCase().replace(/[^\w\s]/g, '');

        // Calculate similarity score
        const keyNameParts = keyNameLower.split(' ').filter(p => p.length > 1);
        const guestNameParts = guestNameLower.split(' ').filter(p => p.length > 1);

        let similarity = 0;
        let exactMatches = 0;

        keyNameParts.forEach(keyPart => {
          guestNameParts.forEach(guestPart => {
            if (keyPart === guestPart) {
              exactMatches += 2; // Exact match gets higher score
            } else if (keyPart.includes(guestPart) || guestPart.includes(keyPart)) {
              similarity += 1;
            }
          });
        });

        const totalSimilarity = exactMatches + similarity;

        if (totalSimilarity > bestSimilarity) {
          bestSimilarity = totalSimilarity;
          bestMatch = booking;
        }
      }

      if (bestMatch && bestSimilarity > 0) {
        // Determine key type
        let keyType = 'ROOM';
        if (key.deviceName === 'Main Door') keyType = 'MAIN_ENTRANCE';
        else if (key.deviceName === 'Laundry') keyType = 'LAUNDRY_ROOM';
        else if (key.deviceName === 'Luggage') keyType = 'LUGGAGE_ROOM';
        else if (key.deviceName === 'Borivojova Entry door') keyType = 'MAIN_ENTRANCE';
        else if (key.deviceName === 'Řehořova') keyType = 'MAIN_ENTRANCE';

        const mapping = {
          nukiKey: {
            id: key.id,
            name: key.name,
            device: key.deviceName,
            type: key.typeName,
            from: key.allowedFromDate,
            until: key.allowedUntilDate,
            isActive: key.isActive
          },
          booking: {
            id: bestMatch.id,
            guestName: bestMatch.guestLeaderName,
            propertyName: bestMatch.propertyName,
            checkIn: bestMatch.checkInDate,
            checkOut: bestMatch.checkOutDate
          },
          keyType: keyType,
          similarity: bestSimilarity,
          confidence: bestSimilarity >= 2 ? 'HIGH' : 'MEDIUM'
        };

        mappingResults.push(mapping);
        mappedCount++;

        const status = mapping.confidence === 'HIGH' ? '✅' : '⚠️';
        console.log(`${progress} ${status} ${key.name} (${key.deviceName}) → ${bestMatch.guestLeaderName} (${bestMatch.propertyName})`);
      }
    }

    console.log(`\n📊 MAPPING SUMMARY`);
    console.log('-'.repeat(50));
    console.log(`Total guest keys: ${guestKeys.length}`);
    console.log(`Successfully mapped: ${mappedCount}`);
    console.log(`Success rate: ${Math.round((mappedCount / guestKeys.length) * 100)}%`);

    const highConfidence = mappingResults.filter(r => r.confidence === 'HIGH');
    console.log(`High confidence matches: ${highConfidence.length}`);
    console.log(`Medium confidence matches: ${mappingResults.length - highConfidence.length}`);

    // Group by booking
    const keysByBooking = mappingResults.reduce((acc, mapping) => {
      const bookingId = mapping.booking.id;
      if (!acc[bookingId]) {
        acc[bookingId] = {
          booking: mapping.booking,
          keys: []
        };
      }
      acc[bookingId].keys.push(mapping);
      return acc;
    }, {});

    console.log(`\n🏠 BOOKINGS WITH MAPPED KEYS: ${Object.keys(keysByBooking).length}`);

    // Show summary of bookings with multiple keys
    Object.entries(keysByBooking).forEach(([bookingId, data]) => {
      if (data.keys.length > 1) {
        console.log(`\n📋 ${bookingId} - ${data.booking.guestName} (${data.booking.propertyName})`);
        console.log(`   ${data.keys.length} keys:`);
        data.keys.forEach(k => {
          console.log(`   - ${k.nukiKey.name} (${k.nukiKey.device}) [${k.keyType}] ${k.nukiKey.isActive ? '✅' : '❌'}`);
        });
      }
    });

    return {
      mappingResults,
      keysByBooking,
      stats: {
        totalGuestKeys: guestKeys.length,
        mappedKeys: mappedCount,
        successRate: Math.round((mappedCount / guestKeys.length) * 100),
        highConfidenceMatches: highConfidence.length,
        bookingsWithKeys: Object.keys(keysByBooking).length
      }
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mapAllNukiKeysToReservations().then(result => {
  if (result) {
    console.log('\n🎉 MAPPING COMPLETE!');
    console.log(`Found ${result.stats.bookingsWithKeys} bookings with existing NUKI keys`);
  }
});