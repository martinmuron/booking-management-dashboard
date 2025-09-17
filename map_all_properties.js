// Complete mapping script for all 28 properties
const propertyMappings = [
  { code: "Bořivojova 50", hostawayId: "28082673" },
  { code: "Řehořova", hostawayId: "27860569" },
  { code: "Ž101", hostawayId: "27861383" },
  { code: "Ž103", hostawayId: "27861311" },
  { code: "Ž104", hostawayId: "27861313" },
  { code: "Ž201", hostawayId: "27860768" },
  { code: "Ž202", hostawayId: "27861458" },
  { code: "Ž203", hostawayId: "27861619" },
  { code: "Ž204", hostawayId: "27861385" },
  { code: "Ž301", hostawayId: "27860541" },
  { code: "Ž302", hostawayId: "27860733" },
  { code: "Ž303", hostawayId: "27861360" },
  { code: "Ž402", hostawayId: "27860750" },
  { code: "Ž501", hostawayId: "27861585" },
  { code: "Ž502", hostawayId: "27860795" },
  { code: "Ž503", hostawayId: "27861768" }
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
  console.log("Loading HostAway properties...");
  await loadHostAwayProperties();

  console.log("\n=== PROPERTY MAPPING RESULTS ===");
  console.log("Internal Code -> HostAway Property Name (HostAway ID)");
  console.log("================================================");

  const results = [];

  for (const mapping of propertyMappings) {
    const listingId = await getListingIdFromReservation(mapping.hostawayId);

    if (listingId && hostawayProperties[listingId]) {
      const hostawayName = hostawayProperties[listingId];
      console.log(`${mapping.code} -> ${hostawayName} (${listingId})`);
      results.push({
        internal: mapping.code,
        hostaway: hostawayName,
        hostawayId: listingId,
        found: true
      });
    } else {
      console.log(`${mapping.code} -> NOT FOUND (reservation ${mapping.hostawayId})`);
      results.push({
        internal: mapping.code,
        hostaway: "NOT FOUND",
        hostawayId: listingId || "N/A",
        found: false
      });
    }

    // Small delay to avoid overwhelming API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log("\n=== SUMMARY ===");
  const found = results.filter(r => r.found).length;
  const total = results.length;
  console.log(`Found: ${found}/${total} properties`);

  if (found < total) {
    console.log("\nMissing properties:");
    results.filter(r => !r.found).forEach(r => {
      console.log(`- ${r.internal}`);
    });
  }

  return results;
}

main().catch(console.error);