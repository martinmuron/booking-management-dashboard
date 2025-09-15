const { hostAwayService } = require('./src/services/hostaway.service.ts');

async function checkCustomFields() {
  try {
    console.log('🔍 Checking HostAway custom field data...');

    // Get recent reservations
    const reservationsResponse = await hostAwayService.getReservations({
      limit: 3,
      offset: 0
    });

    const reservations = Array.isArray(reservationsResponse)
      ? reservationsResponse
      : reservationsResponse.data || reservationsResponse.result || [];

    console.log(`📋 Found ${reservations.length} reservations`);

    for (const reservation of reservations) {
      console.log(`\n🎯 Reservation ${reservation.id} - ${reservation.guestName || reservation.guestFirstName + ' ' + reservation.guestLastName}`);

      // Get full reservation details with custom fields
      const fullReservation = await hostAwayService.getReservationById(reservation.id);

      if (fullReservation && fullReservation.customFieldValues) {
        console.log('📋 Custom fields found:', fullReservation.customFieldValues.length);

        // Look for field 81717 (Nick Jenny field)
        const nickJennyField = fullReservation.customFieldValues.find(field =>
          field.customFieldId === 81717 || field.id === 81717
        );

        if (nickJennyField) {
          console.log('🎯 FOUND NICK JENNY FIELD 81717:');
          console.log('   Value:', JSON.stringify(nickJennyField.value));
          console.log('   Full field:', JSON.stringify(nickJennyField, null, 2));
        } else {
          console.log('❌ Nick Jenny field 81717 not found');
        }

        // Show all custom fields for debugging
        console.log('📋 All custom fields:');
        fullReservation.customFieldValues.forEach(field => {
          console.log(`   Field ${field.customFieldId || field.id}: "${field.value}"`);
        });
      } else {
        console.log('❌ No custom field values found');
      }
    }

  } catch (error) {
    console.error('❌ Error checking custom fields:', error);
  }
}

checkCustomFields();