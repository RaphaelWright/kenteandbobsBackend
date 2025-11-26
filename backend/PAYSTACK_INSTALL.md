# Install Paystack Payment Provider

Quick installation guide for `medusa-payment-paystack`.

---

## Installation

### Using pnpm (Recommended)

```bash
cd backend
pnpm install medusa-payment-paystack
```

### Using npm

```bash
cd backend
npm install medusa-payment-paystack
```

---

## Configuration

### 1. Add Environment Variables

Add to `backend/.env`:

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

### 2. Get Your API Keys

1. Sign up at [paystack.com](https://paystack.com)
2. Go to **Settings > API Keys & Webhooks**
3. Copy your test keys:
   - Secret Key: `sk_test_...`
   - Public Key: `pk_test_...`

### 3. Restart Backend

```bash
pnpm dev
# or
npm run dev
```

---

## Verify Installation

Check that Paystack is loaded:

```bash
# Check backend logs for:
# "Payment provider 'paystack' registered"
```

Or test with curl:

```bash
curl -X GET http://localhost:9000/store/payment-providers
```

You should see `paystack` in the list.

---

## Next Steps

- **Frontend Integration:** [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md#frontend-integration)
- **Testing:** [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md#testing)
- **Production Setup:** [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md#production-checklist)

---

## Configuration Details

The provider is automatically configured in `medusa-config.js`:

```javascript
{
  key: Modules.PAYMENT,
  resolve: '@medusajs/payment',
  options: {
    providers: [
      {
        resolve: 'medusa-payment-paystack',
        id: 'paystack',
        options: {
          secret_key: PAYSTACK_SECRET_KEY,
          public_key: PAYSTACK_PUBLIC_KEY,
        },
      },
    ],
  },
}
```

**The provider will only load if `PAYSTACK_SECRET_KEY` is set.**

---

## Troubleshooting

### Package not installing

```bash
# Clear cache and try again
pnpm store prune
pnpm install medusa-payment-paystack

# Or with npm
npm cache clean --force
npm install medusa-payment-paystack
```

### Provider not showing up

**Check:**
1. `PAYSTACK_SECRET_KEY` is set in `.env`
2. Backend was restarted after adding env vars
3. No typos in environment variable names
4. Package is installed: `pnpm list medusa-payment-paystack`

### "Cannot find module 'medusa-payment-paystack'"

**Solution:**
```bash
# Verify installation
ls node_modules/medusa-payment-paystack

# If missing, reinstall
pnpm install medusa-payment-paystack
```

---

## Support

- **Documentation:** [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md)
- **Package:** [npmjs.com/package/medusa-payment-paystack](https://www.npmjs.com/package/medusa-payment-paystack)
- **Paystack Support:** [paystack.com/support](https://paystack.com/support)

---

**Ready to use!** Check the [full documentation](./PAYSTACK_MEDUSA_PROVIDER.md) for integration details.

