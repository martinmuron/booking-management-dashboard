import { NextResponse } from 'next/server';
import { hostAwayService, type HostAwayReservation, type HostAwayCustomField } from '@/services/hostaway.service';

export async function GET() {
  try {
    console.log('🔍 Checking HostAway custom field data...');

    // Get recent reservations
    const reservationsResponse = await hostAwayService.getReservations({
      limit: 3,
      offset: 0
    });

    const reservations: HostAwayReservation[] = Array.isArray(reservationsResponse)
      ? reservationsResponse
      : reservationsResponse.data || [];

    console.log(`📋 Found ${reservations.length} reservations`);

    const results = [];

    for (const reservation of reservations) {
      console.log(`\n🎯 Checking reservation ${reservation.id} - ${reservation.guestName || reservation.guestFirstName + ' ' + reservation.guestLastName}`);

      // Get full reservation details with custom fields
      const fullReservation = await hostAwayService.getReservationById(reservation.id);

      const result: {
        reservationId: number;
        guestName: string;
        customFieldValues: HostAwayCustomField[];
        nickJennyField: HostAwayCustomField | null;
      } = {
        reservationId: reservation.id,
        guestName: reservation.guestName || `${reservation.guestFirstName} ${reservation.guestLastName}`,
        customFieldValues: fullReservation?.customFieldValues || [],
        nickJennyField: null
      };

      const customFieldValues = fullReservation?.customFieldValues;
      if (customFieldValues) {
        console.log('📋 Custom fields found:', customFieldValues.length);

        // Look for field 81717 (Nick Jenny field)
        const nickJennyField = customFieldValues.find((field: HostAwayCustomField) =>
          field.customFieldId === 81717 || field.id === 81717
        );

        if (nickJennyField) {
          console.log('🎯 FOUND NICK JENNY FIELD 81717:');
          console.log('   Value:', JSON.stringify(nickJennyField.value));
          console.log('   Full field:', JSON.stringify(nickJennyField, null, 2));
          result.nickJennyField = nickJennyField;
        } else {
          console.log('❌ Nick Jenny field 81717 not found');
        }

        // Show all custom fields for debugging
        console.log('📋 All custom fields:');
        customFieldValues.forEach((field: HostAwayCustomField) => {
          console.log(`   Field ${field.customFieldId || field.id}: "${field.value}"`);
        });
      } else {
        console.log('❌ No custom field values found');
      }

      results.push(result);
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Custom field analysis complete'
    });

  } catch (error) {
    console.error('❌ Error checking custom fields:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Failed to check custom fields'
    }, { status: 500 });
  }
}
