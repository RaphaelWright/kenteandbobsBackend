# Debugging `/store/customers/me` Endpoint

## Issue
Getting `{"message": "Unauthorized"}` when calling `/store/customers/me`

## Recent Changes Made

### 1. Updated `src/api/middlewares.ts`
- Removed custom middleware from `/store/customers/me` and `/store/auth/me` routes
- Let the routes handle authentication themselves to avoid middleware conflicts

### 2. Added Debugging to `/store/customers/me` Route
- Added console.log statements to track session data
- Shows what's in the session when the endpoint is called

### 3. Updated Session Configuration in `medusa-config.js`
- Made session options more explicit
- Set `sameSite: 'lax'` for better CORS compatibility
- Set `secure: false` in development

### 4. Created Debug Endpoint
- Created `/store/debug/session` to inspect session data
- **Important:** Remove this in production!

## Testing Steps

### Step 1: Restart the Medusa Server

**IMPORTANT:** You must restart the server for these changes to take effect!

```bash
# Stop the current server (Ctrl+C if running in terminal)
# Then start it again:
npm run dev
# or
npx medusa develop
```

### Step 2: Test the Login Flow

1. **Login to get a session:**

```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -c cookies.txt \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Important:** Use `-c cookies.txt` to save the session cookie!

2. **Check the debug endpoint:**

```bash
curl -X GET http://localhost:9000/store/debug/session \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

This should show your session data including `auth_context`.

3. **Test /store/customers/me:**

```bash
curl -X GET http://localhost:9000/store/customers/me \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

### Step 3: Check Server Logs

When you call `/store/customers/me`, you should see logs like:

```
=== /store/customers/me called ===
Session exists: true
Session data: {
  hasAuthContext: true,
  authIdentityId: 'authi_...',
  actorId: 'user@example.com',
  actorType: 'customer'
}
✅ Auth context found: { auth_identity_id: 'authi_...', actor_id: 'user@example.com' }
```

If you don't see these logs, the route might not be loaded properly.

## Common Issues and Solutions

### Issue 1: "Unauthorized" Without Logs
**Symptom:** Getting unauthorized error but no console logs appear

**Possible Causes:**
- Server not restarted after code changes
- Route file not being loaded by Medusa
- Medusa's built-in authentication intercepting the request

**Solutions:**
1. Restart the server
2. Check if the route file exists at: `src/api/store/customers/me/route.ts`
3. Check for any syntax errors in the route file

### Issue 2: Session Not Persisting
**Symptom:** Login works but session is lost on next request

**Possible Causes:**
- Cookies not being sent/saved
- CORS issues
- Session store (Redis) not configured properly

**Solutions:**
1. Make sure you're using `-b cookies.txt` (curl) or `credentials: 'include'` (fetch)
2. Check STORE_CORS in .env matches your client URL
3. Verify Redis is running if using REDIS_URL

### Issue 3: No Auth Context in Session
**Symptom:** Debug endpoint shows session but no auth_context

**Possible Causes:**
- Login didn't set auth_context properly
- Different session on login vs. GET request

**Solutions:**
1. Check login response is successful
2. Verify cookies are being saved from login response
3. Use the same cookie on subsequent requests

## Frontend Testing with JavaScript

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:9000/store/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': 'YOUR_KEY'
  },
  credentials: 'include', // Important!
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const loginData = await loginResponse.json();
console.log('Login:', loginData);

// 2. Check debug endpoint
const debugResponse = await fetch('http://localhost:9000/store/debug/session', {
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': 'YOUR_KEY'
  },
  credentials: 'include'
});

const debugData = await debugResponse.json();
console.log('Session:', debugData);

// 3. Get customer details
const customerResponse = await fetch('http://localhost:9000/store/customers/me', {
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': 'YOUR_KEY'
  },
  credentials: 'include'
});

const customerData = await customerResponse.json();
console.log('Customer:', customerData);
```

## Environment Variables to Check

Make sure these are set in your `.env`:

```bash
# Required
DATABASE_URL=postgresql://...
JWT_SECRET=...
COOKIE_SECRET=...

# CORS - must include your frontend URL
STORE_CORS=http://localhost:3000,http://localhost:8000

# Session store (recommended)
REDIS_URL=redis://localhost:6379
```

## If Still Not Working

1. **Check Medusa version:**
```bash
npm list @medusajs/medusa
```

2. **Check route loading:**
- Look for any errors when server starts
- Medusa should log "Loaded X API routes" on startup

3. **Try without middleware:**
- The current setup doesn't use middleware for `/store/customers/me`
- Authentication is handled directly in the route

4. **Check for TypeScript errors:**
```bash
npm run build
```

5. **Test with the test script:**
```bash
node test-customer-me.js
```

## Next Steps if Issue Persists

If you're still getting unauthorized errors:

1. Share the server logs when calling the endpoint
2. Share the output of `/store/debug/session`
3. Confirm if `/store/auth/me` works (simpler endpoint with similar auth)
4. Check if other authenticated endpoints like `/store/orders` work

---

**Remember:** Always restart the server after making code changes!

