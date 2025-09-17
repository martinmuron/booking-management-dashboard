// Test syncing a single virtual key for Ž103 booking
async function testSingleSync() {
  console.log('🧪 Testing single virtual key sync for Ž103...');

  const bookingId = 'BK_45799790'; // Ž103 booking
  const nukiKeyId = '68c3695489e3a04d6b7b984a'; // Oscar Canon key

  try {
    const response = await fetch('https://www.nickandjenny.cz/api/virtual-keys/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookingId: bookingId,
        nukiKeyId: nukiKeyId,
        keyType: 'ROOM',
        isActive: true
      })
    });

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Successfully synced virtual key!');

      // Now check if the booking shows the virtual key
      console.log('\n🔍 Checking booking data...');
      const bookingResponse = await fetch(`https://www.nickandjenny.cz/api/bookings/${bookingId}`);
      const bookingData = await bookingResponse.json();

      if (bookingData.success) {
        console.log('Virtual keys found:', bookingData.data.virtualKeys.length);
        console.log('Virtual keys:', JSON.stringify(bookingData.data.virtualKeys, null, 2));
      }
    } else {
      console.log('❌ Sync failed:', data.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSingleSync();