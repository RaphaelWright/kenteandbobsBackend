# Google OAuth - Quick Start

Quick guide to get Google OAuth working in 5 minutes.

## Step 1: Get Google OAuth Credentials (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Go to **APIs & Services** > **OAuth consent screen**
   - Choose **External**
   - Fill in app name and emails
   - Save
4. Go to **Credentials** > **Create Credentials** > **OAuth client ID**
   - Type: **Web application**
   - Authorized redirect URIs: `http://localhost:9000/oauth/google/callback`
   - Click **Create**
5. Copy your **Client ID** and **Client Secret**

## Step 2: Add Environment Variables (30 seconds)

Add to your `backend/.env` file:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:9000/oauth/google/callback
```

## Step 3: Restart Backend (30 seconds)

```bash
cd backend
pnpm dev
```

## Step 4: Test It (1 minute)

Open in browser:
```
http://localhost:9000/oauth/google
```

You should be redirected to Google login. After signing in, you'll be redirected back.

## Frontend Integration

### Simple HTML/JavaScript
```html
<button onclick="window.location.href='http://localhost:9000/oauth/google'">
  Sign in with Google
</button>
```

### React
```jsx
const LoginButton = () => {
  const handleGoogleLogin = () => {
    window.location.href = 'http://localhost:9000/oauth/google';
  };

  return <button onClick={handleGoogleLogin}>Sign in with Google</button>;
};
```

### Check if User is Logged In
```javascript
// Get publishable API key first
const keyResponse = await fetch('http://localhost:9000/api/key-exchange');
const { publishableApiKey } = await keyResponse.json();

// Check auth status
const response = await fetch('http://localhost:9000/store/auth/me', {
  credentials: 'include',
  headers: {
    'x-publishable-api-key': publishableApiKey
  }
});

const data = await response.json();
if (data.customer) {
  console.log('User is logged in:', data.customer.email);
} else {
  console.log('User is not logged in');
}
```

## Available Endpoints

- `GET /oauth/google` - Start Google OAuth flow (no API key required)
- `GET /oauth/google/callback` - OAuth callback (handled automatically by Google, no API key required)
- `GET /store/auth/me` - Get current user info (requires API key)
- `POST /store/auth/logout` - Logout (requires API key)

## Production Setup

For production, update your environment variables and Google Console:

1. **Google Console**: Add production redirect URI
   ```
   https://your-domain.com/oauth/google/callback
   ```

2. **Environment Variables**:
   ```env
   GOOGLE_CALLBACK_URL=https://your-domain.com/oauth/google/callback
   STORE_CORS=https://your-frontend-domain.com
   ```

## How Frontend Redirect Works

After successful Google authentication, the backend automatically redirects to your frontend:

**Success**: `http://localhost:3000/auth/success` (or your `STORE_CORS` value)
**Error**: `http://localhost:3000/auth/error?message=...`

### Create Frontend Routes

You need to create these routes in your frontend to handle the OAuth response:

**Next.js Example** (`app/auth/success/page.tsx` or `pages/auth/success.js`):
```jsx
'use client'; // For Next.js App Router
import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // or 'next/router' for Pages Router

export default function AuthSuccess() {
  const router = useRouter();

  useEffect(() => {
    // User is authenticated, redirect to dashboard
    router.push('/dashboard');
  }, [router]);

  return <div>Authentication successful! Redirecting...</div>;
}
```

**React Example** (`src/pages/AuthSuccess.jsx`):
```jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // User is authenticated, redirect to home/dashboard
    navigate('/dashboard');
  }, [navigate]);

  return <div>Authentication successful! Redirecting...</div>;
}
```

**Error Page** (`app/auth/error/page.tsx` or `pages/auth/error.js`):
```jsx
'use client';
import { useSearchParams } from 'next/navigation';

export default function AuthError() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');

  return (
    <div>
      <h1>Authentication Failed</h1>
      <p>{message || 'An error occurred'}</p>
      <button onClick={() => window.location.href = '/'}>
        Go Home
      </button>
    </div>
  );
}
```

## Troubleshooting

**Error: "Redirect URI mismatch"**
- Make sure callback URL in `.env` exactly matches Google Console

**Error: "Invalid client"**
- Double-check Client ID and Secret (no extra spaces)
- Restart backend after adding variables

**Session not working**
- Use `credentials: 'include'` in fetch requests
- Enable cookies in browser

**Frontend redirect not working**
- Make sure `STORE_CORS` is set to your frontend URL
- Create the `/auth/success` and `/auth/error` routes in your frontend

📖 **For detailed documentation, see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)**

