// Simple debug test to check what's happening
const request = require('supertest');
const app = require('./dist/index.js').default;

async function debugTest() {
  console.log('Starting debug test...');
  
  const testUser = {
    email: `debug-${Date.now()}@example.com`,
    password: 'testpassword123',
    first_name: 'Debug',
    last_name: 'User',
  };

  console.log('Registering user:', testUser.email);
  
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send(testUser);

  console.log('Register response status:', registerResponse.status);
  console.log('Register response body:', JSON.stringify(registerResponse.body, null, 2));
  
  if (registerResponse.status === 201) {
    const userId = registerResponse.body.user.id;
    console.log('User ID:', userId);
    
    // Try to find tokens
    const { EmailVerificationTokenModel } = require('./dist/models/EmailVerificationToken.js');
    const tokens = await EmailVerificationTokenModel.findByUserId(userId);
    console.log('Found tokens:', tokens);
  }
}

debugTest().catch(console.error);