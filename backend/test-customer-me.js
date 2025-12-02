/**
 * Test script for /store/customers/me endpoint
 * This script tests the authentication flow:
 * 1. Login to get a session
 * 2. Use the session to access /store/customers/me
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:9000';
const EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'password123';

async function testCustomerMeEndpoint() {
  console.log('🧪 Testing /store/customers/me endpoint...\n');
  
  try {
    // Step 1: Get publishable API key
    console.log('1️⃣ Getting publishable API key...');
    const keyResponse = await fetch(`${BASE_URL}/api/key-exchange`, {
      method: 'GET',
      credentials: 'include'
    });
    
    if (!keyResponse.ok) {
      throw new Error(`Failed to get API key: ${keyResponse.status} ${keyResponse.statusText}`);
    }
    
    const keyData = await keyResponse.json();
    const apiKey = keyData.publishable_api_key;
    console.log('✅ API Key obtained:', apiKey.substring(0, 20) + '...\n');
    
    // Step 2: Login
    console.log('2️⃣ Logging in...');
    console.log('Email:', EMAIL);
    
    const loginResponse = await fetch(`${BASE_URL}/store/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': apiKey
      },
      credentials: 'include',
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });
    
    if (!loginResponse.ok) {
      const errorData = await loginResponse.json();
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(errorData)}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful:', loginData);
    
    // Extract cookies from login response
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('🍪 Session cookies:', cookies ? 'Set' : 'NOT SET');
    
    if (!cookies) {
      console.warn('⚠️  Warning: No cookies were set during login. This might cause authentication issues.\n');
    } else {
      console.log('🍪 Cookies:', cookies.substring(0, 100) + '...\n');
    }
    
    // Step 3: Test /store/auth/me first (simpler endpoint)
    console.log('3️⃣ Testing /store/auth/me...');
    const authMeResponse = await fetch(`${BASE_URL}/store/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': apiKey,
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });
    
    console.log('Status:', authMeResponse.status, authMeResponse.statusText);
    
    if (!authMeResponse.ok) {
      const errorData = await authMeResponse.json();
      console.error('❌ /store/auth/me failed:', errorData);
    } else {
      const authData = await authMeResponse.json();
      console.log('✅ /store/auth/me successful:', authData, '\n');
    }
    
    // Step 4: Test /store/customers/me
    console.log('4️⃣ Testing /store/customers/me...');
    const customerMeResponse = await fetch(`${BASE_URL}/store/customers/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': apiKey,
        ...(cookies && { 'Cookie': cookies })
      },
      credentials: 'include'
    });
    
    console.log('Status:', customerMeResponse.status, customerMeResponse.statusText);
    
    if (!customerMeResponse.ok) {
      const errorData = await customerMeResponse.json();
      console.error('❌ /store/customers/me failed:', errorData);
      
      // Additional debugging
      console.log('\n📋 Debugging Information:');
      console.log('- Make sure the backend is running on:', BASE_URL);
      console.log('- Make sure you have a user with email:', EMAIL);
      console.log('- Check if cookies are enabled and being sent');
      console.log('- Check CORS settings in medusa-config.js');
      console.log('- Check session configuration');
    } else {
      const customerData = await customerMeResponse.json();
      console.log('✅ /store/customers/me successful!');
      console.log('Customer data:', JSON.stringify(customerData, null, 2));
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testCustomerMeEndpoint();

