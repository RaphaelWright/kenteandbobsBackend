# Forgot Password Flow Documentation

## Overview

The forgot password flow allows users to reset their password when they can't log in. This is a **two-step process**:

1. **Request Reset** - User requests a password reset via email
2. **Complete Reset** - User uses the token from email to set a new password

This flow is completely separate from the authenticated "change password" endpoint.

---

## Architecture

### Flow Diagram

```
User forgets password
         ↓
    Visits "Forgot Password" page
         ↓
    Enters email address
         ↓
    POST /store/auth/forgot-password
         ↓
    System generates reset token
         ↓
    Stores token in customer metadata
         ↓
    Sends email with reset link ← [Email contains token]
         ↓
    User clicks link in email
         ↓
    Opens "Reset Password" page
         ↓
    Enters new password + token
         ↓
    POST /store/auth/reset-password
         ↓
    System validates token
         ↓
    Updates password
         ↓
    Clears token (single-use)
         ↓
    User can login with new password
```

---

## Endpoint 1: Request Password Reset

### Endpoint Details

**Endpoint:** `POST /store/auth/forgot-password`

**Authentication:** Not required (user can't log in)

**Content-Type:** `application/json`

### Request Format

```json
{
  "email": "user@example.com"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ Yes | User's registered email address |

### Success Response (200 OK)

```json
{
  "message": "If your email is registered, you will receive a password reset link shortly",
  "success": true
}
```

**Important:** The response is **always the same** whether the email exists or not. This prevents email enumeration attacks.

### Error Responses

#### 400 Bad Request - Missing Email

```json
{
  "error": "Bad Request",
  "message": "Email is required"
}
```

#### 400 Bad Request - Invalid Email Format

```json
{
  "error": "Bad Request",
  "message": "Invalid email format"
}
```

### Security Features

✅ **Email Enumeration Prevention**
- Always returns success, even if email doesn't exist
- Response time is consistent regardless of email existence

✅ **Token Security**
- Cryptographically secure random token (32 bytes)
- Token expires after 1 hour
- Single-use token (deleted after successful reset)

✅ **Rate Limiting Recommended**
- Limit to 5 requests per hour per IP
- Helps prevent abuse and spam

✅ **Audit Logging**
- All reset requests are logged with timestamp
- Helps detect suspicious patterns

### Token Storage

The reset token is stored in the customer's `metadata` field:

```json
{
  "password_reset_token": "abc123...",
  "password_reset_expiry": "2025-11-26T15:30:00Z",
  "password_reset_requested_at": "2025-11-26T14:30:00Z"
}
```

---

## Endpoint 2: Complete Password Reset

### Endpoint Details

**Endpoint:** `POST /store/auth/reset-password`

**Authentication:** Not required (token-based verification)

**Content-Type:** `application/json`

### Request Format

```json
{
  "email": "user@example.com",
  "token": "abc123def456...",
  "new_password": "NewSecurePass456",
  "confirm_password": "NewSecurePass456"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ Yes | User's email address |
| `token` | string | ✅ Yes | Reset token from email link |
| `new_password` | string | ✅ Yes | New password (see requirements below) |
| `confirm_password` | string | ⚠️ Recommended | Password confirmation |

### Password Requirements

Same as the change password endpoint:

- ✅ **Minimum length:** 8 characters
- ✅ **Maximum length:** 128 characters
- ✅ **Must contain:** At least one letter (a-z, A-Z)
- ✅ **Must contain:** At least one number (0-9)
- ✅ **Must not be:** A common/weak password
- ❌ **Cannot be:** password123, 12345678, qwerty123, etc.

### Success Response (200 OK)

```json
{
  "message": "Password has been reset successfully. You can now log in with your new password",
  "success": true
}
```

### Error Responses

#### 400 Bad Request - Missing Fields

```json
{
  "error": "Bad Request",
  "message": "Email, token, and new password are required",
  "fields": {
    "email": "Required",
    "token": "Required",
    "new_password": "Required"
  }
}
```

#### 400 Bad Request - Invalid Email

```json
{
  "error": "Bad Request",
  "message": "Invalid email format",
  "field": "email"
}
```

#### 400 Bad Request - Passwords Don't Match

```json
{
  "error": "Bad Request",
  "message": "Passwords do not match",
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

#### 400 Bad Request - Invalid/Expired Token

```json
{
  "error": "Bad Request",
  "message": "Invalid or expired reset token"
}
```

#### 400 Bad Request - Token Expired

```json
{
  "error": "Bad Request",
  "message": "Reset token has expired. Please request a new one"
}
```

### Security Features

✅ **Token Validation**
- Verifies token matches the stored token
- Checks token hasn't expired (1 hour limit)
- Tokens are single-use (deleted after successful reset)

✅ **Password Strength Validation**
- Same validation as change password endpoint
- Prevents weak passwords
- Blocks common passwords

✅ **No Account Enumeration**
- Errors don't reveal whether email exists
- Consistent error messages

---

## Complete Usage Example

### Step 1: Request Password Reset

```typescript
// Frontend: Forgot Password Form
async function requestPasswordReset(email: string) {
  const response = await fetch('/store/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  
  if (response.ok) {
    // Show success message
    console.log('Check your email for reset instructions');
    return data;
  } else {
    throw new Error(data.message);
  }
}

// Usage
try {
  await requestPasswordReset('user@example.com');
  alert('If your email is registered, you will receive a reset link shortly');
} catch (error) {
  console.error('Error:', error.message);
}
```

### Step 2: User Receives Email

The email should contain a link like:
```
https://yourstore.com/reset-password?token=abc123def456&email=user@example.com
```

### Step 3: Complete Password Reset

```typescript
// Frontend: Reset Password Form
async function resetPassword(data: {
  email: string;
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  const response = await fetch('/store/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: data.email,
      token: data.token,
      new_password: data.newPassword,
      confirm_password: data.confirmPassword,
    }),
  });

  const result = await response.json();
  
  if (response.ok) {
    console.log('Password reset successful!');
    return result;
  } else {
    throw new Error(result.message);
  }
}

// Usage - Extract params from URL
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get('email');
const token = urlParams.get('token');

try {
  await resetPassword({
    email: email!,
    token: token!,
    newPassword: 'NewSecurePass456',
    confirmPassword: 'NewSecurePass456',
  });
  alert('Password reset! You can now login.');
  window.location.href = '/login';
} catch (error) {
  alert('Reset failed: ' + error.message);
}
```

### Complete React Example

```tsx
import { useState } from 'react';

// Step 1: Forgot Password Form
function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/store/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setSuccess(true);
      } else {
        const data = await response.json();
        setError(data.message);
      }
    } catch (err: any) {
      setError('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="success-message">
        <h2>Check Your Email</h2>
        <p>
          If your email is registered, you'll receive a password reset link shortly.
        </p>
        <p>The link will expire in 1 hour.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Forgot Password</h2>
      {error && <div className="error">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="email">Email Address</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
          placeholder="your@email.com"
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>

      <p>
        <a href="/login">Back to Login</a>
      </p>
    </form>
  );
}

// Step 2: Reset Password Form
function ResetPasswordForm() {
  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Get email and token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email');
  const token = urlParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/store/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token,
          new_password: form.newPassword,
          confirm_password: form.confirmPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(data.message);
      }
    } catch (err: any) {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <div className="error-message">
        <h2>Invalid Reset Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <a href="/forgot-password">Request a new reset link</a>
      </div>
    );
  }

  if (success) {
    return (
      <div className="success-message">
        <h2>Password Reset Successful!</h2>
        <p>Your password has been updated. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Your Password</h2>
      {error && <div className="error">{error}</div>}

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
        <label htmlFor="confirmPassword">Confirm Password</label>
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
        {loading ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  );
}
```

---

## Email Template

You'll need to send an email with the reset link. Here's a sample template:

### HTML Email Template

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Password Reset Request</h2>
    
    <p>Hello,</p>
    
    <p>
      You recently requested to reset your password for your Kente & Bobs account.
      Click the button below to reset it:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{RESET_LINK}}" 
         style="background-color: #007bff; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="background: #f4f4f4; padding: 10px; word-break: break-all;">
      {{RESET_LINK}}
    </p>
    
    <p><strong>This link will expire in 1 hour.</strong></p>
    
    <hr style="border: 1px solid #eee; margin: 30px 0;">
    
    <p style="color: #666; font-size: 14px;">
      If you didn't request a password reset, please ignore this email or 
      contact support if you have concerns.
    </p>
    
    <p style="color: #666; font-size: 14px;">
      This link can only be used once.
    </p>
  </div>
</body>
</html>
```

### Text Email Template

```
Password Reset Request

Hello,

You recently requested to reset your password for your Kente & Bobs account.
Click the link below to reset it:

{{RESET_LINK}}

This link will expire in 1 hour and can only be used once.

If you didn't request a password reset, please ignore this email or 
contact support if you have concerns.

---
Kente & Bobs
```

---

## Implementing Email Sending

### Option 1: Using SendGrid

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  const msg = {
    to: email,
    from: process.env.FROM_EMAIL!, // Your verified sender
    subject: 'Reset Your Password - Kente & Bobs',
    text: `Click this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    html: `
      <div>
        <h2>Password Reset Request</h2>
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="background:#007bff;color:white;padding:12px 30px;text-decoration:none;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetLink}</p>
        <p>This link expires in 1 hour.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
}
```

### Option 2: Using Nodemailer

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to: email,
    subject: 'Reset Your Password - Kente & Bobs',
    text: `Click this link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    html: `<!-- HTML template here -->`,
  });
}
```

---

## Security Best Practices

### ✅ Implemented

1. **Token Security**
   - Cryptographically secure random tokens (32 bytes)
   - Tokens expire after 1 hour
   - Single-use tokens (deleted after use)

2. **Email Enumeration Prevention**
   - Always returns success response
   - Doesn't reveal if email exists

3. **Password Validation**
   - Strong password requirements
   - Blocks common passwords

4. **Audit Logging**
   - All reset requests logged
   - Successful resets logged

### 🔮 Recommended Enhancements

1. **Rate Limiting**
   ```typescript
   // Limit to 5 requests per hour per IP
   // Use express-rate-limit or similar
   ```

2. **Email Notifications**
   ```typescript
   // Send confirmation email after password reset
   // Helps user detect unauthorized changes
   ```

3. **Account Lockout**
   ```typescript
   // Lock account after 10 failed reset attempts
   // Requires admin intervention to unlock
   ```

4. **IP Tracking**
   ```typescript
   // Store IP address with reset request
   // Flag suspicious patterns
   ```

5. **Two-Factor Authentication**
   ```typescript
   // Require 2FA code before allowing reset
   // Extra layer of security
   ```

---

## Testing

### cURL Examples

```bash
# Step 1: Request password reset
curl -X POST http://localhost:9000/store/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Response:
# {
#   "message": "If your email is registered, you will receive a password reset link shortly",
#   "success": true
# }

# Check server logs for token (in development)

# Step 2: Reset password with token
curl -X POST http://localhost:9000/store/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"user@example.com",
    "token":"abc123def456...",
    "new_password":"NewSecure456",
    "confirm_password":"NewSecure456"
  }'

# Response:
# {
#   "message": "Password has been reset successfully. You can now log in with your new password",
#   "success": true
# }

# Step 3: Test login with new password
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email":"user@example.com",
    "password":"NewSecure456"
  }'
```

### Test Cases

#### ✅ Success Cases
1. Valid email, receives token
2. Valid token and password, reset succeeds
3. Reset and login with new password

#### ❌ Error Cases
1. Missing email (400)
2. Invalid email format (400)
3. Missing token (400)
4. Invalid token (400)
5. Expired token (400)
6. Weak password (400)
7. Passwords don't match (400)
8. Token reuse attempt (400)

---

## Troubleshooting

### Issue 1: Not receiving reset email

**Causes:**
- Email service not configured
- Email in spam folder
- Email doesn't exist in system

**Solutions:**
- Check server logs for token (in development)
- Verify email service configuration
- Check spam folder
- Verify email is registered

### Issue 2: Token expired

**Cause:** More than 1 hour passed since request

**Solution:**
- Request a new reset link
- Complete reset within 1 hour

### Issue 3: Invalid token error

**Causes:**
- Token was already used
- Token doesn't match stored token
- Email doesn't match

**Solutions:**
- Request a new reset link
- Ensure email and token match exactly
- Check for extra spaces or characters

---

## Environment Variables

Add to your `.env` file:

```bash
# Frontend URL for reset links
FRONTEND_URL=http://localhost:3000

# Email service (choose one)
# Option 1: SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourstore.com

# Option 2: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@yourstore.com
```

---

## Related Endpoints

- `POST /store/auth/signup` - Register new user
- `POST /store/auth/login` - Login user
- `POST /store/auth/change-password` - Change password (authenticated)
- `POST /store/auth/logout` - Logout user

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025  
**Endpoints:**  
- `POST /store/auth/forgot-password`
- `POST /store/auth/reset-password`

