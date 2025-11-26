# Setup Paystack as Only Payment Provider ✅

Your backend is now configured to use **Paystack only** (Stripe has been removed).

---

## 🎯 What Was Done

### ✅ Configuration Changes

1. **Removed Stripe from `medusa-config.js`**
   - Removed Stripe payment provider
   - Removed Stripe imports
   - Paystack is now the only payment provider

2. **Updated `src/lib/constants.ts`**
   - Removed Stripe environment variables
   - Kept only Paystack variables

3. **Updated Documentation**
   - Marked Paystack as primary payment provider
   - Removed Stripe references from env docs

---

## 🚀 Installation Steps

### Step 1: Install Paystack Package

```bash
cd backend
pnpm install medusa-payment-paystack
```

### Step 2: Add Environment Variables

Add to `backend/.env`:

```bash
# Required - Paystack Payment Provider
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

**Get your keys:**
1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Settings > API Keys & Webhooks
3. Copy test keys (use live keys in production)

### Step 3: (Optional) Remove Stripe Package

If you want to clean up, remove Stripe:

```bash
pnpm remove @medusajs/payment-stripe
```

### Step 4: Restart Backend

```bash
pnpm dev
```

**Done! ✅** Paystack is your only payment provider.

---

## ⚙️ Current Configuration

Your `medusa-config.js` now has:

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

**The payment module only loads if `PAYSTACK_SECRET_KEY` is set.**

---

## 💻 Frontend Integration

### With Checkout Flow

```typescript
// Complete checkout with Paystack
await fetch('/store/cart/complete', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    delivery: {
      deliveryOption: 'delivery',
      country: 'Ghana',
      streetAddress: '123 Independence Ave',
      city: 'Accra',
      region: 'Greater Accra',
      phone: '+233244123456',
      additionalPhone: '+233501234567',
      email: 'customer@example.com',
    },
    payment: {
      paymentMethod: 'card', // Will use Paystack
    },
    // Optional: explicitly specify Paystack
    payment_provider_id: 'paystack',
  }),
});
```

### Direct Paystack Popup

```typescript
import { usePaystackPayment } from 'react-paystack';

function CheckoutButton() {
  const config = {
    reference: `ORDER_${Date.now()}`,
    email: customer.email,
    amount: cart.total, // Amount in pesewas (kobo)
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  return (
    <button
      onClick={() => {
        initializePayment({
          onSuccess: async (ref) => {
            // Complete order on backend
            await fetch('/store/cart/complete', {
              method: 'POST',
              credentials: 'include',
              body: JSON.stringify({
                payment_reference: ref.reference,
                payment_provider_id: 'paystack',
              }),
            });
          },
          onClose: () => console.log('Payment cancelled'),
        });
      }}
    >
      Pay with Paystack
    </button>
  );
}
```

---

## 🌍 Paystack Features

### Payment Methods
- ✅ **Card** (Visa, Mastercard, Verve)
- ✅ **Mobile Money** (MTN, Vodafone, AirtelTigo) - Ghana
- ✅ **Bank Transfer**
- ✅ **USSD**
- ✅ **QR Code**

### Currencies
- ✅ **GHS** - Ghana Cedis (primary)
- ✅ **NGN** - Nigerian Naira
- ✅ **USD** - US Dollars
- ✅ **ZAR** - South African Rand
- ✅ **KES** - Kenyan Shilling

### Provider Features
- ✅ Payment authorization
- ✅ Payment capture
- ✅ Refunds
- ✅ Webhooks
- ✅ Multi-currency
- ✅ Recurring payments
- ✅ Split payments
- ✅ Saved cards

---

## 🪝 Webhook Configuration

### Webhook URL

```
https://yourdomain.com/hooks/payment/paystack_paystack
```

### Setup in Paystack Dashboard

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Settings > API Keys & Webhooks
3. Add webhook URL
4. Select events:
   - `charge.success` ✅
   - `charge.failed` ✅
   - `transfer.success`
   - `transfer.failed`
   - `refund.processed`

### Test Locally

```bash
# Install ngrok
ngrok http 9000

# Use ngrok URL for webhook
https://abc123.ngrok.io/hooks/payment/paystack_paystack
```

---

## 🧪 Testing

### Test Card (Success)

```
Card Number: 4084084084084081
CVV: 408
Expiry: Any future date (e.g., 12/25)
PIN: 0000
OTP: 123456
```

### Test Card (Failure)

```
Card Number: 5060666666666666666
CVV: 123
Expiry: Any future date
```

### Test Mobile Money

Follow Paystack's [testing guide](https://paystack.com/docs/payments/test-payments) for mobile money.

### Complete Test Flow

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "password"}'

# 2. Add item to cart
curl -X POST http://localhost:9000/store/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"variant_id": "variant_123", "quantity": 1}'

# 3. Checkout with Paystack
curl -X POST http://localhost:9000/store/cart/complete \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "delivery": {
      "deliveryOption": "delivery",
      "country": "Ghana",
      "streetAddress": "123 Independence Avenue",
      "city": "Accra",
      "region": "Greater Accra",
      "phone": "+233244123456",
      "additionalPhone": "+233501234567",
      "email": "test@example.com"
    },
    "payment": {
      "paymentMethod": "card"
    }
  }'
```

---

## 📁 Environment Variables

### Required

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db

# Security
JWT_SECRET=your-jwt-secret-here
COOKIE_SECRET=your-cookie-secret-here

# Payment Provider (Required)
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# URLs
FRONTEND_URL=http://localhost:8000
BACKEND_PUBLIC_URL=http://localhost:9000
```

### Optional

```bash
# Redis (recommended)
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# File Storage
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Search
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_ADMIN_KEY=...
```

---

## 🔐 Security

### Best Practices

1. **Never expose secret key**
   - Keep in `.env` file
   - Don't commit to git
   - Use environment variables in production

2. **Use test keys in development**
   - Test: `sk_test_...` and `pk_test_...`
   - Production: `sk_live_...` and `pk_live_...`

3. **Verify webhooks**
   - Paystack automatically verifies signatures
   - Don't trust unverified webhook data

4. **Use HTTPS in production**
   - Required by Paystack
   - Protects customer data
   - Required for PCI compliance

5. **Store minimal payment data**
   - Never store card numbers
   - Never store CVV
   - Only store payment reference and status

---

## 🚦 Production Checklist

Before going live:

- [ ] Install `medusa-payment-paystack`
- [ ] Get live API keys from Paystack
- [ ] Complete KYC verification
- [ ] Update `.env` with live keys
- [ ] Configure production webhook URL
- [ ] Test webhook delivery
- [ ] Test with small real payment (GH₵ 1)
- [ ] Enable HTTPS on backend
- [ ] Test all payment methods (card, mobile money)
- [ ] Setup error monitoring
- [ ] Document refund process
- [ ] Train support team on Paystack dashboard

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [PAYSTACK_OFFICIAL_SETUP.md](./PAYSTACK_OFFICIAL_SETUP.md) | Official provider setup |
| [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md) | Complete documentation |
| [PAYSTACK_INSTALL.md](./PAYSTACK_INSTALL.md) | Installation guide |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | All env vars |
| [CHECKOUT_FRONTEND_INTEGRATION.md](./CHECKOUT_FRONTEND_INTEGRATION.md) | Checkout guide |

---

## 🆘 Troubleshooting

### Paystack provider not loading

```bash
# Check if package is installed
pnpm list medusa-payment-paystack

# If not installed
pnpm install medusa-payment-paystack

# Check environment variable
echo $PAYSTACK_SECRET_KEY

# Restart backend
pnpm dev
```

### Payment fails

**Common causes:**
- API key is invalid
- Cart is empty
- User not logged in
- Amount is zero
- Network issue

**Solutions:**
- Verify API key starts with `sk_test_` or `sk_live_`
- Check cart has items
- Ensure user is authenticated
- Verify cart total > 0
- Check Paystack dashboard for errors

### Webhook not working

**Check:**
1. Webhook URL is correct
2. Webhook is configured in Paystack dashboard
3. Events are selected (`charge.success`, `charge.failed`)
4. Backend is accessible from internet (use ngrok for local)
5. Check backend logs for webhook events

---

## 📞 Support

### Paystack
- **Dashboard:** [dashboard.paystack.com](https://dashboard.paystack.com)
- **Docs:** [paystack.com/docs](https://paystack.com/docs)
- **Support:** [paystack.com/support](https://paystack.com/support)
- **Testing:** [paystack.com/docs/payments/test-payments](https://paystack.com/docs/payments/test-payments)

### Medusa
- **Docs:** [docs.medusajs.com](https://docs.medusajs.com)
- **Package:** [npmjs.com/package/medusa-payment-paystack](https://www.npmjs.com/package/medusa-payment-paystack)

---

## ✅ Summary

**What's Configured:**
- ✅ Paystack as only payment provider
- ✅ Stripe removed from configuration
- ✅ Ready to install `medusa-payment-paystack`
- ✅ Environment variables documented
- ✅ Checkout flow integrated

**What You Need to Do:**
1. `pnpm install medusa-payment-paystack`
2. Add `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` to `.env`
3. `pnpm dev`
4. Test with test card

**That's it! 🎉**

---

**Status:** ✅ Configuration Complete  
**Payment Provider:** Paystack Only  
**Last Updated:** November 26, 2024

