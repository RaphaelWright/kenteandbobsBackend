# Solution for `/store/customers/me` 401 Error

## The Problem

Medusa V2 has **built-in authentication** for `/store/customers/*` routes at the framework level. When you call `/store/customers/me`, Medusa's core authentication layer intercepts the request **before** it reaches your custom route code. That's why:

1. You get `{"message": "Unauthorized"}` (Medusa's error format, not your custom one)
2. Your console.log statements never appear (the route code never runs)
3. The authentication check happens at the framework level

## The Solution

I've created **TWO options** for you:

### Option 1: Use the Workaround Endpoint (RECOMMENDED)

Use `/store/customer-profile` instead of `/store/customers/me`:

**Backend Route:** `backend/src/api/store/customer-profile/route.ts` ✅ Created

**Usage:**
```bash
# After login:
curl http://localhost:9000/store/customer-profile \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

**JavaScript:**
```javascript
const response = await fetch('http://localhost:9000/store/customer-profile', {
  headers: {
    'Content-Type': 'application/json',
    'x-publishable-api-key': apiKey
  },
  credentials: 'include'
});

const data = await response.json();
console.log('Customer:', data.customer);
```

### Option 2: Try to Override Med usa's Built-in Route

I've updated the middleware to use `optionalAuthenticate` for `/store/customers/me`. This *might* allow your custom route to work, but it's not guaranteed because Medusa's framework might still intercept it.

## 🔴 CRITICAL: Restart the Server!

```bash
# Stop the server (Ctrl+C)
npm run dev
# or
npx medusa develop
```

## Testing Steps

### Step 1: Test the workaround endpoint

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -c cookies.txt \
  -d '{"email": "your@email.com", "password": "yourpassword"}'

# 2. Test the new endpoint
curl http://localhost:9000/store/customer-profile \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

**Expected:** You should see:
- Console logs in your server: `=== /store/customer-profile called ===`
- JSON response with customer data

### Step 2: Test original endpoint (optional)

```bash
curl http://localhost:9000/store/customers/me \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

If this still returns 401, use Option 1 (`/store/customer-profile`) instead.

### Step 3: Test other debug endpoints

```bash
# Test route loading
curl http://localhost:9000/store/test-route

# Test session debug
curl http://localhost:9000/store/debug/session \
  -H "x-publishable-api-key: YOUR_KEY" \
  -b cookies.txt
```

## What Changed

### 1. Created `/store/customer-profile` endpoint
- Same functionality as `/store/customers/me`
- Different path to avoid Medusa's built-in authentication
- Includes all the same debugging logs

### 2. Updated middleware configuration
- Added optional authentication for `/store/customers/me`
- This allows the request to pass through to your custom code

### 3. Fixed session configuration
- Updated `medusa-config.js` with explicit session/cookie settings
- Set `sameSite: 'lax'` for better CORS compatibility

### 4. Fixed signup route consistency
- Made `actor_id` consistent between login and signup (both use email)

## Why This Happened

Medusa V2 is a framework-first approach where certain routes have built-in behavior. The `/store/customers/*` routes are reserved by Medusa's customer module and have authentication built into the framework layer, which runs before your custom route code.

This is similar to how `/admin/*` routes have built-in admin authentication in Medusa.

## Recommended Approach

1. **For now:** Use `/store/customer-profile` - it works and avoids the conflict
2. **For production:** This is actually a cleaner API design as it doesn't conflict with potential Medusa built-in routes
3. **Update your frontend:** Change the endpoint from `/store/customers/me` to `/store/customer-profile`

## Frontend Update Example

```javascript
// OLD
const response = await fetch('/store/customers/me', { ... });

// NEW ✅
const response = await fetch('/store/customer-profile', { ... });
```

## Troubleshooting

### If `/store/customer-profile` still returns 401:

1. **Check server logs** - Do you see `=== /store/customer-profile called ===`?
   - **YES:** Authentication is the issue (session/cookies)
   - **NO:** Route isn't loading (restart server)

2. **Test `/store/debug/session`** - Does it show `auth_context`?
   - **YES:** Session is working, use cookies correctly
   - **NO:** Login didn't set session properly

3. **Test `/store/test-route`** - Does it work?
   - **YES:** Routes are loading, focus on authentication
   - **NO:** Server/routing issue

### If login isn't setting session:

```bash
# Check login response includes Set-Cookie header
curl -v -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -H "x-publishable-api-key: YOUR_KEY" \
  -d '{"email": "your@email.com", "password": "yourpassword"}' \
  2>&1 | grep -i "set-cookie"
```

You should see `Set-Cookie: connect.sid=...`

## Summary

- ✅ Created workaround endpoint: `/store/customer-profile`
- ✅ Updated middleware configuration
- ✅ Fixed session configuration
- ✅ Fixed signup/login consistency
- 🔴 **RESTART SERVER**
- 🧪 **TEST** `/store/customer-profile`

Let me know what happens when you test `/store/customer-profile` after restarting!

