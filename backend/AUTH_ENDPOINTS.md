# Authentication Endpoints Documentation

This document provides comprehensive documentation for all authentication endpoints in the Kentean & Bob's Backend API.

## Base URL
```
http://localhost:9000
```

## Table of Contents
1. [Sign Up](#1-sign-up)
2. [Login](#2-login)
3. [Logout](#3-logout)
4. [Get Current User](#4-get-current-user)
5. [Change Password](#5-change-password)
6. [Basic Register](#6-basic-register)

---

## 1. Sign Up

Create a new customer account with optional profile information.

**Endpoint:** `POST /store/auth/signup`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address (must be valid format) |
| `password` | string | Yes | User's password (minimum 8 characters) |
| `first_name` | string | No | User's first name |
| `last_name` | string | No | User's last name |

### Example Request

**cURL:**
```bash
curl -X POST http://localhost:9000/store/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123",
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/signup', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for session cookies
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'securePassword123',
    first_name: 'John',
    last_name: 'Doe'
  })
});

const data = await response.json();
console.log(data);
```

### Success Response (201 Created)

```json
{
  "message": "Signup successful",
  "customer": {
    "id": "cus_01JCXY123456789",
    "email": "john.doe@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "Email and password are required"
}
```

**400 Bad Request** - Invalid email format:
```json
{
  "error": "Invalid email format"
}
```

**400 Bad Request** - Weak password:
```json
{
  "error": "Password must be at least 8 characters long"
}
```

**409 Conflict** - Email already exists:
```json
{
  "error": "An account with this email already exists"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Signup failed"
}
```

### Notes
- User is automatically logged in after successful signup
- Session cookie is set automatically
- Email must be unique across all users
- Password is hashed before storage

---

## 2. Login

Authenticate an existing user and create a session.

**Endpoint:** `POST /store/auth/login`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

### Example Request

**cURL:**
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "john.doe@example.com",
    "password": "securePassword123"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    email: 'john.doe@example.com',
    password: 'securePassword123'
  })
});

const data = await response.json();
console.log(data);
```

### Success Response (200 OK)

```json
{
  "message": "Login successful",
  "customer": {
    "id": "auth_01JCXY123456789",
    "email": "john.doe@example.com"
  }
}
```

### Error Responses

**400 Bad Request** - Missing credentials:
```json
{
  "error": "Email and password are required"
}
```

**401 Unauthorized** - Invalid credentials:
```json
{
  "error": "Invalid credentials"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Login failed"
}
```

### Notes
- Session cookie is set on successful login
- Use the cookie in subsequent requests to maintain authentication
- Session persists until logout or expiration

---

## 3. Logout

End the current user session.

**Endpoint:** `POST /store/auth/logout`

### Request Body
No request body required.

### Example Request

**cURL:**
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/logout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include'
});

const data = await response.json();
console.log(data);
```

### Success Response (200 OK)

```json
{
  "message": "Logout successful"
}
```

### Error Responses

**500 Internal Server Error:**
```json
{
  "error": "Logout failed"
}
```

### Notes
- Clears the session on the server side
- No authentication required to call this endpoint
- Safe to call even if not logged in

---

## 4. Get Current User

Retrieve information about the currently authenticated user.

**Endpoint:** `GET /store/auth/me`

### Request Body
No request body required.

### Example Request

**cURL:**
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/me', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include'
});

const data = await response.json();
console.log(data);
```

### Success Response (200 OK)

```json
{
  "user": {
    "id": "auth_01JCXY123456789",
    "email": "john.doe@example.com",
    "provider": "emailpass",
    "app_metadata": {
      "customer_id": "cus_01JCXY123456789"
    }
  }
}
```

### Error Responses

**401 Unauthorized** - Not authenticated:
```json
{
  "error": "Not authenticated"
}
```

**404 Not Found** - User not found:
```json
{
  "error": "User not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to get user information"
}
```

### Notes
- Requires valid session cookie
- Returns auth identity information
- Use `customer_id` from `app_metadata` to fetch full customer details

---

## 5. Change Password

Change the password for the currently authenticated user.

**Endpoint:** `POST /store/auth/change-password`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `current_password` | string | Yes | User's current password |
| `new_password` | string | Yes | New password (minimum 8 characters) |

### Example Request

**cURL:**
```bash
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "current_password": "securePassword123",
    "new_password": "newSecurePassword456"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/change-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
  body: JSON.stringify({
    current_password: 'securePassword123',
    new_password: 'newSecurePassword456'
  })
});

const data = await response.json();
console.log(data);
```

### Success Response (200 OK)

```json
{
  "message": "Password changed successfully"
}
```

### Error Responses

**400 Bad Request** - Missing fields:
```json
{
  "error": "Current password and new password are required"
}
```

**400 Bad Request** - Weak new password:
```json
{
  "error": "New password must be at least 8 characters long"
}
```

**401 Unauthorized** - Not authenticated:
```json
{
  "error": "Not authenticated"
}
```

**401 Unauthorized** - Wrong current password:
```json
{
  "error": "Current password is incorrect"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to change password"
}
```

### Notes
- Requires valid session cookie
- Current password must match for security
- New password must meet minimum length requirement
- User remains logged in after password change

---

## 6. Basic Register

Simple registration endpoint that creates only an auth identity (no customer profile).

**Endpoint:** `POST /store/auth/register`

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

### Example Request

**cURL:**
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**JavaScript (fetch):**
```javascript
const response = await fetch('http://localhost:9000/store/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

const data = await response.json();
console.log(data);
```

### Success Response (201 Created)

```json
{
  "message": "Registration successful",
  "auth_identity": {
    "id": "auth_01JCXY123456789",
    "provider": "emailpass",
    "entity_id": "user@example.com"
  }
}
```

### Error Responses

**400 Bad Request** - Missing fields:
```json
{
  "error": "Email and password are required"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Registration failed"
}
```

### Notes
- Creates only auth identity, not a full customer profile
- **Recommended:** Use `/store/auth/signup` instead for full customer registration
- User is NOT automatically logged in with this endpoint
- Use this endpoint only if you need minimal registration

---

## Authentication Flow

### Typical User Registration & Login Flow

```
1. User signs up
   POST /store/auth/signup
   → Creates customer + auth identity
   → Automatically logged in
   → Session cookie set

2. User makes authenticated requests
   GET /store/auth/me (with cookie)
   → Returns user info

3. User logs out
   POST /store/auth/logout
   → Session cleared

4. User logs back in
   POST /store/auth/login
   → Session restored
```

### Password Management Flow

```
1. User is logged in
   Has valid session cookie

2. User changes password
   POST /store/auth/change-password
   → Verifies current password
   → Updates to new password
   → Session remains active
```

---

## Session Management

### Cookie Handling

All authenticated endpoints use HTTP-only session cookies for security.

**Important:** When making requests from JavaScript:
```javascript
fetch(url, {
  credentials: 'include'  // Required to send/receive cookies
})
```

**When using cURL:**
```bash
# Save cookies
curl -c cookies.txt [endpoint]

# Use saved cookies
curl -b cookies.txt [endpoint]
```

### Session Persistence

- Sessions persist across requests
- Sessions expire after inactivity (configured in medusa-config.js)
- Logout clears the session immediately
- Login creates a new session

---

## Security Notes

1. **Password Requirements:**
   - Minimum 8 characters (enforced on signup and password change)
   - Passwords are hashed before storage
   - Plain text passwords are never stored

2. **Email Validation:**
   - Email format is validated on signup
   - Emails must be unique across all users

3. **Session Security:**
   - HTTP-only cookies prevent XSS attacks
   - Sessions are server-side managed
   - Always use HTTPS in production

4. **Error Handling:**
   - Generic error messages prevent user enumeration
   - Detailed errors only in development logs
   - All errors are logged server-side

---

## Common Integration Examples

### React/Next.js Example

```javascript
// AuthService.js
class AuthService {
  baseURL = 'http://localhost:9000';

  async signup(email, password, firstName, lastName) {
    const response = await fetch(`${this.baseURL}/store/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        email, 
        password, 
        first_name: firstName, 
        last_name: lastName 
      })
    });
    return await response.json();
  }

  async login(email, password) {
    const response = await fetch(`${this.baseURL}/store/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  }

  async logout() {
    const response = await fetch(`${this.baseURL}/store/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    return await response.json();
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/store/auth/me`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    return await response.json();
  }

  async changePassword(currentPassword, newPassword) {
    const response = await fetch(`${this.baseURL}/store/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        current_password: currentPassword, 
        new_password: newPassword 
      })
    });
    return await response.json();
  }
}

export default new AuthService();
```

### Usage in Components

```javascript
import AuthService from './AuthService';

// In your component
const handleSignup = async (formData) => {
  try {
    const result = await AuthService.signup(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName
    );
    console.log('Signup successful:', result);
    // Redirect to dashboard
  } catch (error) {
    console.error('Signup failed:', error);
  }
};

const handleLogin = async (email, password) => {
  try {
    const result = await AuthService.login(email, password);
    console.log('Login successful:', result);
    // Redirect to dashboard
  } catch (error) {
    console.error('Login failed:', error);
  }
};

const checkAuth = async () => {
  try {
    const user = await AuthService.getCurrentUser();
    console.log('Current user:', user);
  } catch (error) {
    console.error('Not authenticated');
    // Redirect to login
  }
};
```

---

## Troubleshooting

### Common Issues

**1. Session not persisting:**
- Ensure `credentials: 'include'` is set in fetch requests
- Check CORS configuration allows credentials
- Verify cookies are being saved by the browser

**2. 401 Unauthorized errors:**
- Check if session cookie is being sent
- Verify user is logged in
- Session may have expired

**3. CORS errors:**
- Configure CORS in medusa-config.js
- Ensure credentials are allowed
- Check allowed origins include your frontend URL

**4. Password validation errors:**
- Ensure password is at least 8 characters
- Check for proper JSON formatting

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify request format matches documentation
- Ensure all required fields are included
- Test with cURL to isolate frontend issues

---

**Last Updated:** November 2024
**API Version:** 1.0
**Medusa Version:** 2.0

