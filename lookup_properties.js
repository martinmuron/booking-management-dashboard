// Get the mapping between Ž-codes and HostAway property names
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

async function lookupProperty(hostawayId) {
  try {
    const response = await fetch(`https://booking-management-dashboard-247uruy7m-future-developments.vercel.app/api/bookings/${hostawayId}`);
    const data = await response.json();

    if (data.propertyName) {
      return data.propertyName;
    } else {
      return "Not found";
    }
  } catch (error) {
    return "Error: " + error.message;
  }
}

async function main() {
  console.log("Internal Code -> HostAway Property Name");
  console.log("=====================================");

  for (const mapping of propertyMappings) {
    const propertyName = await lookupProperty(mapping.hostawayId);
    console.log(`${mapping.code} -> ${propertyName}`);

    // Add small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

main().catch(console.error);