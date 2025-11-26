# Environment Variables Reference

Complete reference for all environment variables used in Kente & Bobs backend.

---

## Required Variables

These variables **must** be set for the backend to run:

### Database

```bash
# PostgreSQL database connection URL
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db
```

### Security

```bash
# JWT secret for signing tokens (generate with: openssl rand -base64 32)
JWT_SECRET=your-jwt-secret-here

# Cookie secret for signing cookies (generate with: openssl rand -base64 32)
COOKIE_SECRET=your-cookie-secret-here
```

---

## Optional Variables

### Redis (Recommended)

```bash
# Redis URL for caching and job queues
# If not set, will fallback to in-memory storage (not recommended for production)
REDIS_URL=redis://localhost:6379
```

### CORS Configuration

```bash
# Admin dashboard CORS origins (comma-separated)
ADMIN_CORS=http://localhost:9000,http://localhost:7001

# Authentication CORS origins
AUTH_CORS=http://localhost:8000

# Store/frontend CORS origins
STORE_CORS=http://localhost:8000
```

### Backend URL

```bash
# Public URL for the backend
BACKEND_PUBLIC_URL=http://localhost:9000

# Frontend URL (used for payment callbacks, etc.)
FRONTEND_URL=http://localhost:8000
```

---

## Payment Provider

### Paystack (Required)

```bash
# Paystack secret key (required)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key

# Paystack public key (recommended)
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

**Get Paystack keys:**
1. Sign up at [paystack.com](https://paystack.com)
2. Go to Settings > API Keys & Webhooks
3. Copy test keys (use live keys in production)

**Installation:**
```bash
pnpm install medusa-payment-paystack
```

**See:** [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md)

---

## Email Services

### Resend (Recommended)

```bash
# Resend API key
RESEND_API_KEY=re_your_api_key

# From email address
RESEND_FROM_EMAIL=noreply@yourdomain.com
# or
RESEND_FROM=noreply@yourdomain.com
```

### SendGrid (Alternative)

```bash
# SendGrid API key (don't use if using Resend)
SENDGRID_API_KEY=SG.your_api_key

# From email address
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
# or
SENDGRID_FROM=noreply@yourdomain.com
```

**Note:** Use either Resend OR SendGrid, not both.

---

## File Storage

### Cloudinary (Recommended)

```bash
# Cloudinary cloud name
CLOUDINARY_CLOUD_NAME=your-cloud-name

# Cloudinary API key
CLOUDINARY_API_KEY=your_api_key

# Cloudinary API secret
CLOUDINARY_API_SECRET=your_api_secret

# Cloudinary folder (optional)
CLOUDINARY_FOLDER=medusa-media
```

### MinIO (Alternative)

```bash
# MinIO endpoint
MINIO_ENDPOINT=localhost:9000

# MinIO access key
MINIO_ACCESS_KEY=minioadmin

# MinIO secret key
MINIO_SECRET_KEY=minioadmin

# MinIO bucket name (optional)
MINIO_BUCKET=medusa-media
```

**Priority:** Cloudinary > MinIO > Local Storage

---

## Search

### Meilisearch (Optional)

```bash
# Meilisearch host URL
MEILISEARCH_HOST=http://localhost:7700

# Meilisearch admin API key
MEILISEARCH_ADMIN_KEY=your_admin_key
```

---

## Authentication

### Google OAuth (Optional)

```bash
# Google OAuth client ID
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com

# Google OAuth client secret
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth callback URL (optional - auto-generated if not set)
GOOGLE_CALLBACK_URL=http://localhost:9000/oauth/google/callback
```

**See:** [GOOGLE_OAUTH_QUICK_START.md](./GOOGLE_OAUTH_QUICK_START.md)

---

## Server Configuration

### Worker Mode

```bash
# Worker mode: shared, worker, or server
MEDUSA_WORKER_MODE=shared
```

**Options:**
- `shared` - Single process handles both HTTP and jobs (default, good for development)
- `server` - Only handles HTTP requests
- `worker` - Only processes background jobs

### Admin Dashboard

```bash
# Disable admin dashboard (optional)
MEDUSA_DISABLE_ADMIN=false
```

---

## Example Configurations

### Minimal Setup (Development)

```bash
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# Recommended
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:8000
```

### Full Setup (Development)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# URLs
BACKEND_PUBLIC_URL=http://localhost:9000
FRONTEND_URL=http://localhost:8000

# CORS
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:8000
STORE_CORS=http://localhost:8000

# Payments - Paystack (Required)
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Email - Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Storage - Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Search
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=...

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Production Setup

```bash
# Database (use production database)
DATABASE_URL=postgresql://user:password@production-host:5432/medusa-db
REDIS_URL=redis://production-redis:6379

# Security (generate new secrets!)
JWT_SECRET=production-jwt-secret-very-long-and-random
COOKIE_SECRET=production-cookie-secret-very-long-and-random

# URLs (use production domains)
BACKEND_PUBLIC_URL=https://api.yourdomain.com
FRONTEND_URL=https://www.yourdomain.com

# CORS (use production domains)
ADMIN_CORS=https://admin.yourdomain.com
AUTH_CORS=https://www.yourdomain.com
STORE_CORS=https://www.yourdomain.com

# Payments - Paystack (use LIVE keys)
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# Email (production)
RESEND_API_KEY=re_production_key
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Storage (production)
CLOUDINARY_CLOUD_NAME=production-cloud
CLOUDINARY_API_KEY=production_key
CLOUDINARY_API_SECRET=production_secret

# Worker mode
MEDUSA_WORKER_MODE=shared
```

---

## Security Best Practices

### 1. Generate Strong Secrets

```bash
# Generate random secrets
openssl rand -base64 32

# Use different secrets for each environment
# Never reuse development secrets in production
```

### 2. Never Commit Secrets

```bash
# Add .env to .gitignore (already done)
# Never commit .env files
# Use environment variable management service in production
```

### 3. Use Environment-Specific Keys

- **Development:** Use test/development API keys
- **Production:** Use live/production API keys
- **Never mix:** Don't use production keys in development

### 4. Rotate Secrets Regularly

- Change JWT and cookie secrets periodically
- Update API keys if compromised
- Use different secrets across environments

---

## Validation

The backend will validate required environment variables on startup:

- `DATABASE_URL` - Required
- `JWT_SECRET` - Required
- `COOKIE_SECRET` - Required

If any required variable is missing, the backend will fail to start with a helpful error message.

---

## Getting API Keys

### Paystack
1. [paystack.com](https://paystack.com) - Sign up
2. Settings > API Keys & Webhooks
3. Copy test keys for development

### Resend
1. [resend.com](https://resend.com) - Sign up
2. API Keys section
3. Create new API key

### Cloudinary
1. [cloudinary.com](https://cloudinary.com) - Sign up
2. Dashboard shows all keys
3. Copy cloud name, API key, and secret

### Google OAuth
1. [console.cloud.google.com](https://console.cloud.google.com)
2. Create project
3. Enable Google+ API
4. Create OAuth credentials

---

## Troubleshooting

### "Environment variable for DATABASE_URL is not set"

**Solution:** Add `DATABASE_URL` to `.env` file

### "Paystack module not loaded"

**Solution:** Add `PAYSTACK_SECRET_KEY` to `.env` file

### "Email notifications not working"

**Solution:** Add `RESEND_API_KEY` or `SENDGRID_API_KEY` to `.env` file

### "File upload not working"

**Solution:** Add Cloudinary or MinIO credentials, or it will fallback to local storage

---

## Related Documentation

- [Paystack Setup](./PAYSTACK_QUICK_START.md)
- [Google OAuth Setup](./GOOGLE_OAUTH_QUICK_START.md)
- [Checkout Configuration](./CHECKOUT_README.md)

---

**Last Updated:** November 26, 2024

