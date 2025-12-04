# Paystack Payment Integration

Complete guide for integrating Paystack payments into Kente & Bobs e-commerce platform.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Payment Flow](#payment-flow)
4. [API Endpoints](#api-endpoints)
5. [Frontend Integration](#frontend-integration)
6. [Webhook Configuration](#webhook-configuration)
7. [Testing](#testing)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Paystack is a payment gateway popular in Ghana, Nigeria, and other African countries. It supports:

- **Card Payments** (Visa, Mastercard, Verve)
- **Mobile Money** (MTN, Vodafone, AirtelTigo)
- **Bank Transfers**
- **USSD**

### Why Paystack?

- ✅ Native support for Ghana cedis (GHS)
- ✅ Mobile money integration
- ✅ Low transaction fees
- ✅ Easy KYC process
- ✅ Excellent developer experience

---

## Setup

### 1. Get Paystack API Keys

1. Sign up at [Paystack](https://paystack.com)
2. Complete KYC verification
3. Get your API keys from Dashboard > Settings > API Keys & Webhooks

You'll need:
- **Secret Key** (`sk_test_...` for test, `sk_live_...` for production)
- **Public Key** (`pk_test_...` for test, `pk_live_...` for production)

### 2. Configure Environment Variables

Add to your `.env` file:

```bash
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# Frontend URL (for payment callbacks)
FRONTEND_URL=http://localhost:8000
```

### 3. Restart Your Backend

```bash
cd backend
npm run dev
# or
pnpm dev
```

The Paystack module will be automatically loaded if `PAYSTACK_SECRET_KEY` is set.

---

## Payment Flow

### Standard Payment Flow

```
1. Customer fills checkout form
   ↓
2. Frontend calls /store/payments/paystack/initialize
   ↓
3. Backend creates payment session with Paystack
   ↓
4. Backend returns authorization_url
   ↓
5. Frontend redirects user to Paystack payment page
   ↓
6. Customer completes payment on Paystack
   ↓
7. Paystack redirects back to callback URL
   ↓
8. Frontend calls /store/payments/paystack/verify
   ↓
9. Backend verifies payment with Paystack
   ↓
10. Backend creates order
    ↓
11. Frontend shows order confirmation
```

### Webhook Flow (Redundancy)

```
1. Customer completes payment
   ↓
2. Paystack sends webhook to /store/payments/paystack/webhook
   ↓
3. Backend verifies webhook signature
   ↓
4. Backend processes event (e.g., charge.success)
   ↓
5. Backend updates order status (if needed)
```

---

## API Endpoints

### 1. Initialize Payment

**Endpoint:** `POST /store/payments/paystack/initialize`

**Authentication:** Required (session cookies)

**Description:** Initialize a Paystack payment session for the current cart.

**Request Body:**

```json
{
  "callback_url": "https://yourdomain.com/checkout/verify",
  "channels": ["card", "mobile_money", "bank"]
}
```

**Fields:**
- `callback_url` (optional): URL to redirect after payment (defaults to `FRONTEND_URL/checkout/verify`)
- `channels` (optional): Payment channels to enable (defaults to `["card", "mobile_money", "bank"]`)

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123",
    "access_code": "abc123xyz",
    "reference": "PS_1234567890_xyz",
    "amount": 50000,
    "currency": "ghs"
  }
}
```

**Usage:**

```typescript
async function initializePayment() {
  const response = await fetch('/store/payments/paystack/initialize', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_url: `${window.location.origin}/checkout/verify`,
      channels: ['card', 'mobile_money']
    })
  });

  const data = await response.json();
  
  if (data.success) {
    // Redirect to Paystack
    window.location.href = data.data.authorization_url;
  }
}
```

---

### 2. Verify Payment

**Endpoint:** `GET /store/payments/paystack/verify?reference=xxx`

**Authentication:** Required (session cookies)

**Description:** Verify a payment and create an order.

**Query Parameters:**
- `reference` (required): Payment reference returned from initialization

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "order": {
    "id": "order_123",
    "display_id": "1001",
    "status": "pending",
    "total": 50000,
    "currency_code": "ghs",
    "items": [...],
    "payment": {
      "provider": "paystack",
      "reference": "PS_1234567890_xyz",
      "status": "success",
      "channel": "card",
      "paid_at": "2024-11-26T10:30:00Z"
    }
  },
  "payment": {
    "reference": "PS_1234567890_xyz",
    "amount": 50000,
    "currency": "GHS",
    "status": "success",
    "channel": "card",
    "paid_at": "2024-11-26T10:30:00Z",
    "gateway_response": "Successful"
  }
}
```

**Error Response:** `400 Bad Request`

```json
{
  "error": "Payment not successful",
  "message": "Payment status: failed",
  "data": {
    "status": "failed",
    "reference": "PS_1234567890_xyz",
    "gateway_response": "Insufficient funds"
  }
}
```

**Usage:**

```typescript
async function verifyPayment(reference: string) {
  const response = await fetch(`/store/payments/paystack/verify?reference=${reference}`, {
    credentials: 'include'
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Order created:', data.order);
    // Redirect to order confirmation
    window.location.href = `/orders/${data.order.id}`;
  } else {
    console.error('Payment failed:', data.message);
    // Show error message
  }
}
```

---

### 3. Webhook Handler

**Endpoint:** `POST /store/payments/paystack/webhook`

**Authentication:** Webhook signature verification

**Description:** Receive and process Paystack webhook events.

**Headers:**
- `x-paystack-signature`: Webhook signature for verification

**Request Body:** (from Paystack)

```json
{
  "event": "charge.success",
  "data": {
    "id": 123456,
    "reference": "PS_1234567890_xyz",
    "amount": 50000,
    "currency": "GHS",
    "status": "success",
    "channel": "card",
    "paid_at": "2024-11-26T10:30:00Z",
    "metadata": {
      "cart_id": "cart_xyz",
      "customer_id": "cus_123"
    }
  }
}
```

**Supported Events:**
- `charge.success` - Payment successful
- `charge.failed` - Payment failed
- `transfer.success` - Transfer successful
- `transfer.failed` - Transfer failed
- `refund.processed` - Refund processed

**Response:** `200 OK` (always, even if processing fails)

---

### 4. Callback Handler

**Endpoint:** `GET /store/payments/paystack/callback?reference=xxx&trxref=xxx`

**Description:** Handle Paystack redirect callback after payment.

**Query Parameters:**
- `reference` or `trxref`: Payment reference
- `status`: Payment status (success/failed)

**Behavior:**
- Redirects to `FRONTEND_URL/checkout/verify?reference=xxx` on success
- Redirects to `FRONTEND_URL/checkout/failed?reference=xxx` on failure

---

## Frontend Integration

### Complete Frontend Example

```typescript
// CheckoutPage.tsx
import { useState } from "react";

interface PaymentState {
  isInitializing: boolean;
  isVerifying: boolean;
  error: string | null;
}

export function CheckoutPage() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    isInitializing: false,
    isVerifying: false,
    error: null,
  });

  // Initialize payment and redirect to Paystack
  const handlePayWithPaystack = async () => {
    try {
      setPaymentState({ isInitializing: true, isVerifying: false, error: null });

      const response = await fetch('/store/payments/paystack/initialize', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_url: `${window.location.origin}/checkout/verify`,
          channels: ['card', 'mobile_money', 'bank']
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to initialize payment');
      }

      // Redirect to Paystack
      window.location.href = data.data.authorization_url;
    } catch (error) {
      console.error('Payment initialization error:', error);
      setPaymentState({
        isInitializing: false,
        isVerifying: false,
        error: error.message
      });
    }
  };

  return (
    <div>
      <h1>Checkout</h1>
      
      {paymentState.error && (
        <div className="error">
          {paymentState.error}
        </div>
      )}

      <button
        onClick={handlePayWithPaystack}
        disabled={paymentState.isInitializing}
      >
        {paymentState.isInitializing ? 'Initializing...' : 'Pay with Paystack'}
      </button>
    </div>
  );
}
```

### Verification Page

```typescript
// VerifyPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference');
    
    if (!reference) {
      setStatus('error');
      setError('No payment reference found');
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(
        `/store/payments/paystack/verify?reference=${reference}`,
        { credentials: 'include' }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Payment verification failed');
      }

      setOrder(data.order);
      setStatus('success');

      // Redirect to order page after 3 seconds
      setTimeout(() => {
        navigate(`/orders/${data.order.id}`);
      }, 3000);
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      setError(error.message);
    }
  };

  if (status === 'verifying') {
    return <div>Verifying payment...</div>;
  }

  if (status === 'error') {
    return (
      <div>
        <h1>Payment Failed</h1>
        <p>{error}</p>
        <button onClick={() => navigate('/checkout')}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Order #{order.display_id} created successfully</p>
      <p>Total: GH₵ {(order.total / 100).toFixed(2)}</p>
      <p>Redirecting to order page...</p>
    </div>
  );
}
```

---

## Webhook Configuration

### 1. Setup Webhook URL

In your Paystack Dashboard:

1. Go to **Settings > API Keys & Webhooks**
2. Add webhook URL: `https://yourdomain.com/store/payments/paystack/webhook`
3. Copy the webhook secret
4. Add to `.env`: `PAYSTACK_WEBHOOK_SECRET=whsec_...`

### 2. Test Webhook Locally

Use ngrok or similar tool:

```bash
# Start ngrok
ngrok http 9000

# Use ngrok URL for webhook
https://abc123.ngrok.io/store/payments/paystack/webhook
```

### 3. Webhook Events

The webhook handler automatically processes:
- `charge.success` - Payment successful
- `charge.failed` - Payment failed
- `transfer.success` - Transfer successful
- `transfer.failed` - Transfer failed
- `refund.processed` - Refund processed

---

## Testing

### Test Mode

Use test API keys for development:

```bash
PAYSTACK_SECRET_KEY=sk_test_your_test_key
PAYSTACK_PUBLIC_KEY=pk_test_your_test_key
```

### Test Cards

**Successful Payment:**
```
Card: 4084084084084081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

**Failed Payment:**
```
Card: 5060666666666666666
CVV: 123
Expiry: Any future date
```

**Mobile Money Test:**
- Use test mode credentials
- Follow Paystack's mobile money testing guide

### Test Flow

1. **Initialize Payment:**
```bash
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "callback_url": "http://localhost:8000/checkout/verify",
    "channels": ["card", "mobile_money"]
  }'
```

2. **Visit authorization_url** in browser

3. **Complete payment** with test card

4. **Verify payment:**
```bash
curl http://localhost:9000/store/payments/paystack/verify?reference=PS_xxx \
  -b cookies.txt
```

---

## Security

### Best Practices

1. **Never expose secret key:**
   - Only use on backend
   - Don't commit to git
   - Use environment variables

2. **Always verify payments:**
   - Don't trust client-side data
   - Always verify with Paystack API
   - Check amount matches cart total

3. **Verify webhook signatures:**
   - Always verify `x-paystack-signature`
   - Prevents fake webhook calls
   - Configured automatically

4. **Use HTTPS in production:**
   - Required for PCI compliance
   - Protects customer data
   - Required by Paystack

5. **Store minimal payment data:**
   - Never store card numbers or CVV
   - Only store reference and status
   - Use Paystack's tokenization

### PCI Compliance

- Payment form is hosted by Paystack (PCI compliant)
- No card data touches your server
- Automatically compliant when using Paystack Inline

---

## Troubleshooting

### Issue: "Paystack module not loaded"

**Solution:**
```bash
# Check environment variable is set
echo $PAYSTACK_SECRET_KEY

# If not set, add to .env:
PAYSTACK_SECRET_KEY=sk_test_your_key_here

# Restart server
npm run dev
```

### Issue: "Customer not found" / "Unable to find customer profile"

**Causes:**
- User is authenticated but doesn't have a customer record in Medusa yet
- Customer creation failed during signup

**Solution:**
✅ **FIXED** - The system now auto-creates customer records during payment initialization if they don't exist.
- If you still see this error, check that the user is properly authenticated
- Verify `authContext.actor_id` contains the user's email
- Check backend logs for customer creation errors

### Issue: "Payment initialization failed"

**Causes:**
- Invalid API key
- Cart is empty
- User not authenticated
- Amount is zero

**Solution:**
- Check API key is correct
- Ensure cart has items
- Ensure user is logged in
- Verify cart total > 0

### Issue: "Verification failed"

**Causes:**
- Invalid payment reference
- Payment not completed
- Amount mismatch
- Network error

**Solution:**
- Check reference is correct
- Ensure payment was completed on Paystack
- Verify cart total matches payment amount
- Check Paystack dashboard for payment status

### Issue: "Webhook not working"

**Causes:**
- Incorrect webhook URL
- Invalid webhook secret
- Signature verification failed
- Firewall blocking

**Solution:**
- Check webhook URL in Paystack dashboard
- Verify PAYSTACK_WEBHOOK_SECRET is correct
- Test locally with ngrok
- Check server logs

### Issue: "Mobile money not showing"

**Causes:**
- Not enabled in channels
- Not supported in test mode
- Business not verified

**Solution:**
```typescript
// Ensure mobile_money is in channels
channels: ['card', 'mobile_money', 'bank']

// Complete KYC verification for production
// Test mode has limited mobile money support
```

---

## Support

### Paystack Resources

- [Paystack Documentation](https://paystack.com/docs)
- [API Reference](https://paystack.com/docs/api)
- [Testing Guide](https://paystack.com/docs/payments/test-payments)
- [Support](https://paystack.com/support)

### Kente & Bobs Resources

- [Checkout Documentation](./CHECKOUT_FRONTEND_INTEGRATION.md)
- [Quick Reference](./CHECKOUT_QUICK_REFERENCE.md)
- [API Endpoints](./CHECKOUT_ENDPOINTS.md)

---

**Last Updated:** November 26, 2024  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

