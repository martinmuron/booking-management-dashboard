// Complete mapping for all 27 properties (25 Z + 2 named)
const allProperties = [
  { code: "Bořivojova 50", hostawayId: "28082673" },
  { code: "Řehořova", hostawayId: "27860569" },
  { code: "Ž001", hostawayId: "27861205" },
  { code: "Ž004", hostawayId: "27861563" },
  { code: "Ž101", hostawayId: "27861383" },
  { code: "Ž102", hostawayId: "27860442" },
  { code: "Ž103", hostawayId: "27861311" },
  { code: "Ž104", hostawayId: "27861313" },
  { code: "Ž201", hostawayId: "27860768" },
  { code: "Ž202", hostawayId: "27861458" },
  { code: "Ž203", hostawayId: "27861619" },
  { code: "Ž204", hostawayId: "27861385" },
  { code: "Ž301", hostawayId: "27860541" },
  { code: "Ž302", hostawayId: "27860733" },
  { code: "Ž303", hostawayId: "27861360" },
  { code: "Ž304", hostawayId: "27860866" },
  { code: "Ž401", hostawayId: "27861210" },
  { code: "Ž402", hostawayId: "27860750" },
  { code: "Ž403", hostawayId: "27861100" },
  { code: "Ž404", hostawayId: "27861993" },
  { code: "Ž501", hostawayId: "27861585" },
  { code: "Ž502", hostawayId: "27860795" },
  { code: "Ž503", hostawayId: "27861768" },
  { code: "Ž504", hostawayId: "27861254" },
  { code: "Ž601", hostawayId: "27860661" },
  { code: "Ž602", hostawayId: "28079598" },
  { code: "Ž604", hostawayId: "27860677" }
];

// Load HostAway properties for lookup
let hostawayProperties = {};

async function loadHostAwayProperties() {
  try {
    const response = await fetch('https://booking-management-dashboard-247uruy7m-future-developments.vercel.app/api/properties');
    const data = await response.json();

    if (data.success) {
      data.data.forEach(property => {
        hostawayProperties[property.id] = property.name;
      });
    }
  } catch (error) {
    console.error('Failed to load HostAway properties:', error.message);
  }
}

async function getListingIdFromReservation(reservationId) {
  try {
    const response = await fetch(`https://booking-management-dashboard-247uruy7m-future-developments.vercel.app/api/hostaway/reservation/${reservationId}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();

    if (data.success && data.data.listingMapId) {
      return data.data.listingMapId;
    }
    return null;
  } catch (error) {
    console.error(`Error looking up reservation ${reservationId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("🔍 COMPLETE PROPERTY MAPPING - ALL 27 PROPERTIES");
  console.log("=".repeat(60));
  console.log("Loading HostAway properties...");
  await loadHostAwayProperties();

  console.log(`\n📋 Mapping ${allProperties.length} properties...\n`);

  const results = [];
  let successCount = 0;

  for (let i = 0; i < allProperties.length; i++) {
    const mapping = allProperties[i];
    const progress = `[${i + 1}/${allProperties.length}]`;

    process.stdout.write(`${progress} ${mapping.code} -> `);

    const listingId = await getListingIdFromReservation(mapping.hostawayId);

    if (listingId && hostawayProperties[listingId]) {
      const hostawayName = hostawayProperties[listingId];
      console.log(`✅ ${hostawayName} (ID: ${listingId})`);
      results.push({
        internal: mapping.code,
        hostaway: hostawayName,
        hostawayId: listingId,
        found: true
      });
      successCount++;
    } else {
      console.log(`❌ NOT FOUND`);
      results.push({
        internal: mapping.code,
        hostaway: "NOT FOUND",
        hostawayId: listingId || "N/A",
        found: false
      });
    }

    // Small delay to avoid overwhelming API
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 FINAL RESULTS");
  console.log("=".repeat(60));
  console.log(`✅ Successfully mapped: ${successCount}/${allProperties.length} properties`);
  console.log(`❌ Not found: ${allProperties.length - successCount} properties`);

  if (successCount < allProperties.length) {
    console.log("\n❌ Missing properties:");
    results.filter(r => !r.found).forEach(r => {
      console.log(`   - ${r.internal}`);
    });
  }

  console.log("\n📋 COMPLETE MAPPING TABLE:");
  console.log("-".repeat(80));
  console.log("Internal Code".padEnd(15) + "HostAway Property Name".padEnd(50) + "HostAway ID");
  console.log("-".repeat(80));

  results.forEach(r => {
    if (r.found) {
      console.log(r.internal.padEnd(15) + r.hostaway.padEnd(50) + r.hostawayId);
    }
  });

  return results;
}

main().catch(console.error);