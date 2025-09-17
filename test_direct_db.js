// Test direct database access to virtual keys
async function testDirectDB() {
  console.log('🔍 Testing database schema...');

  try {
    // Check if we can insert directly via API
    const response = await fetch('https://www.nickandjenny.cz/api/virtual-keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bookingId: 'BK_45799790',
        roomNumber: 'Prokopova 9'
      })
    });

    const text = await response.text();
    console.log('Virtual keys API response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('❌ Failed to parse JSON response');
      return;
    }

    if (data.success) {
      console.log('✅ Successfully created virtual keys!');
      console.log('Keys created:', data.data.keys.length);
      console.log('Universal code:', data.data.universalKeypadCode);
    } else {
      console.log('❌ Virtual key creation failed:', data.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDirectDB();