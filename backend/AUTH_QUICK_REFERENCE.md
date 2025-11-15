# Auth Endpoints - Quick Reference

## Overview
All endpoints are prefixed with `/store/auth`

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/signup` | POST | No | Create new customer account with profile |
| `/login` | POST | No | Authenticate and create session |
| `/logout` | POST | No | End current session |
| `/me` | GET | Yes | Get current user info |
| `/change-password` | POST | Yes | Change user password |
| `/register` | POST | No | Basic registration (auth identity only) |

---

## Quick Examples

### 1. Sign Up
```bash
curl -X POST http://localhost:9000/store/auth/signup \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123","first_name":"John","last_name":"Doe"}'
```

### 2. Login
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'
```

### 3. Get Current User
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -b cookies.txt
```

### 4. Change Password
```bash
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"current_password":"password123","new_password":"newPassword456"}'
```

### 5. Logout
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -b cookies.txt
```

---

## Request/Response Formats

### Signup
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "first_name": "John",    // optional
  "last_name": "Doe"        // optional
}
```
**Response (201):**
```json
{
  "message": "Signup successful",
  "customer": {
    "id": "cus_01...",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```
**Response (200):**
```json
{
  "message": "Login successful",
  "customer": {
    "id": "auth_01...",
    "email": "user@example.com"
  }
}
```

### Get Current User
**Request:** No body required (GET request with cookie)

**Response (200):**
```json
{
  "user": {
    "id": "auth_01...",
    "email": "user@example.com",
    "provider": "emailpass",
    "app_metadata": {
      "customer_id": "cus_01..."
    }
  }
}
```

### Change Password
**Request:**
```json
{
  "current_password": "password123",
  "new_password": "newPassword456"
}
```
**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

### Logout
**Request:** No body required

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## Common HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Missing/invalid fields, validation error |
| 401 | Unauthorized | Invalid credentials or not authenticated |
| 404 | Not Found | User not found |
| 409 | Conflict | Email already exists |
| 500 | Server Error | Internal server error |

---

## Validation Rules

- **Email:** Must be valid email format
- **Password:** Minimum 8 characters
- **First Name:** Optional, string
- **Last Name:** Optional, string

---

## Session Management

### Important Notes:
1. Use `credentials: 'include'` in fetch requests
2. Save cookies with `-c cookies.txt` in cURL
3. Send cookies with `-b cookies.txt` in cURL
4. Sessions persist until logout or expiration
5. Signup automatically logs in the user

---

## JavaScript Fetch Template

```javascript
// Signup
const signup = await fetch('http://localhost:9000/store/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    first_name: 'John',
    last_name: 'Doe'
  })
});

// Login
const login = await fetch('http://localhost:9000/store/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});

// Get current user
const me = await fetch('http://localhost:9000/store/auth/me', {
  credentials: 'include'
});

// Change password
const changePassword = await fetch('http://localhost:9000/store/auth/change-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    current_password: 'password123',
    new_password: 'newPassword456'
  })
});

// Logout
const logout = await fetch('http://localhost:9000/store/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

---

## Error Handling Example

```javascript
async function handleAuth(endpoint, data) {
  try {
    const response = await fetch(`http://localhost:9000/store/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    return result;
  } catch (error) {
    console.error(`Auth error (${endpoint}):`, error.message);
    throw error;
  }
}

// Usage
try {
  await handleAuth('signup', {
    email: 'user@example.com',
    password: 'password123'
  });
} catch (error) {
  // Handle error
}
```

---

## Recommended: Use Signup Instead of Register

| Feature | `/signup` | `/register` |
|---------|-----------|-------------|
| Creates customer profile | ✅ Yes | ❌ No |
| Auto login | ✅ Yes | ❌ No |
| First/Last name | ✅ Yes | ❌ No |
| Email validation | ✅ Yes | ❌ No |
| Password validation | ✅ Yes | ❌ No |
| Duplicate check | ✅ Yes | ❌ No |

**Recommendation:** Always use `/store/auth/signup` for new user registration.

---

For detailed documentation, see [AUTH_ENDPOINTS.md](./AUTH_ENDPOINTS.md)

