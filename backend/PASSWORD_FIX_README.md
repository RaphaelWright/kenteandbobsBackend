# Password Change Bug Fix

## The Problem

There were **two critical bugs** in the password change implementation:

### 1. Incorrect API Call (Fixed)
```typescript
// ❌ WRONG - ID passed as separate argument
await authModuleService.updateAuthIdentities(
  authContext.auth_identity_id,
  { provider_metadata: { password: new_password } }
);

// ✅ CORRECT - ID inside the data object
await authModuleService.updateAuthIdentities({
  id: authContext.auth_identity_id,
  provider_metadata: { password: new_password }
});
```

### 2. Password Not Being Hashed (CRITICAL - Fixed)
```typescript
// ❌ WRONG - updateAuthIdentities does NOT hash the password
await authModuleService.updateAuthIdentities({
  id: auth_identity_id,
  provider_metadata: { password: "plaintext" } // Stored as plain text!
});

// ✅ CORRECT - Delete old identity and register new one (properly hashes password)
await authModuleService.deleteAuthIdentities(auth_identity_id);
const result = await authModuleService.register("emailpass", {
  body: { email, password: new_password } // Automatically hashed!
});
```

## Why Authentication Was Failing

1. **On signup**: Password is hashed correctly via `register()` → stored as `$2b$10$...`
2. **On password change (old broken code)**: Password stored as plain text via `updateAuthIdentities()`
3. **On login attempt**: System tries to compare hashed password with plain text → **FAILS**

## How to Fix Your Account

If you've already tried to change your password and now can't log in, your password is likely corrupted (stored as plain text). Here's how to fix it:

### Option 1: Use the Fix Password Endpoint (Development Only)

```bash
curl -X POST http://localhost:9000/store/debug/fix-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "new_password": "YourNewPassword123"
  }'
```

This will:
- Delete all corrupted auth identities for your email
- Create a new properly hashed auth identity
- Allow you to log in with the new password

### Option 2: Use Password Reset Flow

1. Request password reset:
```bash
curl -X POST http://localhost:9000/store/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

2. Check the console logs for the reset token

3. Reset your password:
```bash
curl -X POST http://localhost:9000/store/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "token": "YOUR_RESET_TOKEN",
    "new_password": "YourNewPassword123",
    "confirm_password": "YourNewPassword123"
  }'
```

### Option 3: Create a New Account

If all else fails, you can create a new account with a different email.

## What Was Fixed

### `/store/auth/change-password`
- ✅ Fixed `updateAuthIdentities()` API call syntax
- ✅ Now deletes old auth identity and creates new one with properly hashed password
- ✅ Updates session with new auth identity ID
- ✅ Added extensive logging for debugging

### `/store/auth/reset-password`
- ✅ Now deletes old auth identity and creates new one with properly hashed password
- ✅ Ensures password is properly hashed

### New Debug Endpoints (Development Only)

1. **`GET /store/debug/check-user?email=test@example.com`**
   - Check if a user exists and what auth providers they have

2. **`GET /store/debug/test-auth`** (requires authentication)
   - View your current session and auth identity details

3. **`POST /store/debug/test-auth`**
   - Test password verification
   ```json
   {
     "email": "test@example.com",
     "password": "test123"
   }
   ```

4. **`POST /store/debug/fix-password`**
   - Fix corrupted passwords
   ```json
   {
     "email": "test@example.com",
     "new_password": "NewPassword123"
   }
   ```

## Testing the Fix

1. **Restart your backend server** (if not already done)

2. **Fix your corrupted password** (if needed):
```bash
curl -X POST http://localhost:9000/store/debug/fix-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "new_password": "TestPassword123"
  }'
```

3. **Login with your new password**:
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "your-email@example.com",
    "password": "TestPassword123"
  }'
```

4. **Test changing your password**:
```bash
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "TestPassword123",
    "new_password": "NewSecurePass456",
    "confirm_password": "NewSecurePass456"
  }'
```

5. **Verify you can login with the new password**:
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "your-email@example.com",
    "password": "NewSecurePass456"
  }'
```

## Security Note

**IMPORTANT**: The debug endpoints (`/store/debug/*`) should be **removed in production** as they bypass authentication and expose sensitive information. They are only for development/debugging purposes.

## Summary

The password change functionality now works correctly by:
1. Verifying the current password via authentication
2. Deleting the old auth identity
3. Creating a new auth identity with properly hashed password
4. Updating the session with the new auth identity ID

All passwords are now properly hashed using Medusa's built-in `register()` method, which ensures bcrypt hashing is applied correctly.

