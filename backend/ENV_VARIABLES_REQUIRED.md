# Required Environment Variables

This document lists all required environment variables for the Kentenbobs backend.

## Core Configuration

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db

# Redis (for workflow engine)
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_here
COOKIE_SECRET=your_cookie_secret_here

# URLs
FRONTEND_URL=http://localhost:3000
ADMIN_URL=http://localhost:9000
STORE_URL=http://localhost:8000

# Environment
NODE_ENV=development
```

## Payment Gateway

### Paystack
```env
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key
```

## Email Service (Resend)

**Required for password reset and order notifications**

```env
# Get your API key from https://resend.com/
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

See [PASSWORD_RESET_SETUP.md](./PASSWORD_RESET_SETUP.md) for detailed setup instructions.

## Media Storage

### Cloudinary
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Email Service (Optional - Alternative)

### SendGrid (Alternative to Resend)
```env
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

## Search Service

### Meilisearch
```env
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_meilisearch_api_key
```

## Setup Instructions

1. Copy this template to your `.env` file
2. Replace all placeholder values with your actual credentials
3. Never commit your `.env` file to version control
4. Keep your API keys secure and rotate them regularly

## Getting Credentials

### Resend
1. Sign up at [https://resend.com/](https://resend.com/)
2. Get API key from dashboard
3. Verify your domain for production use

### Paystack
1. Sign up at [https://paystack.com/](https://paystack.com/)
2. Get test keys from dashboard
3. Switch to live keys for production

### Cloudinary
1. Sign up at [https://cloudinary.com/](https://cloudinary.com/)
2. Get credentials from dashboard

### SendGrid
1. Sign up at [https://sendgrid.com/](https://sendgrid.com/)
2. Create API key with mail send permissions

### Meilisearch
1. Install locally or use cloud service
2. Get master key from configuration

