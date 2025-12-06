# Critical Fix: Preserving app_metadata During Password Changes

## The Issue

When changing passwords by deleting and recreating auth identities, the `app_metadata` containing the `customer_id` was being lost. This broke the linkage between auth identities and customer records, causing subsequent operations to fail.

### What is app_metadata?

The `app_metadata` field in an auth identity stores application-specific data, most importantly:
- `customer_id`: Links the auth identity to the customer record

Without this linkage:
- Customer-specific operations fail
- Orders can't be associated with users
- Profile updates break
- Session management becomes unreliable

## Root Cause

### Original Broken Code
```typescript
// ❌ WRONG - app_metadata is lost!
await authModuleService.deleteAuthIdentities(auth_identity_id);

const result = await authModuleService.register("emailpass", {
  body: { email, password: new_password }
});

// Session updated but customer linkage is lost
req.session.auth_context.auth_identity_id = result.authIdentity.id;
```

### The Correct Pattern (from signup endpoint)

Looking at the signup endpoint shows the correct pattern:

```typescript
// Step 1: Register creates the auth identity
const authResult = await authModuleService.register("emailpass", {
  body: { email, password }
});

// Step 2: Create customer record
const customer = await customerModuleService.createCustomers({
  email, first_name, last_name
});

// Step 3: EXPLICITLY update auth identity with customer linkage
await authModuleService.updateAuthIdentities({
  id: authResult.authIdentity.id,
  app_metadata: {
    customer_id: customer.id  // ✅ Links auth to customer
  }
});
```

## The Fix

### Fixed change-password endpoint

```typescript
// Step 1: Save app_metadata BEFORE deletion
const savedAppMetadata = authIdentity.app_metadata || {};

// Step 2: Delete old identity
await authModuleService.deleteAuthIdentities(authContext.auth_identity_id);

// Step 3: Create new identity with hashed password
const newAuthResult = await authModuleService.register("emailpass", {
  body: {
    email: authIdentity.entity_id,
    password: new_password
  }
});

// Step 4: RESTORE app_metadata to maintain linkage
if (Object.keys(savedAppMetadata).length > 0) {
  await authModuleService.updateAuthIdentities({
    id: newAuthResult.authIdentity.id,
    app_metadata: savedAppMetadata  // ✅ Customer linkage preserved!
  });
}

// Step 5: Update session with complete context
req.session.auth_context = {
  ...authContext,
  auth_identity_id: newAuthResult.authIdentity.id,
  actor_id: newAuthResult.authIdentity.entity_id,
  app_metadata: savedAppMetadata  // ✅ Session has customer info
};
```

### Fixed reset-password endpoint

```typescript
// Step 1: Save app_metadata BEFORE deletion
const savedAppMetadata = authIdentity.app_metadata || {};

// Step 2: Delete old identity
await authModuleService.deleteAuthIdentities(authIdentity.id);

// Step 3: Create new identity with hashed password
const newAuthResult = await authModuleService.register("emailpass", {
  body: { email, password: new_password }
});

// Step 4: RESTORE app_metadata to maintain linkage
if (Object.keys(savedAppMetadata).length > 0) {
  await authModuleService.updateAuthIdentities({
    id: newAuthResult.authIdentity.id,
    app_metadata: savedAppMetadata  // ✅ Customer linkage preserved!
  });
}
```

### Fixed fix-password debug endpoint

```typescript
// Step 1: Save app_metadata from first identity
const savedAppMetadata = userIdentities[0].app_metadata || {};

// Step 2: Delete all corrupted identities
for (const identity of userIdentities) {
  await authModuleService.deleteAuthIdentities(identity.id);
}

// Step 3: Create new identity with hashed password
const authResult = await authModuleService.register("emailpass", {
  body: { email, password: new_password }
});

// Step 4: RESTORE app_metadata to maintain linkage
if (Object.keys(savedAppMetadata).length > 0) {
  await authModuleService.updateAuthIdentities({
    id: authResult.authIdentity.id,
    app_metadata: savedAppMetadata  // ✅ Customer linkage preserved!
  });
}
```

## Why This Matters

### Before Fix (Broken Linkage)

```
┌─────────────────┐         ┌──────────────────┐
│  Auth Identity  │    ✗    │  Customer Record │
│  (new, no link) │ BROKEN  │  (orphaned)      │
└─────────────────┘         └──────────────────┘
```

**Problems:**
- `GET /store/customers/me` → 404 Not Found
- Orders can't be associated with user
- Cart operations fail
- Profile updates impossible

### After Fix (Linkage Preserved)

```
┌─────────────────┐         ┌──────────────────┐
│  Auth Identity  │────────→│  Customer Record │
│  app_metadata:  │  LINKED │  id: "cust_123"  │
│  customer_id:   │         │                  │
│  "cust_123"     │         │                  │
└─────────────────┘         └──────────────────┘
```

**Results:**
- ✅ All customer operations work correctly
- ✅ Orders properly associated
- ✅ Cart functionality intact
- ✅ Profile updates successful

## Files Modified

### 1. `/src/api/store/auth/change-password/route.ts`
- Lines 183-219: Added app_metadata preservation logic

### 2. `/src/api/store/auth/reset-password/route.ts`
- Lines 182-208: Added app_metadata preservation logic

### 3. `/src/api/store/debug/fix-password/route.ts`
- Lines 57-90: Added app_metadata preservation logic

## Testing the Fix

### Test 1: Change Password and Verify Customer Access

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "OldPassword123"}'

# 2. Verify customer access BEFORE password change
curl -X GET http://localhost:9000/store/customers/me \
  -b cookies.txt
# Should return customer data

# 3. Change password
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "OldPassword123",
    "new_password": "NewPassword456",
    "confirm_password": "NewPassword456"
  }'

# 4. Verify customer access AFTER password change
curl -X GET http://localhost:9000/store/customers/me \
  -b cookies.txt
# Should STILL return customer data (linkage preserved!)
```

### Test 2: Password Reset and Verify Customer Access

```bash
# 1. Request password reset
curl -X POST http://localhost:9000/store/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# 2. Check console for token, then reset password
curl -X POST http://localhost:9000/store/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "YOUR_TOKEN_HERE",
    "new_password": "NewPassword789",
    "confirm_password": "NewPassword789"
  }'

# 3. Login with new password
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "NewPassword789"}'

# 4. Verify customer access
curl -X GET http://localhost:9000/store/customers/me \
  -b cookies.txt
# Should return customer data (linkage preserved!)
```

### Test 3: Debug Auth Identity

Use the debug endpoint to inspect auth identity metadata:

```bash
# Login first
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "CurrentPassword123"}'

# Check auth identity details
curl -X GET http://localhost:9000/store/debug/test-auth \
  -b cookies.txt

# Response should show:
# {
#   "current_auth_identity": {
#     "id": "auth_...",
#     "provider": "emailpass",
#     "entity_id": "test@example.com",
#     "app_metadata": {
#       "customer_id": "cust_..."  ← CRITICAL: This must be present!
#     }
#   }
# }
```

## Verification Checklist

After password change/reset, verify:

- [ ] User can still access `/store/customers/me`
- [ ] Customer ID is in session: `req.session.auth_context.app_metadata.customer_id`
- [ ] Auth identity has app_metadata with customer_id
- [ ] Orders are still associated with the customer
- [ ] Cart operations still work
- [ ] Profile updates still work

## Summary

This fix ensures that when auth identities are recreated during password changes:

1. ✅ `app_metadata` (especially `customer_id`) is preserved
2. ✅ Customer-auth linkage remains intact
3. ✅ All customer-related operations continue to work
4. ✅ Sessions maintain proper context
5. ✅ Passwords are still properly hashed (via `register()`)

The pattern follows the same approach used in the signup endpoint, ensuring consistency across the codebase.

## Related Endpoints

- **POST /store/auth/signup** - Shows the correct pattern for setting app_metadata
- **POST /store/auth/change-password** - Now properly preserves app_metadata
- **POST /store/auth/reset-password** - Now properly preserves app_metadata
- **POST /store/debug/fix-password** - Now properly preserves app_metadata
- **GET /store/customers/me** - Requires valid customer linkage to work

---

**Issue Verified and Fixed**: December 6, 2025

