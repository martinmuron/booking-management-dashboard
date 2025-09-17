// Check access code assignments vs authorized properties
const authorizedProperties = [
  "Bořivojova 50", "Řehořova", "Ž001", "Ž004", "Ž101", "Ž102", "Ž103", "Ž104",
  "Ž201", "Ž202", "Ž203", "Ž204", "Ž301", "Ž302", "Ž303", "Ž304",
  "Ž401", "Ž402", "Ž403", "Ž404", "Ž501", "Ž502", "Ž503", "Ž504",
  "Ž601", "Ž602", "Ž604"
];

async function checkAccessCodeAssignments() {
  try {
    const response = await fetch('https://booking-management-dashboard-247uruy7m-future-developments.vercel.app/api/bookings');
    const data = await response.json();

    if (!data.success || !data.data) {
      console.error('Failed to fetch bookings');
      return;
    }

    const bookings = data.data;
    const propertyAccessCodes = {};

    // Group bookings by property and check access codes
    bookings.forEach(booking => {
      const property = booking.propertyName;
      const hasAccessCode = booking.universalKeypadCode !== null && booking.universalKeypadCode !== "";

      if (!propertyAccessCodes[property]) {
        propertyAccessCodes[property] = {
          hasAccessCode: hasAccessCode,
          isAuthorized: authorizedProperties.includes(property),
          sampleCode: hasAccessCode ? booking.universalKeypadCode : null
        };
      }
    });

    console.log("🔐 ACCESS CODE ANALYSIS");
    console.log("=".repeat(50));

    // Check for unauthorized properties with access codes (BAD)
    const unauthorizedWithCodes = Object.entries(propertyAccessCodes)
      .filter(([property, info]) => !info.isAuthorized && info.hasAccessCode);

    if (unauthorizedWithCodes.length > 0) {
      console.log("\n❌ PROBLEM: Unauthorized properties have access codes:");
      unauthorizedWithCodes.forEach(([property, info]) => {
        console.log(`   - ${property} (Code: ${info.sampleCode})`);
      });
    }

    // Check for authorized properties without access codes (BAD)
    const authorizedWithoutCodes = Object.entries(propertyAccessCodes)
      .filter(([property, info]) => info.isAuthorized && !info.hasAccessCode);

    if (authorizedWithoutCodes.length > 0) {
      console.log("\n❌ PROBLEM: Authorized properties missing access codes:");
      authorizedWithoutCodes.forEach(([property, info]) => {
        console.log(`   - ${property}`);
      });
    }

    // Check for authorized properties with access codes (GOOD)
    const authorizedWithCodes = Object.entries(propertyAccessCodes)
      .filter(([property, info]) => info.isAuthorized && info.hasAccessCode);

    console.log(`\n✅ CORRECT: Authorized properties with access codes (${authorizedWithCodes.length}/27):`);
    authorizedWithCodes.forEach(([property, info]) => {
      console.log(`   - ${property}`);
    });

    // Check for unauthorized properties without access codes (GOOD)
    const unauthorizedWithoutCodes = Object.entries(propertyAccessCodes)
      .filter(([property, info]) => !info.isAuthorized && !info.hasAccessCode);

    console.log(`\n✅ CORRECT: Unauthorized properties without access codes (${unauthorizedWithoutCodes.length} properties):`);
    if (unauthorizedWithoutCodes.length <= 10) {
      unauthorizedWithoutCodes.forEach(([property, info]) => {
        console.log(`   - ${property}`);
      });
    } else {
      unauthorizedWithoutCodes.slice(0, 5).forEach(([property, info]) => {
        console.log(`   - ${property}`);
      });
      console.log(`   ... and ${unauthorizedWithoutCodes.length - 5} more`);
    }

    console.log("\n" + "=".repeat(50));
    console.log("📊 SUMMARY:");
    console.log(`✅ Authorized properties with codes: ${authorizedWithCodes.length}/27`);
    console.log(`❌ Authorized properties missing codes: ${authorizedWithoutCodes.length}/27`);
    console.log(`❌ Unauthorized properties with codes: ${unauthorizedWithCodes.length}`);
    console.log(`✅ Unauthorized properties without codes: ${unauthorizedWithoutCodes.length}`);

    const totalIssues = unauthorizedWithCodes.length + authorizedWithoutCodes.length;
    if (totalIssues === 0) {
      console.log("\n🎉 PERFECT! All access codes are correctly assigned!");
    } else {
      console.log(`\n⚠️  Found ${totalIssues} issues that need fixing.`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkAccessCodeAssignments();