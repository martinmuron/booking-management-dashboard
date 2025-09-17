// Map all existing NUKI keys to reservations in our database

const API_BASE = 'https://booking-management-dashboard-pa9cr4pzj-future-developments.vercel.app';

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

async function main() {
  console.log('🔍 MAPPING NUKI KEYS TO RESERVATIONS');
  console.log('=' .repeat(50));

  // Fetch all NUKI keys
  console.log('\n📋 Fetching NUKI keys...');
  const nukiKeys = await fetchJson(`${API_BASE}/api/nuki/keys`);
  console.log(`Found ${nukiKeys.length} NUKI keys`);

  // Fetch all bookings from our database
  console.log('\n📋 Fetching bookings...');
  const bookings = await fetchJson(`${API_BASE}/api/bookings`);
  console.log(`Found ${bookings.length} bookings in database`);

  console.log('\n🔗 ANALYZING KEY PATTERNS');
  console.log('-'.repeat(80));

  // Group keys by device/property
  const keysByDevice = {};
  nukiKeys.forEach(key => {
    const device = key.deviceName;
    if (!keysByDevice[device]) {
      keysByDevice[device] = [];
    }
    keysByDevice[device].push(key);
  });

  // Analyze each device
  for (const [deviceName, keys] of Object.entries(keysByDevice)) {
    console.log(`\n📍 ${deviceName}`);
    console.log(`   Total keys: ${keys.length}`);

    // Count by type
    const keyTypes = {};
    keys.forEach(key => {
      const type = key.typeName || 'Unknown';
      keyTypes[type] = (keyTypes[type] || 0) + 1;
    });

    console.log(`   Key types: ${Object.entries(keyTypes).map(([type, count]) => `${type}(${count})`).join(', ')}`);

    // Find guest keys (time-limited ones)
    const guestKeys = keys.filter(key =>
      key.allowedFromDate && key.allowedUntilDate &&
      key.typeName === 'Authorization' &&
      key.name && !key.name.toLowerCase().includes('nuki') &&
      !key.name.toLowerCase().includes('nick') &&
      !key.name.toLowerCase().includes('jenny') &&
      !key.name.toLowerCase().includes('cleaners') &&
      !key.name.toLowerCase().includes('builders') &&
      !key.name.toLowerCase().includes('management')
    );

    console.log(`   Guest keys: ${guestKeys.length}`);

    if (guestKeys.length > 0) {
      console.log('   Recent guest keys:');
      guestKeys.slice(-5).forEach(key => {
        const from = key.allowedFromDate ? new Date(key.allowedFromDate).toISOString().split('T')[0] : 'N/A';
        const until = key.allowedUntilDate ? new Date(key.allowedUntilDate).toISOString().split('T')[0] : 'N/A';
        console.log(`     - ${key.name} (${from} to ${until}) ${key.isActive ? '✅' : '❌'}`);
      });
    }
  }

  console.log('\n🎯 MAPPING ANALYSIS');
  console.log('=' .repeat(50));

  // Try to match keys to bookings
  const mappingResults = [];
  let potentialMatches = 0;

  nukiKeys.forEach(key => {
    // Skip permanent keys (staff, management, etc.)
    if (!key.allowedFromDate || !key.allowedUntilDate) {
      return;
    }

    if (key.name && (
      key.name.toLowerCase().includes('nuki') ||
      key.name.toLowerCase().includes('nick') ||
      key.name.toLowerCase().includes('jenny') ||
      key.name.toLowerCase().includes('cleaners') ||
      key.name.toLowerCase().includes('builders') ||
      key.name.toLowerCase().includes('management')
    )) {
      return;
    }

    const keyFrom = new Date(key.allowedFromDate);
    const keyUntil = new Date(key.allowedUntilDate);

    // Find potential matching bookings by date range
    const potentialBookings = bookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);

      // Check if dates overlap (allowing for some flexibility)
      const dateTolerance = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
      return Math.abs(keyFrom.getTime() - checkIn.getTime()) <= dateTolerance &&
             Math.abs(keyUntil.getTime() - checkOut.getTime()) <= dateTolerance;
    });

    if (potentialBookings.length > 0) {
      potentialMatches++;

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

      mappingResults.push({
        nukiKey: {
          id: key.id,
          name: key.name,
          device: key.deviceName,
          type: key.typeName,
          from: key.allowedFromDate,
          until: key.allowedUntilDate,
          isActive: key.isActive
        },
        potentialBooking: bestMatch ? {
          id: bestMatch.booking.id,
          guestName: bestMatch.booking.guestLeaderName,
          propertyName: bestMatch.booking.propertyName,
          checkIn: bestMatch.booking.checkInDate,
          checkOut: bestMatch.booking.checkOutDate,
          similarity: bestMatch.similarity
        } : null,
        confidence: bestMatch && bestMatch.similarity > 0 ? 'HIGH' : 'LOW'
      });
    }
  });

  console.log(`\n📊 SUMMARY`);
  console.log(`Total NUKI keys: ${nukiKeys.length}`);
  console.log(`Guest keys with time limits: ${potentialMatches}`);
  console.log(`Potential booking matches: ${mappingResults.length}`);

  const highConfidenceMatches = mappingResults.filter(r => r.confidence === 'HIGH');
  console.log(`High confidence matches: ${highConfidenceMatches.length}`);

  console.log('\n🎯 HIGH CONFIDENCE MATCHES:');
  console.log('-'.repeat(80));
  highConfidenceMatches.forEach((match, index) => {
    console.log(`${index + 1}. NUKI Key: "${match.nukiKey.name}" on ${match.nukiKey.device}`);
    console.log(`   Booking: ${match.potentialBooking.guestName} at ${match.potentialBooking.propertyName}`);
    console.log(`   Dates: ${match.nukiKey.from.split('T')[0]} to ${match.nukiKey.until.split('T')[0]}`);
    console.log(`   Status: ${match.nukiKey.isActive ? 'Active' : 'Inactive'}`);
    console.log('');
  });

  console.log('\n📋 DEVICE BREAKDOWN:');
  console.log('-'.repeat(50));
  Object.entries(keysByDevice).forEach(([device, keys]) => {
    const guestKeys = keys.filter(k => k.allowedFromDate && k.allowedUntilDate &&
      !k.name?.toLowerCase().includes('nuki') &&
      !k.name?.toLowerCase().includes('nick') &&
      !k.name?.toLowerCase().includes('jenny') &&
      !k.name?.toLowerCase().includes('cleaners') &&
      !k.name?.toLowerCase().includes('builders'));

    console.log(`${device}: ${guestKeys.length} guest keys / ${keys.length} total`);
  });

  return mappingResults;
}

main().catch(console.error);