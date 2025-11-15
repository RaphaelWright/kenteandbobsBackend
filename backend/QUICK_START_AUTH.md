# Quick Start - Authentication

## Start the Server

```bash
cd backend
pnpm dev
```

Cannot POST /store/auth/register## ⚠️ Important: Get Your Publishable API Key

**All store endpoints require a publishable API key!**

### Get the API Key:
```bash
curl http://localhost:9000/api/key-exchange
# or for production:
curl https://kenteandbobsbackend-production.up.railway.app/api/key-exchange
```

This will return:
```json
{"publishableApiKey": "pk_xxxxxxxxxxxxx"}
```

**Copy this key** and include it in the `x-publishable-api-key` header for all requests below.

## Test Authentication (using curl)

### 1. Register a new user
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 2. Login
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 3. Get current user (protected)
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -b cookies.txt
```

### 4. Access protected route
```bash
curl -X GET http://localhost:9000/store/protected/profile \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -b cookies.txt
```

### 5. Logout
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY_HERE" \
  -b cookies.txt
```

## Available Endpoints

- `POST /store/auth/register` - Register new user
- `POST /store/auth/login` - Login
- `POST /store/auth/logout` - Logout
- `GET /store/auth/me` - Get current user (protected)
- `POST /store/auth/change-password` - Change password (protected)
- `GET /store/protected/profile` - Example protected route
- `PUT /store/protected/profile` - Update profile (protected)

## Frontend Integration (JavaScript)

```javascript
// Get the publishable API key first
const keyResponse = await fetch('http://localhost:9000/api/key-exchange');
const { publishableApiKey } = await keyResponse.json();

// Login
const response = await fetch('http://localhost:9000/store/auth/login', {
  method: 'POST',
  credentials: 'include', // Important for cookies!
  headers: { 
    'Content-Type': 'application/json',
    'x-publishable-api-key': publishableApiKey
  },
  body: JSON.stringify({ email: 'test@example.com', password: 'test123456' })
});
const data = await response.json();
console.log(data);
```

## Testing with Postman

### Step 1: Get Your API Key
1. Create a new GET request to: `http://localhost:9000/api/key-exchange`
2. Send the request
3. Copy the `publishableApiKey` from the response

### Step 2: Set up Environment Variable (Optional but Recommended)
1. Click the eye icon (👁️) in the top right
2. Click "Add" to create a new environment
3. Add variable: `publishable_key` with the value from Step 1
4. Save and select the environment

### Step 3: Test Registration
1. Method: `POST`
2. URL: `http://localhost:9000/store/auth/register`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-publishable-api-key`: `{{publishable_key}}` (or paste the actual key)
4. Body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "test123456"
   }
   ```

### Step 4: Test Login
1. Method: `POST`
2. URL: `http://localhost:9000/store/auth/login`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-publishable-api-key`: `{{publishable_key}}`
4. Body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "test123456"
   }
   ```
5. **Important**: Postman will automatically save cookies from the response

### Step 5: Test Protected Routes
1. Method: `GET`
2. URL: `http://localhost:9000/store/auth/me`
3. Headers:
   - `Content-Type`: `application/json`
   - `x-publishable-api-key`: `{{publishable_key}}`
4. Cookies are automatically included by Postman

📖 **For detailed documentation, see [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)**

