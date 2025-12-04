# Paystack Payment Endpoints

Complete API documentation for Paystack payment integration.

---

## Quick Start

### 1. Set Environment Variables

```bash
# In backend/.env
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key
FRONTEND_URL=http://localhost:8000
```

### 2. Restart Backend

```bash
cd backend
pnpm dev
```

### 3. Test Payment Flow

```bash
# Initialize payment (requires auth session)
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{}'

# Visit authorization_url in browser
# Complete payment with test card

# Verify payment
curl "http://localhost:9000/store/payments/paystack/verify?reference=YOUR_REFERENCE" \
  -b cookies.txt
```

---

## Endpoints

### 1. Initialize Payment

**Endpoint:** `POST /store/payments/paystack/initialize`

**Authentication:** Required (session cookies)

**Description:** Creates a Paystack payment session for the current cart.

#### Request Headers

```
Content-Type: application/json
Cookie: connect.sid=your_session_cookie
```

#### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `callback_url` | string | No | URL to redirect after payment. Defaults to `FRONTEND_URL/checkout/verify` |
| `channels` | string[] | No | Payment channels to enable. Defaults to `["card", "mobile_money", "bank"]` |
| `metadata` | object | No | Additional metadata to attach to the payment |

#### Example Request

```json
{
  "callback_url": "https://yourdomain.com/checkout/verify",
  "channels": ["card", "mobile_money"],
  "metadata": {
    "order_notes": "Gift wrap please"
  }
}
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123xyz",
    "access_code": "abc123xyz",
    "reference": "PS_1701234567890_abc",
    "amount": 50000,
    "currency": "ghs"
  }
}
```

#### Error Responses

**401 Unauthorized**
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to initialize payment"
}
```

**400 Bad Request - Empty Cart**
```json
{
  "error": "Empty cart",
  "message": "Cart is empty. Add items before making payment"
}
```

**503 Service Unavailable**
```json
{
  "error": "Payment system not configured",
  "message": "Paystack is not configured. Please contact support."
}
```

---

### 2. Verify Payment

**Endpoint:** `GET /store/payments/paystack/verify`

**Authentication:** Required (session cookies)

**Description:** Verifies a Paystack payment and creates an order.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `reference` | string | Yes | Payment reference from initialization |

#### Example Request

```
GET /store/payments/paystack/verify?reference=PS_1701234567890_abc
```

#### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "order": {
    "id": "order_01abc123",
    "display_id": "1001",
    "status": "pending",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "total": 50000,
    "subtotal": 48000,
    "tax_total": 0,
    "shipping_total": 2000,
    "discount_total": 0,
    "items": [
      {
        "id": "item_01xyz",
        "title": "Kente Cloth",
        "subtitle": "Traditional Pattern",
        "thumbnail": "https://...",
        "quantity": 2,
        "unit_price": 24000,
        "total": 48000,
        "product_id": "prod_01abc",
        "variant_id": "variant_01xyz"
      }
    ],
    "shipping_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Accra",
      "country_code": "GH",
      "phone": "+233201234567"
    },
    "billing_address": null,
    "metadata": {
      "payment_provider": "paystack",
      "payment_reference": "PS_1701234567890_abc",
      "payment_status": "success",
      "payment_channel": "card"
    },
    "created_at": "2024-12-02T10:30:00.000Z",
    "updated_at": "2024-12-02T10:30:00.000Z"
  },
  "payment": {
    "reference": "PS_1701234567890_abc",
    "amount": 50000,
    "currency": "GHS",
    "status": "success",
    "channel": "card",
    "paid_at": "2024-12-02T10:29:55.000Z",
    "gateway_response": "Successful"
  }
}
```

#### Error Responses

**400 Bad Request - Missing Reference**
```json
{
  "error": "Missing reference",
  "message": "Payment reference is required"
}
```

**400 Bad Request - Payment Failed**
```json
{
  "error": "Payment not successful",
  "message": "Payment status: failed",
  "data": {
    "status": "failed",
    "reference": "PS_1701234567890_abc",
    "gateway_response": "Insufficient funds"
  }
}
```

**400 Bad Request - Amount Mismatch**
```json
{
  "error": "Amount mismatch",
  "message": "Payment amount does not match cart total",
  "details": {
    "paid_amount": 50000,
    "cart_total": 60000
  }
}
```

---

### 3. Webhook Handler

**Endpoint:** `POST /store/payments/paystack/webhook`

**Authentication:** Paystack signature verification

**Description:** Receives and processes Paystack webhook events.

#### Headers

| Header | Type | Required | Description |
|--------|------|----------|-------------|
| `x-paystack-signature` | string | Yes | HMAC SHA512 signature |

#### Supported Events

| Event | Description |
|-------|-------------|
| `charge.success` | Payment was successful |
| `charge.failed` | Payment failed |
| `transfer.success` | Transfer was successful |
| `transfer.failed` | Transfer failed |
| `refund.processed` | Refund was processed |

#### Example Webhook Payload

```json
{
  "event": "charge.success",
  "data": {
    "id": 123456789,
    "reference": "PS_1701234567890_abc",
    "amount": 50000,
    "currency": "GHS",
    "status": "success",
    "channel": "card",
    "paid_at": "2024-12-02T10:29:55.000Z",
    "metadata": {
      "cart_id": "cart_01abc",
      "customer_id": "cus_01xyz"
    }
  }
}
```

#### Response

Always returns `200 OK` to acknowledge receipt.

```json
{
  "message": "Webhook processed successfully"
}
```

---

### 4. Callback Handler

**Endpoint:** `GET /store/payments/paystack/callback`

**Description:** Handles Paystack redirect after payment completion.

#### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reference` | string | Payment reference |
| `trxref` | string | Alternative reference parameter |
| `status` | string | Payment status (success/cancelled) |

#### Behavior

- **On Success:** Redirects to `FRONTEND_URL/checkout/verify?reference=xxx`
- **On Cancel:** Redirects to `FRONTEND_URL/checkout?status=cancelled`
- **On Failure:** Redirects to `FRONTEND_URL/checkout/failed?reference=xxx`

---

## Frontend Integration

### React/Next.js Example

#### Checkout Page

```typescript
// components/CheckoutPage.tsx
import { useState } from "react";

interface PaymentState {
  isLoading: boolean;
  error: string | null;
}

export function CheckoutPage() {
  const [state, setState] = useState<PaymentState>({
    isLoading: false,
    error: null,
  });

  const handlePayWithPaystack = async () => {
    try {
      setState({ isLoading: true, error: null });

      const response = await fetch("/store/payments/paystack/initialize", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_url: `${window.location.origin}/checkout/verify`,
          channels: ["card", "mobile_money", "bank"],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to initialize payment");
      }

      // Redirect to Paystack checkout
      window.location.href = data.data.authorization_url;
    } catch (error: any) {
      setState({
        isLoading: false,
        error: error.message || "Payment initialization failed",
      });
    }
  };

  return (
    <div className="checkout-container">
      <h1>Checkout</h1>

      {state.error && (
        <div className="error-message">{state.error}</div>
      )}

      <button
        onClick={handlePayWithPaystack}
        disabled={state.isLoading}
        className="pay-button"
      >
        {state.isLoading ? "Processing..." : "Pay with Paystack"}
      </button>
    </div>
  );
}
```

#### Verification Page

```typescript
// pages/checkout/verify.tsx or app/checkout/verify/page.tsx
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Order {
  id: string;
  display_id: string;
  total: number;
  currency_code: string;
  items: any[];
}

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get("reference");

    if (!reference) {
      setStatus("error");
      setError("No payment reference found");
      return;
    }

    verifyPayment(reference);
  }, [searchParams]);

  const verifyPayment = async (reference: string) => {
    try {
      const response = await fetch(
        `/store/payments/paystack/verify?reference=${reference}`,
        { credentials: "include" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Payment verification failed");
      }

      setOrder(data.order);
      setStatus("success");

      // Redirect to order confirmation after delay
      setTimeout(() => {
        router.push(`/orders/${data.order.id}`);
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setError(err.message);
    }
  };

  if (status === "loading") {
    return (
      <div className="verify-container">
        <div className="spinner" />
        <p>Verifying payment...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="verify-container error">
        <h1>Payment Failed</h1>
        <p>{error}</p>
        <button onClick={() => router.push("/checkout")}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="verify-container success">
      <h1>✓ Payment Successful!</h1>
      <p>Order #{order?.display_id} created</p>
      <p>
        Total: GH₵ {((order?.total || 0) / 100).toFixed(2)}
      </p>
      <p>Redirecting to order details...</p>
    </div>
  );
}
```

#### Using Fetch API (Vanilla JS)

```javascript
// Initialize payment
async function initializePayment() {
  const response = await fetch('/store/payments/paystack/initialize', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  const data = await response.json();
  
  if (data.success) {
    window.location.href = data.data.authorization_url;
  } else {
    alert(data.message);
  }
}

// Verify payment (on callback page)
async function verifyPayment() {
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  
  if (!reference) {
    alert('No reference found');
    return;
  }
  
  const response = await fetch(
    `/store/payments/paystack/verify?reference=${reference}`,
    { credentials: 'include' }
  );
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Order created:', data.order);
    window.location.href = `/orders/${data.order.id}`;
  } else {
    alert(data.message);
  }
}
```

---

## Payment Flow Diagram

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Frontend  │                    │   Backend   │                    │   Paystack  │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │ 1. POST /payments/paystack/initialize                               │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │ 2. POST /transaction/initialize  │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │ 3. Return authorization_url      │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │ 4. Return payment data           │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │ 5. Redirect to authorization_url │                                  │
       │─────────────────────────────────────────────────────────────────────>
       │                                  │                                  │
       │                                  │                    6. Customer   │
       │                                  │                    completes     │
       │                                  │                    payment       │
       │                                  │                                  │
       │ 7. Redirect to callback_url?reference=xxx                           │
       │<─────────────────────────────────────────────────────────────────────
       │                                  │                                  │
       │ 8. GET /payments/paystack/verify?reference=xxx                      │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │ 9. GET /transaction/verify/:ref  │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │ 10. Return payment status        │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │                                  │ 11. Create order                 │
       │                                  │                                  │
       │ 12. Return order details         │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │ 13. Display confirmation         │                                  │
       │                                  │                                  │
```

---

## Test Cards

### Successful Payment

| Field | Value |
|-------|-------|
| Card Number | `4084 0840 8408 4081` |
| CVV | `408` |
| Expiry | Any future date |
| PIN | `0000` |
| OTP | `123456` |

### Failed Payment

| Field | Value |
|-------|-------|
| Card Number | `5060 6666 6666 6666 666` |
| CVV | `123` |
| Expiry | Any future date |

---

## Webhook Setup

### In Paystack Dashboard

1. Go to **Settings > API Keys & Webhooks**
2. Add Webhook URL: `https://yourdomain.com/store/payments/paystack/webhook`
3. Copy the webhook secret
4. Add to `.env`: `PAYSTACK_WEBHOOK_SECRET=whsec_...`

### Testing Locally with ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start ngrok tunnel
ngrok http 9000

# Use ngrok URL for webhook
# https://abc123.ngrok.io/store/payments/paystack/webhook
```

---

## Troubleshooting

### Payment initialization fails

**Possible causes:**
- Invalid API key
- User not logged in
- Cart is empty
- Amount is zero

**Solutions:**
```bash
# Check API key
echo $PAYSTACK_SECRET_KEY

# Ensure user is logged in (check for session cookie)
# Ensure cart has items with prices > 0
```

### Verification fails

**Possible causes:**
- Invalid reference
- Payment not completed
- Amount mismatch

**Solutions:**
- Check reference is correct
- Verify payment was completed on Paystack
- Check cart total matches payment amount

### Amount mismatch error

This happens when cart total changed between initialization and verification.

**Solution:**
Don't allow cart modifications after payment initialization.

---

## Security Best Practices

1. **Never expose secret key** - Only use on backend
2. **Always verify payments** - Never trust client-side data
3. **Verify webhook signatures** - Prevents fake webhook calls
4. **Use HTTPS in production** - Required for PCI compliance
5. **Store minimal payment data** - Never store card numbers

---

## Currency Support

| Currency | Code | Smallest Unit |
|----------|------|---------------|
| Ghana Cedis | GHS | Pesewas (1 GHS = 100 pesewas) |
| Nigerian Naira | NGN | Kobo (1 NGN = 100 kobo) |
| South African Rand | ZAR | Cents (1 ZAR = 100 cents) |
| US Dollar | USD | Cents (1 USD = 100 cents) |

**Note:** All amounts are stored and transmitted in the smallest unit (e.g., pesewas for GHS).

---

**Last Updated:** December 2, 2024  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

