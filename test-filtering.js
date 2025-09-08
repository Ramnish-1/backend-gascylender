// Test script to verify token-based filtering
const jwt = require('jsonwebtoken');

// Test tokens (you'll need to replace these with actual tokens from your system)
const testTokens = {
  customer1: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Ankit's token
  customer2: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Ramnish's token
  admin: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'      // Admin token
};

console.log('🧪 Testing Token-Based Filtering');
console.log('================================');

// Test function to decode tokens
const testToken = (tokenName, token) => {
  try {
    const decoded = jwt.decode(token);
    console.log(`\n${tokenName}:`);
    console.log('  User ID:', decoded?.userId);
    console.log('  Email:', decoded?.email);
    console.log('  Role:', decoded?.role);
    console.log('  Delivery Agent ID:', decoded?.deliveryAgentId);
  } catch (error) {
    console.log(`\n${tokenName}: Invalid token`);
  }
};

// Test all tokens
Object.entries(testTokens).forEach(([name, token]) => {
  testToken(name, token);
});

console.log('\n📋 Expected Behavior:');
console.log('====================');
console.log('• Customer 1 (Ankit): Should only see orders with customerEmail = ankit@example.com');
console.log('• Customer 2 (Ramnish): Should only see orders with customerEmail = ramnish@example.com');
console.log('• Admin: Should see all orders (no filtering)');

console.log('\n🔍 To test:');
console.log('1. Get tokens from login API');
console.log('2. Call GET /api/orders with each token');
console.log('3. Check console logs for filtering debug info');
console.log('4. Verify only relevant orders are returned');
