# Authentication Integration Documentation

## Overview

This Medusa 2.0 backend now has a complete authentication system integrated using:
- **@medusajs/auth** - Core authentication module
- **@medusajs/auth-emailpass** - Email/Password authentication provider
- **JWT sessions** - For secure session management
- **bcrypt** - For password hashing

## Configuration

The authentication module is configured in `medusa-config.js`:

```javascript
{
  key: Modules.AUTH,
  resolve: '@medusajs/auth',
  options: {
    providers: [
      {
        resolve: '@medusajs/auth-emailpass',
        id: 'emailpass',
        options: {}
      }
    ]
  }
}
```

## API Endpoints

### 1. Register a New User
**POST** `/store/auth/register`

Register a new customer account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "auth_identity": {
    "id": "auth_01...",
    "provider": "emailpass",
    "entity_id": "user@example.com"
  }
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

---

### 2. Login
**POST** `/store/auth/login`

Authenticate and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
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

**Example using curl:**
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"user@example.com","password":"password123"}'
```

**Note:** The session cookie is automatically set. Save cookies with `-c cookies.txt` and use them with `-b cookies.txt` in subsequent requests.

---

### 3. Get Current User
**GET** `/store/auth/me`

Get information about the currently authenticated user. **Requires authentication.**

**Response (200):**
```json
{
  "user": {
    "id": "auth_01...",
    "email": "user@example.com",
    "provider": "emailpass",
    "app_metadata": {}
  }
}
```

**Example using curl:**
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 4. Logout
**POST** `/store/auth/logout`

Clear the current session.

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

### 5. Change Password
**POST** `/store/auth/change-password`

Change password for the authenticated user. **Requires authentication.**

**Request Body:**
```json
{
  "current_password": "oldPassword123",
  "new_password": "newPassword123"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"current_password":"password123","new_password":"newPassword456"}'
```

---

## Protected Routes

### Example Protected Route
**GET** `/store/protected/profile`

An example protected route that requires authentication.

**Response (200):**
```json
{
  "message": "This is a protected route - you are authenticated!",
  "profile": {
    "id": "auth_01...",
    "email": "user@example.com",
    "provider": "emailpass",
    "authenticated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Example using curl:**
```bash
curl -X GET http://localhost:9000/store/protected/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

**PUT** `/store/protected/profile`

Update user profile metadata.

**Request Body:**
```json
{
  "name": "John Doe",
  "metadata": {
    "phone": "+1234567890",
    "preferences": {
      "newsletter": true
    }
  }
}
```

**Example using curl:**
```bash
curl -X PUT http://localhost:9000/store/protected/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"John Doe","metadata":{"phone":"+1234567890"}}'
```

---

## Authentication Middleware

The authentication middleware is defined in `src/api/middlewares.ts` and automatically protects routes matching:
- `/store/auth/me`
- `/store/protected/*`

### Using Middleware in Your Routes

To protect additional routes, add them to the middleware configuration:

```javascript
export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/auth/me",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/protected/*",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/orders",
      middlewares: [authenticate]
    }
  ]
});
```

### Optional Authentication

For routes where authentication is optional but you want to access auth context if available:

```javascript
{
  matcher: "/store/products",
  middlewares: [optionalAuthenticate]
}
```

---

## Session Management

### How Sessions Work

1. **Login**: When a user logs in, a session is created with `auth_context`:
   ```javascript
   req.session.auth_context = {
     actor_id: authIdentity.id,
     actor_type: "customer",
     auth_identity_id: authIdentity.id,
     app_metadata: {}
   };
   ```

2. **Protected Routes**: Middleware checks for `req.session.auth_context`
3. **Logout**: Session is cleared: `req.session.auth_context = undefined`

### Session Configuration

Sessions are configured in `medusa-config.js`:
```javascript
http: {
  jwtSecret: JWT_SECRET,      // Used for signing JWT tokens
  cookieSecret: COOKIE_SECRET  // Used for signing session cookies
}
```

---

## Error Responses

All authentication endpoints follow a consistent error format:

**400 Bad Request:**
```json
{
  "error": "Email and password are required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid credentials"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Registration failed"
}
```

---

## Testing the Authentication Flow

### Complete Flow Example

1. **Register a new user:**
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

2. **Login and save session:**
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123456"}'
```

3. **Access protected route:**
```bash
curl -X GET http://localhost:9000/store/protected/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

4. **Get current user:**
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

5. **Change password:**
```bash
curl -X POST http://localhost:9000/store/auth/change-password \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"current_password":"test123456","new_password":"newpass123456"}'
```

6. **Logout:**
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

---

## Frontend Integration

### Using Fetch API

```javascript
// Register
const register = async (email, password) => {
  const response = await fetch('http://localhost:9000/store/auth/register', {
    method: 'POST',
    credentials: 'include', // Important: Include cookies
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
};

// Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:9000/store/auth/login', {
    method: 'POST',
    credentials: 'include', // Important: Include cookies
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password })
  });
  return await response.json();
};

// Get current user
const getCurrentUser = async () => {
  const response = await fetch('http://localhost:9000/store/auth/me', {
    method: 'GET',
    credentials: 'include', // Important: Include cookies
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return await response.json();
};

// Access protected route
const getProfile = async () => {
  const response = await fetch('http://localhost:9000/store/protected/profile', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return await response.json();
};

// Logout
const logout = async () => {
  const response = await fetch('http://localhost:9000/store/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });
  return await response.json();
};
```

### Using Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9000',
  withCredentials: true // Important: Include cookies
});

// Register
const register = (email, password) => 
  api.post('/store/auth/register', { email, password });

// Login
const login = (email, password) => 
  api.post('/store/auth/login', { email, password });

// Get current user
const getCurrentUser = () => 
  api.get('/store/auth/me');

// Access protected route
const getProfile = () => 
  api.get('/store/protected/profile');

// Logout
const logout = () => 
  api.post('/store/auth/logout');
```

---

## Security Best Practices

1. **HTTPS in Production**: Always use HTTPS in production to protect credentials
2. **Strong Passwords**: Implement password strength requirements
3. **Rate Limiting**: Add rate limiting to prevent brute force attacks
4. **CORS Configuration**: Properly configure CORS in your environment:
   ```env
   STORE_CORS=http://localhost:3000,http://localhost:8000
   AUTH_CORS=http://localhost:3000,http://localhost:8000
   ```
5. **Secure Secrets**: Use strong, random secrets for JWT_SECRET and COOKIE_SECRET
6. **Password Reset**: Implement password reset functionality for forgotten passwords

---

## Environment Variables

Ensure these are set in your `.env` file:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/medusa
JWT_SECRET=your-super-secret-jwt-key-here
COOKIE_SECRET=your-super-secret-cookie-key-here

# Optional but recommended
STORE_CORS=http://localhost:3000
AUTH_CORS=http://localhost:3000
ADMIN_CORS=http://localhost:7001
REDIS_URL=redis://localhost:6379
```

---

## Extending the Authentication System

### Adding Custom Metadata

You can store custom metadata in the `app_metadata` field:

```javascript
await authModuleService.updateAuthIdentities(authIdentityId, {
  app_metadata: {
    customer_id: "cus_123",
    preferences: {
      newsletter: true,
      language: "en"
    },
    profile: {
      name: "John Doe",
      phone: "+1234567890"
    }
  }
});
```

### Adding OAuth Providers

To add OAuth providers (Google, GitHub, etc.), install the provider package:

```bash
pnpm add @medusajs/auth-google
```

Then add to `medusa-config.js`:

```javascript
{
  key: Modules.AUTH,
  resolve: '@medusajs/auth',
  options: {
    providers: [
      {
        resolve: '@medusajs/auth-emailpass',
        id: 'emailpass'
      },
      {
        resolve: '@medusajs/auth-google',
        id: 'google',
        options: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackUrl: `${BACKEND_URL}/auth/google/callback`
        }
      }
    ]
  }
}
```

---

## Troubleshooting

### Common Issues

1. **401 Unauthorized on protected routes**
   - Ensure you're including credentials/cookies in your requests
   - Check that you've logged in successfully first

2. **CORS errors**
   - Verify CORS settings in `.env` and `medusa-config.js`
   - Ensure `credentials: 'include'` or `withCredentials: true` is set in frontend

3. **Session not persisting**
   - Check that JWT_SECRET and COOKIE_SECRET are set
   - Verify cookies are being sent/received in browser DevTools

4. **Registration fails**
   - Check database connection
   - Ensure email is unique
   - Check password meets minimum requirements

---

## Next Steps

- Implement password reset functionality
- Add email verification
- Implement 2FA (Two-Factor Authentication)
- Add rate limiting for security
- Create role-based access control (RBAC)
- Add OAuth providers (Google, GitHub, etc.)

---

## Support

For more information about Medusa authentication:
- [Medusa Documentation](https://docs.medusajs.com)
- [Medusa Authentication Module](https://docs.medusajs.com/resources/authentication)

