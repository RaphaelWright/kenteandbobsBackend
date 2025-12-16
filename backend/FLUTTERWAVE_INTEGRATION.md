# Flutterwave Payment Integration Guide

## Overview

Flutterwave has been successfully integrated as an alternative payment provider alongside Paystack. Customers can now choose between Paystack and Flutterwave at checkout.

---

## Backend Implementation Complete ✅

### Environment Variables

Add these to your `.env` file:

```env
# Flutterwave Configuration
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret-hash
```

### API Endpoints Created

#### 1. Initialize Payment
```
POST /store/payments/flutterwave/initialize
```

**Request Body:**
```json
{
  "callback_url": "https://yoursite.com/checkout/verify",
  "payment_options": "card,mobilemoneyghana,ussd,banktransfer,account",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "payment_link": "https://checkout.flutterwave.com/...",
    "tx_ref": "FLW-1234567890-abcd1234",
    "amount": 10000,
    "currency": "ghs"
  }
}
```

#### 2. Verify Payment
```
POST /store/payments/flutterwave/verify
```

**Request Body:**
```json
{
  "tx_ref": "FLW-1234567890-abcd1234"
}
```
or
```json
{
  "transaction_id": "1234567"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "order": {
    "id": "order_123",
    "display_id": "1001",
    "email": "customer@example.com",
    "status": "pending",
    "payment_status": "captured",
    "total": 100.00,
    "currency_code": "ghs"
  },
  "payment": {
    "provider": "flutterwave",
    "reference": "FLW-1234567890-abcd1234",
    "transaction_id": "1234567",
    "status": "successful",
    "amount": 100.00,
    "currency": "GHS",
    "payment_type": "card"
  }
}
```

#### 3. Callback Handler
```
GET /store/payments/flutterwave/callback
```

Automatically handles redirects from Flutterwave after payment.

#### 4. Webhook Handler
```
POST /store/payments/flutterwave/webhook
```

Receives real-time payment status updates from Flutterwave.

**Webhook Configuration:**
- URL: `https://your-backend.com/store/payments/flutterwave/webhook`
- Secret Hash: Set in Flutterwave dashboard, use in `FLUTTERWAVE_WEBHOOK_SECRET`

---

## Frontend Integration Required 🚧

### 1. Update Order Metadata Types

Update your TypeScript interfaces to support multiple payment providers:

```typescript
// src/types/order.ts

interface OrderMetadata {
  payment_provider?: 'paystack' | 'flutterwave';
  payment_reference?: string;
  payment_transaction_id?: string;
  payment_status?: 'success' | 'pending' | 'failed';
  payment_captured?: boolean;
  payment_captured_at?: string;
  payment_paid_at?: string;
  payment_channel?: string;
  payment_method?: 'card' | 'mobile_money' | 'ussd' | 'bank_transfer' | 'account';
  delivery_option?: 'delivery' | 'pickup';
  additional_phone?: string;
  fulfillment_status?: string;
  fulfilled_at?: string;
  fulfilled_by?: string;
  // Additional metadata fields...
}
```

### 2. Add Payment Provider Selection

Create a payment provider selection component in your checkout flow:

```tsx
// src/components/checkout/PaymentProviderSelector.tsx

import React, { useState } from 'react';

interface PaymentProvider {
  id: 'paystack' | 'flutterwave';
  name: string;
  logo: string;
  description: string;
}

const providers: PaymentProvider[] = [
  {
    id: 'paystack',
    name: 'Paystack',
    logo: '/images/paystack-logo.png',
    description: 'Pay with card, mobile money, or bank transfer'
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    logo: '/images/flutterwave-logo.png',
    description: 'Pay with card, mobile money, USSD, or bank account'
  }
];

export const PaymentProviderSelector = ({ onSelect }: { onSelect: (provider: string) => void }) => {
  const [selected, setSelected] = useState<string>('paystack');

  const handleSelect = (providerId: string) => {
    setSelected(providerId);
    onSelect(providerId);
  };

  return (
    <div className="payment-provider-selector">
      <h3>Choose Payment Method</h3>
      <div className="provider-options">
        {providers.map(provider => (
          <div
            key={provider.id}
            className={`provider-option ${selected === provider.id ? 'selected' : ''}`}
            onClick={() => handleSelect(provider.id)}
          >
            <img src={provider.logo} alt={provider.name} />
            <div>
              <h4>{provider.name}</h4>
              <p>{provider.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. Update API Service

Add Flutterwave methods to your API service:

```typescript
// src/services/api.ts

export const paymentsApi = {
  // Paystack methods
  initializePaystack: async (data: any) => {
    const response = await api.post('/store/payments/paystack/initialize', data);
    return response.data;
  },

  // Flutterwave methods
  initializeFlutterwave: async (data: any) => {
    const response = await api.post('/store/payments/flutterwave/initialize', data);
    return response.data;
  },

  verifyFlutterwave: async (data: { tx_ref?: string; transaction_id?: string }) => {
    const response = await api.post('/store/payments/flutterwave/verify', data);
    return response.data;
  },
};
```

### 4. Update Checkout Flow

Modify your checkout component to handle both providers:

```tsx
// src/pages/CheckoutPage.tsx

const CheckoutPage = () => {
  const [selectedProvider, setSelectedProvider] = useState<'paystack' | 'flutterwave'>('paystack');

  const handlePayment = async () => {
    try {
      if (selectedProvider === 'paystack') {
        const result = await paymentsApi.initializePaystack({
          callback_url: `${window.location.origin}/checkout/verify`
        });
        // Redirect to Paystack
        window.location.href = result.data.authorization_url;
      } else {
        const result = await paymentsApi.initializeFlutterwave({
          callback_url: `${window.location.origin}/checkout/verify`
        });
        // Redirect to Flutterwave
        window.location.href = result.data.payment_link;
      }
    } catch (error) {
      console.error('Payment initialization failed:', error);
    }
  };

  return (
    <div>
      <PaymentProviderSelector onSelect={setSelectedProvider} />
      <button onClick={handlePayment}>Proceed to Payment</button>
    </div>
  );
};
```

### 5. Update Payment Verification Page

Handle both Paystack and Flutterwave verification:

```tsx
// src/pages/VerifyPaymentPage.tsx

const VerifyPaymentPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyPayment = async () => {
      const provider = searchParams.get('provider');
      
      if (provider === 'flutterwave') {
        const txRef = searchParams.get('tx_ref');
        const transactionId = searchParams.get('transaction_id');
        
        try {
          const result = await paymentsApi.verifyFlutterwave({ 
            tx_ref: txRef, 
            transaction_id: transactionId 
          });
          
          if (result.success) {
            navigate(`/order/confirmation/${result.order.id}`);
          }
        } catch (error) {
          navigate('/checkout/failed');
        }
      } else {
        // Handle Paystack verification
        const reference = searchParams.get('reference');
        // ... Paystack verification logic
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return <div>Verifying payment...</div>;
};
```

### 6. Update Payment Status Utility

Extend the payment status detection to recognize Flutterwave:

```typescript
// src/utils/paymentStatus.ts

export const getPaymentDetailsFromMetadata = (metadata: OrderMetadata | null | undefined) => {
  if (!metadata) return null;

  let parsedMetadata: OrderMetadata = metadata;
  if (typeof metadata === 'string') {
    try {
      parsedMetadata = JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  return {
    provider: parsedMetadata.payment_provider || null, // Now supports 'paystack' | 'flutterwave'
    reference: parsedMetadata.payment_reference || null,
    transactionId: parsedMetadata.payment_transaction_id || null,
    status: parsedMetadata.payment_status || null,
    captured: parsedMetadata.payment_captured || false,
    capturedAt: parsedMetadata.payment_captured_at || parsedMetadata.payment_paid_at || null,
    channel: parsedMetadata.payment_channel || null,
    method: parsedMetadata.payment_method || null,
  };
};
```

### 7. Update Orders Dashboard

Modify the orders dashboard to display Flutterwave payments:

```tsx
// src/components/orders/PaymentDetailsSection.tsx

const PaymentDetailsSection = ({ order }: { order: Order }) => {
  const paymentDetails = getPaymentDetailsFromMetadata(order.metadata);

  if (!paymentDetails) return null;

  return (
    <div className="payment-details">
      <h3>Payment Information</h3>
      
      <div className="detail-row">
        <span>Provider:</span>
        <span className="provider-badge">
          {paymentDetails.provider === 'flutterwave' ? (
            <img src="/images/flutterwave-icon.png" alt="Flutterwave" />
          ) : (
            <img src="/images/paystack-icon.png" alt="Paystack" />
          )}
          {paymentDetails.provider?.toUpperCase()}
        </span>
      </div>

      <div className="detail-row">
        <span>Reference:</span>
        <span>{paymentDetails.reference || 'N/A'}</span>
      </div>

      {paymentDetails.transactionId && (
        <div className="detail-row">
          <span>Transaction ID:</span>
          <span>{paymentDetails.transactionId}</span>
        </div>
      )}

      <div className="detail-row">
        <span>Payment Method:</span>
        <span>{paymentDetails.method || paymentDetails.channel || 'N/A'}</span>
      </div>

      {/* ... rest of payment details */}
    </div>
  );
};
```

---

## Payment Flow Comparison

| Feature | Paystack | Flutterwave |
|---------|----------|-------------|
| **Initialize Endpoint** | `/store/payments/paystack/initialize` | `/store/payments/flutterwave/initialize` |
| **Verify Endpoint** | Check via callback | `/store/payments/flutterwave/verify` |
| **Payment Reference** | `reference` | `tx_ref` or `transaction_id` |
| **Callback URL** | Backend handles | Backend handles |
| **Payment Methods** | Card, Mobile Money, Bank | Card, Mobile Money, USSD, Bank Transfer, Account |
| **Amount Format** | Smallest unit (pesewas) | Major unit (cedis) |
| **Webhook Events** | Various | `charge.completed`, etc. |

---

## Testing

### Test Cards (Flutterwave Sandbox)

```
Successful Payment:
Card Number: 5531886652142950
CVV: 564
Expiry: 09/32
PIN: 3310
OTP: 12345

Failed Payment:
Card Number: 5531886652142951
CVV: 564
Expiry: 09/32
```

### Test Mobile Money

Use Flutterwave's test phone numbers provided in their documentation.

### Webhook Testing

1. Use ngrok or similar tool to expose your local backend:
   ```bash
   ngrok http 9000
   ```

2. Set webhook URL in Flutterwave dashboard:
   ```
   https://your-ngrok-url.ngrok.io/store/payments/flutterwave/webhook
   ```

3. Test payment and monitor webhook events in logs

---

## Environment Variables Summary

```env
# Required
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx

# Optional
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your-secret-hash

# Also needed (existing)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:9000
```

---

## Security Considerations

1. **Never expose secret keys** in frontend code
2. **Always verify webhook signatures** using the secret hash
3. **Validate payment amounts** match cart totals
4. **Check payment status** from metadata before fulfilling orders
5. **Use HTTPS** in production for all payment endpoints
6. **Store webhook secrets** securely in environment variables

---

## Production Checklist

- [ ] Add production Flutterwave API keys
- [ ] Configure webhook URL in Flutterwave dashboard
- [ ] Set webhook secret hash
- [ ] Test all payment methods (card, mobile money, etc.)
- [ ] Verify webhook signature validation works
- [ ] Test order creation from both providers
- [ ] Update frontend with provider selection UI
- [ ] Add Flutterwave logo and branding
- [ ] Test payment verification flow
- [ ] Monitor payment success rates
- [ ] Set up error logging and monitoring

---

## Support

For Flutterwave API documentation:
- https://developer.flutterwave.com/docs
- https://developer.flutterwave.com/docs/payments

For integration support:
- Flutterwave Support: support@flutterwave.com
- Developer Slack: Request access via developer portal

---

## Troubleshooting

### Payment initialization fails
- Check `FLUTTERWAVE_SECRET_KEY` is set correctly
- Verify cart has items and valid total
- Check backend logs for API errors

### Webhook not receiving events
- Verify webhook URL is publicly accessible (use ngrok for local testing)
- Check webhook secret hash matches Flutterwave dashboard
- Monitor Flutterwave dashboard webhook logs

### Amount mismatch errors
- Ensure amounts are in correct format (cedis for Flutterwave, pesewas for internal)
- Check currency code is set correctly
- Review cart total calculation logic

### Order not created after payment
- Verify cart ID is passed in payment metadata
- Check cart still exists and hasn't been deleted
- Review verify endpoint logs for errors

