# Paystack Setup with Official Provider ✅

**Updated to use `medusa-payment-paystack` - the official Medusa payment provider**

---

## 🎯 What Changed

### Before (Custom Implementation)
- ❌ Custom Paystack service module
- ❌ Custom payment endpoints
- ❌ Manual payment flow

### After (Official Provider) ✅
- ✅ Official `medusa-payment-paystack` package
- ✅ Standard Medusa payment provider
- ✅ Native integration with Medusa
- ✅ Less code to maintain
- ✅ Better support and updates

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Install Package

```bash
cd backend
pnpm install medusa-payment-paystack
```

### Step 2: Add Environment Variables

Add to `.env`:

```bash
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
```

**Get keys from:** [Paystack Dashboard](https://dashboard.paystack.com) > Settings > API Keys

### Step 3: Restart Backend

```bash
pnpm dev
```

**Done! ✅** Paystack is now available as a payment provider.

---

## ⚙️ Configuration (Already Done)

The configuration is already set up in `medusa-config.js`:

```javascript
{
  key: Modules.PAYMENT,
  resolve: '@medusajs/payment',
  options: {
    providers: [
      // Stripe (if configured)
      ...(STRIPE_API_KEY ? [{...}] : []),
      
      // Paystack (if configured)
      ...(PAYSTACK_SECRET_KEY ? [{
        resolve: 'medusa-payment-paystack',
        id: 'paystack',
        options: {
          secret_key: PAYSTACK_SECRET_KEY,
          public_key: PAYSTACK_PUBLIC_KEY,
        },
      }] : []),
    ],
  },
}
```

**The provider loads automatically when `PAYSTACK_SECRET_KEY` is set.**

---

## 💻 How to Use in Frontend

### Option 1: Use with Checkout Flow (Recommended)

```typescript
// Complete checkout with Paystack
const response = await fetch('/store/cart/complete', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    delivery: {
      deliveryOption: 'delivery',
      streetAddress: '123 Main St',
      city: 'Accra',
      region: 'Greater Accra',
      phone: '+233244123456',
      additionalPhone: '+233501234567',
      email: 'customer@example.com',
    },
    payment: {
      paymentMethod: 'card',
    },
    payment_provider_id: 'paystack', // Use Paystack
  }),
});

const { order } = await response.json();
console.log('Order created:', order);
```

### Option 2: Direct Paystack Integration

```typescript
import { usePaystackPayment } from 'react-paystack';

function CheckoutButton() {
  const config = {
    reference: `PS_${Date.now()}`,
    email: customer.email,
    amount: cart.total, // In pesewas (kobo)
    publicKey: 'pk_test_your_public_key',
    currency: 'GHS',
  };

  const initializePayment = usePaystackPayment(config);

  const handlePayment = () => {
    initializePayment({
      onSuccess: async (reference) => {
        // Complete order
        await fetch('/store/cart/complete', {
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({
            payment_reference: reference.reference,
            payment_provider_id: 'paystack',
          }),
        });
      },
      onClose: () => console.log('Payment cancelled'),
    });
  };

  return <button onClick={handlePayment}>Pay with Paystack</button>;
}
```

---

## 🌍 Features

### Supported Payment Methods
- ✅ **Card** (Visa, Mastercard, Verve)
- ✅ **Mobile Money** (MTN, Vodafone, AirtelTigo)
- ✅ **Bank Transfer**
- ✅ **USSD**

### Supported Currencies
- ✅ **GHS** - Ghana Cedis (primary)
- ✅ **NGN** - Nigerian Naira
- ✅ **USD** - US Dollars
- ✅ **ZAR** - South African Rand

### Provider Features
- ✅ Payment authorization
- ✅ Payment capture
- ✅ Refunds
- ✅ Webhooks
- ✅ Multi-currency
- ✅ Automatic verification

---

## 🔄 How It Works

### Standard Flow

```
1. Customer fills checkout form
   ↓
2. Frontend calls /store/cart/complete with payment_provider_id: 'paystack'
   ↓
3. Medusa creates payment session with Paystack
   ↓
4. Customer redirected to Paystack for payment
   ↓
5. Customer completes payment
   ↓
6. Paystack redirects back to your site
   ↓
7. Medusa verifies payment
   ↓
8. Order created automatically
   ↓
9. Webhooks update status (if configured)
```

---

## 🪝 Webhook Setup

### 1. Webhook URL

Your webhook URL will be:
```
https://yourdomain.com/hooks/payment/paystack_paystack
```

### 2. Configure in Paystack

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Settings > API Keys & Webhooks
3. Add webhook URL
4. Select events:
   - `charge.success`
   - `charge.failed`
   - `transfer.success`
   - `transfer.failed`

### 3. Test Locally with ngrok

```bash
ngrok http 9000

# Use ngrok URL:
https://abc123.ngrok.io/hooks/payment/paystack_paystack
```

---

## 🧪 Testing

### Test Card

```
Card: 4084084084084081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

### Test Flow

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "password"}'

# 2. Add to cart
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

## 🔐 Security

- ✅ No card data stored on your server
- ✅ PCI compliant (via Paystack)
- ✅ Webhook signature verification
- ✅ Payment amount validation
- ✅ HTTPS required in production

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [PAYSTACK_INSTALL.md](./PAYSTACK_INSTALL.md) | Installation guide |
| [PAYSTACK_MEDUSA_PROVIDER.md](./PAYSTACK_MEDUSA_PROVIDER.md) | Complete documentation |
| [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) | All env vars |
| [CHECKOUT_FRONTEND_INTEGRATION.md](./CHECKOUT_FRONTEND_INTEGRATION.md) | Checkout guide |

---

## 🆘 Troubleshooting

### Provider not loading

```bash
# Check env var is set
echo $PAYSTACK_SECRET_KEY

# Verify package is installed
pnpm list medusa-payment-paystack

# Restart backend
pnpm dev
```

### Payment fails

- Check API key is valid
- Verify cart has items and total > 0
- Ensure user is logged in
- Check Paystack dashboard for errors

---

## 🚦 Production Checklist

- [ ] Install `medusa-payment-paystack`
- [ ] Get live API keys (start with `sk_live_`)
- [ ] Complete KYC with Paystack
- [ ] Update `.env` with live keys
- [ ] Configure webhook URL (production domain)
- [ ] Test webhook delivery
- [ ] Test with small real payment
- [ ] Enable HTTPS
- [ ] Setup error monitoring
- [ ] Train support team

---

## 🎉 Benefits

### vs Custom Implementation

| Feature | Custom | Official Provider |
|---------|--------|-------------------|
| **Integration** | Manual | Native |
| **Maintenance** | You | Community |
| **Updates** | Manual | Automatic |
| **Features** | Limited | Full |
| **Support** | Self | Community |
| **Webhooks** | Manual | Built-in |
| **Refunds** | Manual | Built-in |

### Advantages

✅ **Less code** - No custom endpoints needed  
✅ **Better integration** - Works with all Medusa features  
✅ **Automatic updates** - Bug fixes and improvements  
✅ **Community support** - Help from Medusa community  
✅ **Standard workflow** - Consistent with other providers  
✅ **Production tested** - Used by many merchants  

---

## 📞 Support

- **Paystack:** [paystack.com/support](https://paystack.com/support)
- **Package:** [npmjs.com/package/medusa-payment-paystack](https://www.npmjs.com/package/medusa-payment-paystack)
- **Medusa:** [docs.medusajs.com](https://docs.medusajs.com)

---

## 🔄 Migration from Custom Implementation

If you were using custom Paystack endpoints:

1. **Install official provider** (done)
2. **Update frontend** to use standard Medusa payment flow
3. **Remove custom endpoints** (optional - can keep for compatibility)
4. **Test thoroughly** with test cards
5. **Update webhooks** to new URL format

The custom endpoints at `/store/payments/paystack/*` will still work if you want to keep them for legacy support or special flows.

---

**Status:** ✅ Ready to use  
**Updated:** November 26, 2024  
**Provider:** Official `medusa-payment-paystack`

