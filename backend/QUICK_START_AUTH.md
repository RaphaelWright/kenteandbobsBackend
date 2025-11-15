# Quick Start - Authentication

## Start the Server

```bash
cd backend
pnpm dev
```

## Test Authentication (using curl)

### 1. Register a new user
```bash
curl -X POST http://localhost:9000/store/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 2. Login
```bash
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"test123456"}'
```

### 3. Get current user (protected)
```bash
curl -X GET http://localhost:9000/store/auth/me \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 4. Access protected route
```bash
curl -X GET http://localhost:9000/store/protected/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

### 5. Logout
```bash
curl -X POST http://localhost:9000/store/auth/logout \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

## Available Endpoints

- `POST /store/auth/register` - Register new user
- `POST /store/auth/login` - Login
- `POST /store/auth/logout` - Logout
- `GET /store/auth/me` - Get current user (protected)
- `POST /store/auth/change-password` - Change password (protected)
- `GET /store/protected/profile` - Example protected route
- `PUT /store/protected/profile` - Update profile (protected)

## Frontend Integration (JavaScript)

```javascript
// Login
const response = await fetch('http://localhost:9000/store/auth/login', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'test123456' })
});
const data = await response.json();
console.log(data);
```

📖 **For detailed documentation, see [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)**

