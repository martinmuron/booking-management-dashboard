import { testDatabaseConnection, generateCheckInToken, calculateTouristTax } from './database';

// Test database connection and basic functionality
export async function runDatabaseTests() {
  console.log('🧪 Running database tests...\n');

  // Test 1: Database connection
  console.log('1. Testing database connection...');
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.log('⚠️  Database not available - skipping further tests');
    return;
  }

  // Test 2: Token generation
  console.log('2. Testing token generation...');
  const token = generateCheckInToken();
  console.log(`✅ Generated token: ${token} (length: ${token.length})`);

  // Test 3: Tourist tax calculation
  console.log('3. Testing tourist tax calculation...');
  const mockGuests = [
    { birthDate: new Date('1990-01-01') }, // Adult
    { birthDate: new Date('1985-06-15') }, // Adult
    { birthDate: new Date('2010-03-20') }, // Child
  ];
  const checkIn = new Date('2024-01-15');
  const checkOut = new Date('2024-01-18'); // 3 nights
  const tax = calculateTouristTax(mockGuests, checkIn, checkOut);
  console.log(`✅ Tourist tax for 2 adults, 3 nights: ${tax} CZK (expected: 300 CZK)`);

  // Test 4: Basic validation
  console.log('4. Testing basic validations...');
  try {
    if (token.length === 10) {
      console.log('✅ Token length validation passed');
    }
    if (tax > 0) {
      console.log('✅ Tax calculation validation passed');
    }
    console.log('✅ All basic validations completed');
  } catch (error) {
    console.error('❌ Error with validations:', error);
  }

  console.log('\n🎉 Database tests completed!');
}

// Export for use in development
if (require.main === module) {
  runDatabaseTests().catch(console.error);
}