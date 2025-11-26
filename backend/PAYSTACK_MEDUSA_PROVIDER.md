# Paystack Integration with medusa-payment-paystack

Complete guide for using the official `medusa-payment-paystack` provider.

---

## 🚀 Quick Setup

### Step 1: Install Package

```bash
cd backend

# Using pnpm
pnpm install medusa-payment-paystack

# Or using npm
npm install medusa-payment-paystack
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Paystack API Keys
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
```

**Get your keys:**
1. Sign up at [paystack.com](https://paystack.com)
2. Go to Settings > API Keys & Webhooks
3. Copy test keys (use live keys in production)

### Step 3: Restart Backend

```bash
pnpm dev
# or
npm run dev
```

**Done! ✅** The Paystack payment provider is now active.

---

## 📋 Configuration

The configuration is already set up in `medusa-config.js`:

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

The provider will automatically load when `PAYSTACK_SECRET_KEY` is set in your environment.

---

## 🔄 How It Works

### Backend Flow

The `medusa-payment-paystack` provider integrates with Medusa's payment system:

1. **Payment Session Creation**
   - Medusa creates a payment session with `paystack` as the provider
   - Paystack session includes authorization URL

2. **Customer Payment**
   - Frontend redirects customer to Paystack checkout
   - Customer completes payment on Paystack

3. **Payment Completion**
   - Medusa verifies payment with Paystack
   - Order is created on successful payment
   - Webhooks update payment status

### Integration with Checkout

The provider works seamlessly with your existing checkout flow:

```typescript
// Frontend sends delivery and payment data
POST /store/cart/complete
{
  "delivery": {
    "deliveryOption": "delivery",
    "streetAddress": "...",
    // ... other fields
  },
  "payment": {
    "paymentMethod": "paystack"  // or "card", mapped to paystack
  }
}
```

---

## 💻 Frontend Integration

### Using Medusa's Cart Completion

```typescript
async function completeCheckoutWithPaystack() {
  try {
    // 1. Update cart with payment provider
    await fetch('/store/cart', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payment_provider_id: 'paystack'
      })
    });

    // 2. Complete checkout
    const response = await fetch('/store/cart/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delivery: {
          deliveryOption: 'delivery',
          // ... delivery fields
        },
        payment: {
          paymentMethod: 'card', // Will use paystack provider
        },
        payment_provider_id: 'paystack'
      })
    });

    const { order } = await response.json();
    
    // 3. Order created successfully
    console.log('Order:', order);
  } catch (error) {
    console.error('Checkout failed:', error);
  }
}
```

### Direct Paystack Integration

For more control, use Paystack's inline popup:

```typescript
import { usePaystackPayment } from 'react-paystack';

function CheckoutPage() {
  const config = {
    reference: `PS_${Date.now()}`,
    email: customer.email,
    amount: cart.total, // Amount in kobo (pesewas)
    publicKey: 'pk_test_your_public_key',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = () => {
    initializePayment({
      onSuccess: async (reference) => {
        // Verify payment and create order
        await fetch('/store/cart/complete', {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            payment_reference: reference.reference,
            payment_provider_id: 'paystack'
          })
        });
      },
      onClose: () => {
        console.log('Payment cancelled');
      },
    });
  };

  return (
    <button onClick={handlePayment}>
      Pay with Paystack
    </button>
  );
}
```

---

## 🌍 Supported Features

### Payment Methods
- ✅ Card (Visa, Mastercard, Verve)
- ✅ Mobile Money (MTN, Vodafone, AirtelTigo)
- ✅ Bank Transfer
- ✅ USSD

### Currencies
- ✅ GHS (Ghana Cedis)
- ✅ NGN (Nigerian Naira)
- ✅ USD (US Dollars)
- ✅ ZAR (South African Rand)

### Features
- ✅ Payment authorization
- ✅ Payment capture
- ✅ Refunds
- ✅ Webhooks
- ✅ Payment verification
- ✅ Multi-currency support

---

## 🪝 Webhook Configuration

### 1. Get Webhook URL

Your webhook URL will be:
```
https://yourdomain.com/hooks/payment/paystack_paystack
```

**Note:** The path follows Medusa's convention: `/hooks/payment/{provider_id}_{provider_id}`

### 2. Configure in Paystack Dashboard

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Settings > API Keys & Webhooks
3. Add webhook URL
4. Events to listen for:
   - `charge.success`
   - `charge.failed`
   - `transfer.success`
   - `transfer.failed`

### 3. Test Webhook Locally

Use ngrok for local testing:

```bash
# Start ngrok
ngrok http 9000

# Use ngrok URL
https://abc123.ngrok.io/hooks/payment/paystack_paystack
```

---

## 🧪 Testing

### Test Cards

**Successful Payment:**
```
Card Number: 4084084084084081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

**Failed Payment:**
```
Card Number: 5060666666666666666
CVV: 123
Expiry: Any future date
```

### Test Mobile Money

Follow Paystack's [testing guide](https://paystack.com/docs/payments/test-payments) for mobile money test numbers.

### Test Flow

1. **Add items to cart:**
```bash
curl -X POST http://localhost:9000/store/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"variant_id": "variant_123", "quantity": 1}'
```

2. **Set payment provider:**
```bash
curl -X PATCH http://localhost:9000/store/cart \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"payment_provider_id": "paystack"}'
```

3. **Complete checkout:**
```bash
curl -X POST http://localhost:9000/store/cart/complete \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "delivery": {
      "deliveryOption": "delivery",
      "country": "Ghana",
      "streetAddress": "123 Independence Ave",
      "city": "Accra",
      "region": "Greater Accra",
      "phone": "+233244123456",
      "additionalPhone": "+233501234567",
      "email": "test@example.com"
    },
    "payment": {
      "paymentMethod": "card"
    },
    "payment_provider_id": "paystack"
  }'
```

---

## 🔧 Advanced Configuration

### Custom Options

You can pass additional options to the Paystack provider:

```javascript
{
  resolve: 'medusa-payment-paystack',
  id: 'paystack',
  options: {
    secret_key: PAYSTACK_SECRET_KEY,
    public_key: PAYSTACK_PUBLIC_KEY,
    // Custom webhook secret (optional)
    webhook_secret: process.env.PAYSTACK_WEBHOOK_SECRET,
    // Additional Paystack options
    channels: ['card', 'mobile_money', 'bank'],
    currency: 'GHS',
  },
}
```

### Multiple Payment Providers

You can have both Stripe and Paystack enabled:

```javascript
{
  key: Modules.PAYMENT,
  resolve: '@medusajs/payment',
  options: {
    providers: [
      {
        resolve: '@medusajs/payment-stripe',
        id: 'stripe',
        options: {
          apiKey: STRIPE_API_KEY,
          webhookSecret: STRIPE_WEBHOOK_SECRET,
        },
      },
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

Then customers can choose their preferred payment method.

---

## 🔐 Security Best Practices

1. **Never expose secret key**
   - Only use in backend
   - Keep in environment variables
   - Don't commit to git

2. **Use test keys in development**
   - `sk_test_...` for development
   - `sk_live_...` for production

3. **Verify webhooks**
   - Paystack sends signature in headers
   - Provider automatically verifies
   - Never trust unverified webhooks

4. **Use HTTPS in production**
   - Required by Paystack
   - Protects customer data
   - Required for PCI compliance

---

## 📦 Package Information

**Package:** `medusa-payment-paystack`  
**NPM:** [npmjs.com/package/medusa-payment-paystack](https://www.npmjs.com/package/medusa-payment-paystack)  
**GitHub:** [medusajs/medusa-payment-paystack](https://github.com/medusajs/medusa-payment-paystack)

---

## 🆘 Troubleshooting

### "Payment provider not found"

**Solution:**
1. Check `PAYSTACK_SECRET_KEY` is set in `.env`
2. Restart backend after adding env vars
3. Verify package is installed: `pnpm list medusa-payment-paystack`

### "Invalid API key"

**Solution:**
1. Verify API key is correct (starts with `sk_test_` or `sk_live_`)
2. Check for extra spaces or quotes in `.env`
3. Ensure key is from correct Paystack account

### "Webhook not working"

**Solution:**
1. Check webhook URL: `https://yourdomain.com/hooks/payment/paystack_paystack`
2. Verify webhook is configured in Paystack dashboard
3. Check backend logs for webhook events
4. Test locally with ngrok

### "Payment amount mismatch"

**Solution:**
- Amounts must be in smallest currency unit (pesewas for GHS)
- Example: GH₵ 50.00 = 5000 pesewas
- Medusa handles this automatically

---

## 🚦 Production Checklist

Before going live:

- [ ] Install `medusa-payment-paystack` package
- [ ] Get live API keys from Paystack
- [ ] Complete KYC verification with Paystack
- [ ] Update `.env` with live keys
- [ ] Configure webhook URL (production domain)
- [ ] Test webhook delivery
- [ ] Test with small real payment
- [ ] Enable HTTPS on backend
- [ ] Test all payment methods
- [ ] Setup error monitoring
- [ ] Document refund process
- [ ] Train support team

---

## 📚 Resources

### Paystack
- [Paystack Dashboard](https://dashboard.paystack.com)
- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Testing Guide](https://paystack.com/docs/payments/test-payments)
- [Paystack Support](https://paystack.com/support)

### Medusa
- [Medusa Payment Providers](https://docs.medusajs.com/resources/commerce-modules/payment)
- [medusa-payment-paystack](https://www.npmjs.com/package/medusa-payment-paystack)

### Kente & Bobs
- [Checkout Documentation](./CHECKOUT_FRONTEND_INTEGRATION.md)
- [Environment Variables](./ENVIRONMENT_VARIABLES.md)

---

## 🎉 Benefits Over Custom Implementation

Using `medusa-payment-paystack` instead of custom endpoints provides:

✅ **Better Integration**
- Native Medusa payment provider
- Works with all Medusa features
- Automatic webhook handling
- Standard payment flow

✅ **Less Code to Maintain**
- No custom endpoints needed
- Provider handles API calls
- Built-in error handling
- Community maintained

✅ **More Features**
- Refund support
- Payment capture
- Multi-currency
- Payment sessions

✅ **Future-Proof**
- Updates with Medusa
- Security patches
- New Paystack features
- Community support

---

**Status:** ✅ Production Ready  
**Last Updated:** November 26, 2024  
**Version:** Using official provider

