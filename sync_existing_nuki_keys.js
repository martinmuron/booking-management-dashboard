// Sync existing NUKI keys to database virtual keys table
const API_BASE = 'https://www.nickandjenny.cz';

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return [];
  }
}

async function syncExistingKeys() {
  console.log('🔄 SYNCING EXISTING NUKI KEYS TO DATABASE');
  console.log('=' .repeat(50));

  // Fetch all NUKI keys
  console.log('\n📋 Fetching NUKI keys...');
  const nukiKeys = await fetchJson(`${API_BASE}/api/nuki/keys`);
  console.log(`Found ${nukiKeys.length} NUKI keys`);

  // Fetch all bookings from our database
  console.log('\n📋 Fetching bookings...');
  const bookings = await fetchJson(`${API_BASE}/api/bookings`);
  console.log(`Found ${bookings.length} bookings in database`);

  console.log('\n🎯 MAPPING AND SYNCING KEYS');
  console.log('-'.repeat(80));

  const syncResults = [];
  let syncedCount = 0;

  // Only process guest keys (time-limited, not permanent staff keys)
  const guestKeys = nukiKeys.filter(key =>
    key.allowedFromDate && key.allowedUntilDate &&
    key.typeName === 'Authorization' &&
    key.name && !key.name.toLowerCase().includes('nuki') &&
    !key.name.toLowerCase().includes('nick') &&
    !key.name.toLowerCase().includes('jenny') &&
    !key.name.toLowerCase().includes('cleaners') &&
    !key.name.toLowerCase().includes('builders') &&
    !key.name.toLowerCase().includes('management')
  );

  console.log(`Processing ${guestKeys.length} guest keys...`);

  for (const key of guestKeys) {
    const keyFrom = new Date(key.allowedFromDate);
    const keyUntil = new Date(key.allowedUntilDate);

    // Find potential matching bookings by date range and property
    const potentialBookings = bookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);

      // Check if dates overlap (allowing for some flexibility)
      const dateTolerance = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      const dateMatch = Math.abs(keyFrom.getTime() - checkIn.getTime()) <= dateTolerance &&
                       Math.abs(keyUntil.getTime() - checkOut.getTime()) <= dateTolerance;

      // Check property match
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
        (key.deviceName === 'Řehořova' && booking.propertyName === 'Řehořova');

      return dateMatch && propertyMatch;
    });

    if (potentialBookings.length > 0) {
      // Try to match by guest name similarity
      const bestMatch = potentialBookings.reduce((best, booking) => {
        const keyNameLower = key.name.toLowerCase();
        const guestNameLower = booking.guestLeaderName.toLowerCase();

        // Simple name matching (first name or last name)
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

        if (!best || similarity > best.similarity) {
          return { booking, similarity };
        }
        return best;
      }, null);

      if (bestMatch && bestMatch.similarity > 0) {
        // Determine key type based on device
        let keyType = 'ROOM';
        if (key.deviceName === 'Main Door') keyType = 'MAIN_ENTRANCE';
        else if (key.deviceName === 'Laundry') keyType = 'LAUNDRY_ROOM';
        else if (key.deviceName === 'Luggage') keyType = 'LUGGAGE_ROOM';
        else if (key.deviceName === 'Borivojova Entry door') keyType = 'MAIN_ENTRANCE';
        else if (key.deviceName === 'Řehořova') keyType = 'MAIN_ENTRANCE';

        const syncData = {
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
            id: bestMatch.booking.id,
            guestName: bestMatch.booking.guestLeaderName,
            propertyName: bestMatch.booking.propertyName,
            checkIn: bestMatch.booking.checkInDate,
            checkOut: bestMatch.booking.checkOutDate
          },
          keyType: keyType,
          similarity: bestMatch.similarity
        };

        syncResults.push(syncData);
        syncedCount++;

        console.log(`✅ ${syncedCount}: ${key.name} (${key.deviceName}) → ${bestMatch.booking.guestLeaderName} (${bestMatch.booking.propertyName})`);
      }
    }
  }

  console.log(`\n📊 SYNC SUMMARY`);
  console.log(`Total guest keys: ${guestKeys.length}`);
  console.log(`Successfully mapped: ${syncedCount}`);
  console.log(`Mapping success rate: ${Math.round((syncedCount / guestKeys.length) * 100)}%`);

  // Now create virtual key records in database
  console.log(`\n💾 CREATING DATABASE RECORDS`);
  console.log('-'.repeat(50));

  let dbSyncCount = 0;
  for (const result of syncResults) {
    try {
      // Create virtual key record
      const response = await fetch(`${API_BASE}/api/virtual-keys/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: result.booking.id,
          nukiKeyId: result.nukiKey.id,
          keyType: result.keyType,
          isActive: result.nukiKey.isActive
        })
      });

      if (response.ok) {
        dbSyncCount++;
        console.log(`✅ DB Sync ${dbSyncCount}: ${result.booking.id} → ${result.nukiKey.id}`);
      } else {
        console.log(`❌ DB Sync failed: ${result.booking.id} → ${result.nukiKey.id}`);
      }
    } catch (error) {
      console.log(`❌ DB Sync error: ${result.booking.id} → ${error.message}`);
    }

    // Small delay to avoid overwhelming API
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n🎉 FINAL RESULTS`);
  console.log(`Mapped keys: ${syncedCount}`);
  console.log(`Database records created: ${dbSyncCount}`);

  return { syncedCount, dbSyncCount, results: syncResults };
}

syncExistingKeys().catch(console.error);