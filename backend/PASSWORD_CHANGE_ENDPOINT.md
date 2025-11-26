# Change Password Endpoint Documentation

## Overview

The change password endpoint allows authenticated users to update their password securely. This endpoint implements security best practices including current password verification, password strength validation, and prevention of common vulnerabilities.

---

## Endpoint Details

**Endpoint:** `POST /store/auth/change-password`

**Authentication:** Required (must be logged in)

**Content-Type:** `application/json`

---

## Request Format

### Headers
```
Content-Type: application/json
Cookie: connect.sid=<session-cookie>
```

### Request Body

```json
{
  "current_password": "OldPassword123",
  "new_password": "NewSecurePass456",
  "confirm_password": "NewSecurePass456"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_password` | string | ✅ Yes | User's current password for verification |
| `new_password` | string | ✅ Yes | New password (see strength requirements below) |
| `confirm_password` | string | ⚠️ Recommended | Confirmation of new password (must match `new_password`) |

---

## Password Requirements

### Minimum Requirements
- ✅ **Minimum length:** 8 characters
- ✅ **Maximum length:** 128 characters
- ✅ **Must contain:** At least one letter (a-z, A-Z)
- ✅ **Must contain:** At least one number (0-9)
- ✅ **Must not be:** A common/weak password
- ✅ **Must be different:** From current password

### Strength Validation

The endpoint validates against common weak passwords including:
- `password`, `password123`
- `12345678`, `qwerty123`
- `abc12345`, `admin123`
- `letmein123`, `welcome123`
- And other common patterns

---

## Response Format

### Success Response (200 OK)

```json
{
  "message": "Password changed successfully",
  "success": true
}
```

### Error Responses

#### 401 Unauthorized - Not Logged In

```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to change your password"
}
```

#### 401 Unauthorized - Incorrect Current Password

```json
{
  "error": "Unauthorized",
  "message": "Current password is incorrect",
  "field": "current_password"
}
```

#### 400 Bad Request - Missing Fields

```json
{
  "error": "Bad Request",
  "message": "Current password and new password are required",
  "fields": {
    "current_password": "Required",
    "new_password": "Required"
  }
}
```

#### 400 Bad Request - Password Mismatch

```json
{
  "error": "Bad Request",
  "message": "New password and confirmation do not match",
  "field": "confirm_password"
}
```

#### 400 Bad Request - Weak Password

```json
{
  "error": "Bad Request",
  "message": "Password must contain at least one number",
  "field": "new_password"
}
```

#### 400 Bad Request - Password Too Short

```json
{
  "error": "Bad Request",
  "message": "Password must be at least 8 characters long",
  "field": "new_password"
}
```

#### 400 Bad Request - Common Password

```json
{
  "error": "Bad Request",
  "message": "Password is too common. Please choose a stronger password",
  "field": "new_password"
}
```

#### 400 Bad Request - Same as Current Password

```json
{
  "error": "Bad Request",
  "message": "New password must be different from your current password",
  "field": "new_password"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to change password. Please try again later."
}
```

---

## Security Features

### ✅ Implemented Security Measures

1. **Authentication Required**
   - User must be logged in with valid session
   - Session token verified before processing

2. **Current Password Verification**
   - Requires current password to prevent unauthorized changes
   - Protects against session hijacking scenarios

3. **Password Strength Validation**
   - Minimum 8 characters
   - Must contain letters and numbers
   - Blocks common/weak passwords
   - Maximum length limit (prevents DoS)

4. **Password Reuse Prevention**
   - Prevents using the same password as current

5. **Secure Password Storage**
   - Passwords are hashed using Medusa's auth module
   - Never stored in plain text

6. **Error Masking**
   - Generic error messages for server errors
   - No exposure of internal system details

7. **Audit Logging**
   - Password changes are logged with timestamp
   - User email logged for security audit

### 🔮 Recommended Enhancements

1. **Rate Limiting**
   - Limit password change attempts (e.g., 5 per hour)
   - Prevents brute force attacks

2. **Email Notifications**
   - Send confirmation email after password change
   - Helps detect unauthorized changes

3. **Session Invalidation**
   - Logout user from all other devices/sessions
   - Force re-login after password change

4. **Password History**
   - Store hashes of last 5 passwords
   - Prevent reusing recent passwords

5. **Two-Factor Authentication**
   - Require 2FA code for password changes
   - Extra layer of security

---

## Usage Examples

### JavaScript/TypeScript (Fetch API)

```typescript
async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  const response = await fetch('http://localhost:9000/store/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important: includes session cookie
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to change password');
  }

  return data;
}

// Usage
try {
  await changePassword('OldPassword123', 'NewSecurePass456', 'NewSecurePass456');
  console.log('Password changed successfully!');
  // Optionally redirect to login page
  window.location.href = '/login';
} catch (error) {
  console.error('Password change failed:', error.message);
  alert(error.message);
}
```

### React Component Example

```tsx
import { useState } from 'react';

interface PasswordChangeForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

function ChangePasswordForm() {
  const [form, setForm] = useState<PasswordChangeForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/store/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          current_password: form.currentPassword,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });

      // Optional: Redirect to login after successful change
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-form">
      <h2>Change Password</h2>

      {success && (
        <div className="success-message">
          Password changed successfully! Redirecting to login...
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="currentPassword">Current Password</label>
          <input
            type="password"
            id="currentPassword"
            value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            type="password"
            id="newPassword"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            required
            minLength={8}
            disabled={loading}
          />
          <small>Minimum 8 characters, must contain letters and numbers</small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            type="password"
            id="confirmPassword"
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            required
            disabled={loading}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

export default ChangePasswordForm;
```

### cURL Example

```bash
# Change password
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b "connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "current_password": "OldPassword123",
    "new_password": "NewSecurePass456",
    "confirm_password": "NewSecurePass456"
  }'
```

---

## Best Practices

### For Frontend Developers

1. **Always Require Confirmation**
   ```typescript
   if (newPassword !== confirmPassword) {
     return showError('Passwords do not match');
   }
   ```

2. **Show Password Strength Indicator**
   ```typescript
   function getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
     if (password.length < 8) return 'weak';
     if (!/[0-9]/.test(password) || !/[a-zA-Z]/.test(password)) return 'weak';
     if (password.length < 12) return 'medium';
     if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
       return 'strong';
     }
     return 'medium';
   }
   ```

3. **Clear Form After Success**
   ```typescript
   setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
   ```

4. **Handle Field-Specific Errors**
   ```typescript
   if (error.field === 'current_password') {
     setCurrentPasswordError(error.message);
   }
   ```

5. **Redirect After Change**
   ```typescript
   // Redirect to login page after successful change
   setTimeout(() => router.push('/login'), 2000);
   ```

### For Backend Security

1. **Implement Rate Limiting**
   - Use middleware to limit attempts
   - Track by user ID or IP address

2. **Log Security Events**
   - Log all password changes
   - Include timestamp and user info
   - Monitor for suspicious patterns

3. **Send Email Notifications**
   - Notify user of password change
   - Include change timestamp and location
   - Provide "I didn't make this change" link

4. **Consider Session Invalidation**
   - Logout user from all devices
   - Require re-login after password change

---

## Testing

### Test Cases

#### ✅ Success Cases
1. Valid password change with all required fields
2. Valid password change without confirm_password
3. Password with special characters

#### ❌ Error Cases
1. Not authenticated (401)
2. Missing current_password (400)
3. Missing new_password (400)
4. Incorrect current_password (401)
5. Passwords don't match (400)
6. Password too short (400)
7. Password too long (400)
8. Password without letters (400)
9. Password without numbers (400)
10. Common/weak password (400)
11. Same as current password (400)

### Testing Script

```bash
#!/bin/bash

# First, login to get session
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "test@example.com",
    "password": "CurrentPass123"
  }'

# Test 1: Valid password change
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "CurrentPass123",
    "new_password": "NewSecure456",
    "confirm_password": "NewSecure456"
  }'

# Test 2: Incorrect current password
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "WrongPassword",
    "new_password": "NewSecure456",
    "confirm_password": "NewSecure456"
  }'

# Test 3: Weak password
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "CurrentPass123",
    "new_password": "password123",
    "confirm_password": "password123"
  }'
```

---

## Troubleshooting

### Common Issues

#### Issue 1: "Not authenticated" error

**Cause:** User is not logged in or session expired

**Solution:**
```typescript
// Ensure user is logged in first
const authResponse = await fetch('/store/auth/me', {
  credentials: 'include'
});

if (!authResponse.ok) {
  // Redirect to login
  window.location.href = '/login?redirect=/change-password';
}
```

#### Issue 2: "Current password is incorrect"

**Cause:** User entered wrong current password

**Solution:**
- Verify user is entering correct password
- Check for caps lock warnings in UI
- Provide clear error message

#### Issue 3: Password validation fails

**Cause:** New password doesn't meet strength requirements

**Solution:**
- Show password requirements clearly in UI
- Add real-time validation feedback
- Show password strength indicator

---

## Related Endpoints

- `POST /store/auth/signup` - Register new user
- `POST /store/auth/login` - Login user
- `POST /store/auth/logout` - Logout user
- `GET /store/auth/me` - Get auth identity
- `GET /store/customers/me` - Get customer profile

---

## FAQ

**Q: Do I need to log the user out after password change?**
A: It's recommended but not required. The current implementation keeps the user logged in. For enhanced security, you can log the user out and require re-login.

**Q: Can users change passwords without being logged in?**
A: No, authentication is required. For password reset (forgot password), you'll need a separate endpoint with email verification.

**Q: How often can users change their password?**
A: There's no built-in limit, but implementing rate limiting (e.g., 5 changes per hour) is recommended to prevent abuse.

**Q: Are old passwords stored?**
A: No, only the current password hash is stored. Implementing password history is recommended to prevent password reuse.

**Q: Is there a "forgot password" feature?**
A: This endpoint is for authenticated password changes only. A separate "forgot password" flow with email verification would need to be implemented.

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025  
**Endpoint:** `POST /store/auth/change-password`

