# Password Reset Setup with Resend

This document explains how to set up and use the Resend email service for the password reset feature.

## Overview

The password reset feature uses **Resend**, a modern email API service, to send password reset links and confirmation emails. Resend is already configured in this project and is used for all transactional emails.

## Features

- **Email-based Password Reset**: Users receive a secure reset link via email
- **Token-based Security**: Cryptographically secure tokens that expire after 1 hour
- **Single-use Tokens**: Each token can only be used once
- **Confirmation Emails**: Users receive a confirmation email after successful password reset
- **Beautiful Email Templates**: Uses React Email for professional-looking emails

## Prerequisites

1. **Resend Account**: Sign up at [https://resend.com/](https://resend.com/)
2. **API Key**: Get your API key from the Resend dashboard
3. **Verified Domain**: Verify your domain for production use (not required for testing)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Resend Email Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Frontend URL (for reset links)
FRONTEND_URL=https://yourdomain.com
# Or for development:
# FRONTEND_URL=http://localhost:3000
```

### Getting Your API Key

1. Log in to your Resend dashboard at [https://resend.com/](https://resend.com/)
2. Navigate to **API Keys**
3. Click **Create API Key**
4. Copy your API key
5. Paste it into your `.env` file as `RESEND_API_KEY`

### Setting Up Your Domain

For production, you should verify your domain:

1. In your Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `yourdomain.com`)
4. Add the DNS records provided by Resend to your domain's DNS settings
5. Wait for verification (usually takes a few minutes)
6. Use your verified domain in `RESEND_FROM_EMAIL` (e.g., `noreply@yourdomain.com`)

**For Testing**: You can use `onboarding@resend.dev` as the from address during development, but this only works for sending to your own verified email.

## API Endpoints

### 1. Request Password Reset (Send Email)

**Endpoint**: `POST /store/auth/forgot-password`

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "message": "If your email is registered, you will receive a password reset link shortly",
  "success": true
}
```

**Notes**:
- Always returns success (prevents email enumeration attacks)
- Token is valid for 1 hour
- In development mode, reset link is logged to console

### 2. Reset Password with Token

**Endpoint**: `POST /store/auth/reset-password`

**Request Body**:
```json
{
  "email": "user@example.com",
  "token": "abc123...",
  "new_password": "NewSecurePass123",
  "confirm_password": "NewSecurePass123"
}
```

**Response**:
```json
{
  "message": "Password has been reset successfully. You can now log in with your new password",
  "success": true
}
```

**Password Requirements**:
- Minimum 8 characters
- Maximum 128 characters
- Must contain at least one letter
- Must contain at least one number
- Cannot be a common password

## Email Templates

The system uses two email templates:

### 1. Password Reset Email

**Template**: `customer.password_reset`

**Content**:
- Personalized greeting with customer's first name
- Clear call-to-action button with reset link
- Plain text URL as fallback
- Security notice (1-hour expiry)
- Professional branding

**Preview**:
```
Reset Your Password

Hi [First Name],

We received a request to reset your password. Click the button below to create a new password:

[Reset Password Button]

Or copy and paste this URL into your browser:
https://yourdomain.com/reset-password?token=...&email=...

---
This link will expire in 1 hour for security reasons.

If you didn't request this password reset, you can safely ignore this email.

- The Kentenbobs Team
```

### 2. Password Reset Confirmation Email

**Template**: `customer.password_reset_confirmation`

**Content**:
- Confirmation of successful password reset
- Timestamp of when the password was changed
- Security notice to contact support if unauthorized
- Professional branding

**Preview**:
```
Password Reset Successful

Hi [First Name],

Your password has been successfully reset at [timestamp].

You can now log in to your account using your new password.

---
Security Notice: If you didn't make this change, please contact our support team immediately.

- The Kentenbobs Team
```

## Testing in Development

In development mode (`NODE_ENV=development`), the password reset link is logged to the console:

```
=== PASSWORD RESET LINK (DEV ONLY) ===
Email: user@example.com
Token: abc123...
Reset URL: http://localhost:3000/reset-password?token=abc123...&email=user@example.com
Expires: 2025-12-28T12:30:00.000Z
=======================================
```

This allows you to test without actually sending emails (though they will still be sent if your API key is configured).

## How It Works

### Flow Diagram

```
1. User requests password reset
   ↓
2. Backend generates secure token (crypto.randomBytes)
   ↓
3. Token stored in customer metadata with 1-hour expiry
   ↓
4. Email sent via Resend with reset link
   ↓
5. User clicks link in email
   ↓
6. Frontend sends token + new password to backend
   ↓
7. Backend validates token and expiry
   ↓
8. Password updated in auth system
   ↓
9. Token deleted from metadata
   ↓
10. Confirmation email sent to user
```

### Security Features

1. **Token Expiry**: Tokens expire after 1 hour
2. **Single-use Tokens**: Tokens are deleted after use or successful reset
3. **Email Enumeration Protection**: Always returns success message
4. **Secure Token Generation**: Uses `crypto.randomBytes()` for cryptographically secure random tokens
5. **Password Strength Validation**: Enforces strong password requirements
6. **Audit Logging**: All password reset attempts are logged to console

## Error Handling

### Common Errors

1. **"Email is required"**: No email address provided
2. **"Invalid email format"**: Email doesn't match standard format
3. **"Failed to send password reset email"**: Resend API error (check API key and configuration)
4. **"Invalid or expired reset token"**: Token is incorrect or has expired (>1 hour)
5. **"Reset token has expired. Please request a new one"**: Token is older than 1 hour

### Troubleshooting

1. **Email not received**:
   - Check Resend dashboard for delivery status
   - Verify API key is correct
   - Check spam/junk folder
   - Ensure domain is verified (for production)
   - Check email logs in Resend dashboard

2. **"Failed to send password reset email" error**:
   - Verify `RESEND_API_KEY` is set correctly in `.env`
   - Check Resend account status and credits
   - Verify `RESEND_FROM_EMAIL` is using a verified domain
   - Check network connectivity

3. **Token expired**:
   - Tokens are valid for 1 hour only
   - Request a new password reset

4. **Email shows as sent but not received**:
   - Check email logs in Resend dashboard
   - Verify recipient email is correct
   - Check spam folder
   - Some email providers may delay delivery

## Frontend Integration

### React/Next.js Example

```typescript
// Step 1: Request password reset
async function requestPasswordReset(email: string) {
  const response = await fetch('/api/store/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message
    alert('If your email is registered, you will receive a password reset link');
  }
}

// Step 2: Reset password with token (from URL params)
async function resetPassword(email: string, token: string, newPassword: string) {
  const response = await fetch('/api/store/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      token,
      new_password: newPassword,
      confirm_password: newPassword
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Show success message and redirect to login
    alert('Password reset successful! You can now log in.');
    window.location.href = '/login';
  } else {
    // Show error message
    alert(data.message || 'Failed to reset password');
  }
}

// Example: Parse token from URL
// URL: /reset-password?token=abc123&email=user@example.com
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');
const email = urlParams.get('email');
```

## Customizing Email Templates

Email templates are located in:
```
backend/src/modules/email-notifications/templates/
```

To customize the password reset emails:

1. **Edit the template file**:
   - `password-reset.tsx` - Reset email with link
   - `password-reset-confirmation.tsx` - Confirmation email

2. **Use React Email components**:
   ```tsx
   import { Text, Button, Heading } from '@react-email/components'
   ```

3. **Test your changes**:
   ```bash
   cd backend
   pnpm email:dev
   ```
   This opens a browser preview at `http://localhost:3002`

4. **Styling**: Templates use Tailwind CSS classes for styling

## Production Checklist

Before going to production:

- [ ] Sign up for Resend account
- [ ] Verify your domain in Resend
- [ ] Add `RESEND_API_KEY` to production environment
- [ ] Set `RESEND_FROM_EMAIL` with your verified domain
- [ ] Set `FRONTEND_URL` to your production URL
- [ ] Test password reset flow end-to-end
- [ ] Implement rate limiting (recommended: 5 requests per hour per IP)
- [ ] Monitor email delivery in Resend dashboard
- [ ] Set up alerts for failed email deliveries

## Rate Limiting (Recommended)

To prevent abuse, implement rate limiting on the forgot-password endpoint:

```typescript
// Example using express-rate-limit
import rateLimit from 'express-rate-limit';

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour per IP
  message: 'Too many password reset requests, please try again later'
});

// Apply to forgot-password endpoint
app.post('/store/auth/forgot-password', passwordResetLimiter, handler);
```

## Cost Considerations

- Resend offers a generous free tier (3,000 emails/month for free)
- After free tier: $20/month for up to 50,000 emails
- Check current pricing at [https://resend.com/pricing](https://resend.com/pricing)
- Monitor your usage in the Resend dashboard

## Support

- **Resend Documentation**: [https://resend.com/docs](https://resend.com/docs)
- **Resend Status**: [https://status.resend.com/](https://status.resend.com/)
- **React Email Documentation**: [https://react.email/](https://react.email/)

## Additional Email Templates

The Resend service can be used for other email notifications:

- Order confirmations (`order-placed.tsx`)
- User invitations (`invite-user.tsx`)
- Custom notifications (create new templates)

See `backend/src/modules/email-notifications/README.md` for more details on creating custom email templates.

## Migration Notes

If you're migrating from another email service:

1. The notification system is modular - you can use both SendGrid and Resend
2. Resend is configured in `medusa-config.js`
3. Email templates use React Email format
4. All templates are in `src/modules/email-notifications/templates/`

## License

This implementation uses Resend's email API. Please review Resend's terms of service and pricing before use.

