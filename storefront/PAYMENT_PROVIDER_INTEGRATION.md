# Frontend Payment Provider Integration

This guide shows how to integrate Flutterwave payment provider selection into your React storefront.

## Quick Start

### 1. Install Dependencies

```bash
npm install axios @tanstack/react-query
```

### 2. Environment Variables

Create `.env` file in your frontend project:

```env
VITE_API_BASE_URL=http://localhost:9000
VITE_PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx
VITE_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx
```

## Example Implementation

### API Service

```typescript
// src/services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const paymentsApi = {
  // Paystack
  initializePaystack: async (data?: any) => {
    const response = await api.post('/store/payments/paystack/initialize', data || {});
    return response.data;
  },

  // Flutterwave
  initializeFlutterwave: async (data?: any) => {
    const response = await api.post('/store/payments/flutterwave/initialize', data || {});
    return response.data;
  },

  verifyFlutterwave: async (data: { tx_ref?: string; transaction_id?: string }) => {
    const response = await api.post('/store/payments/flutterwave/verify', data);
    return response.data;
  },
};

export default api;
```

### Payment Provider Selector Component

```tsx
// src/components/checkout/PaymentProviderSelector.tsx
import React from 'react';
import './PaymentProviderSelector.css';

export type PaymentProvider = 'paystack' | 'flutterwave';

interface Provider {
  id: PaymentProvider;
  name: string;
  description: string;
  methods: string[];
}

const providers: Provider[] = [
  {
    id: 'paystack',
    name: 'Paystack',
    description: 'Fast and secure payment processing',
    methods: ['Card', 'Mobile Money', 'Bank Transfer']
  },
  {
    id: 'flutterwave',
    name: 'Flutterwave',
    description: 'Pay with multiple options',
    methods: ['Card', 'Mobile Money', 'USSD', 'Bank Transfer', 'Bank Account']
  }
];

interface Props {
  value: PaymentProvider;
  onChange: (provider: PaymentProvider) => void;
}

export const PaymentProviderSelector: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="payment-provider-selector">
      <h3 className="selector-title">Choose Your Payment Method</h3>
      <div className="provider-grid">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className={`provider-card ${value === provider.id ? 'selected' : ''}`}
            onClick={() => onChange(provider.id)}
          >
            <div className="provider-header">
              <div className="provider-logo">
                {provider.id === 'paystack' ? '💳' : '🦋'}
              </div>
              <div className="provider-name">{provider.name}</div>
            </div>
            <p className="provider-description">{provider.description}</p>
            <div className="provider-methods">
              {provider.methods.map((method) => (
                <span key={method} className="method-badge">{method}</span>
              ))}
            </div>
            {value === provider.id && (
              <div className="selected-indicator">✓ Selected</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

### CSS Styles

```css
/* src/components/checkout/PaymentProviderSelector.css */
.payment-provider-selector {
  margin: 2rem 0;
}

.selector-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #1f2937;
}

.provider-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.provider-card {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.provider-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.provider-card.selected {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.provider-logo {
  font-size: 2rem;
}

.provider-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.provider-description {
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

.provider-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.method-badge {
  background-color: #f3f4f6;
  color: #4b5563;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.selected-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background-color: #3b82f6;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}
```

### Checkout Page Integration

```tsx
// src/pages/CheckoutPage.tsx
import React, { useState } from 'react';
import { PaymentProviderSelector, PaymentProvider } from '../components/checkout/PaymentProviderSelector';
import { paymentsApi } from '../services/api';

export const CheckoutPage: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('paystack');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      if (selectedProvider === 'paystack') {
        const result = await paymentsApi.initializePaystack({
          callback_url: `${window.location.origin}/checkout/verify`,
        });
        
        // Redirect to Paystack payment page
        window.location.href = result.data.authorization_url;
      } else if (selectedProvider === 'flutterwave') {
        const result = await paymentsApi.initializeFlutterwave({
          callback_url: `${window.location.origin}/checkout/verify`,
          payment_options: 'card,mobilemoneyghana,ussd,banktransfer,account',
        });
        
        // Redirect to Flutterwave payment page
        window.location.href = result.data.payment_link;
      }
    } catch (error) {
      console.error('Payment initialization failed:', error);
      alert('Failed to initialize payment. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Checkout</h1>
        
        {/* Order Summary */}
        <div className="order-summary">
          <h2>Order Summary</h2>
          {/* Your order items here */}
        </div>

        {/* Payment Provider Selection */}
        <PaymentProviderSelector
          value={selectedProvider}
          onChange={setSelectedProvider}
        />

        {/* Proceed Button */}
        <button
          className="proceed-button"
          onClick={handlePayment}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Proceed to Payment'}
        </button>
      </div>
    </div>
  );
};
```

### Payment Verification Page

```tsx
// src/pages/VerifyPaymentPage.tsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentsApi } from '../services/api';

export const VerifyPaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      const provider = searchParams.get('provider');
      
      try {
        if (provider === 'flutterwave') {
          // Flutterwave verification
          const txRef = searchParams.get('tx_ref');
          const transactionId = searchParams.get('transaction_id');
          
          if (!txRef && !transactionId) {
            setStatus('failed');
            return;
          }

          const result = await paymentsApi.verifyFlutterwave({
            tx_ref: txRef || undefined,
            transaction_id: transactionId || undefined,
          });

          if (result.success) {
            setStatus('success');
            setOrderDetails(result.order);
            
            // Redirect to order confirmation after 2 seconds
            setTimeout(() => {
              navigate(`/order/${result.order.id}`);
            }, 2000);
          } else {
            setStatus('failed');
          }
        } else {
          // Paystack verification (handled by callback)
          const reference = searchParams.get('reference');
          
          if (reference) {
            // Your Paystack verification logic here
            setStatus('success');
          } else {
            setStatus('failed');
          }
        }
      } catch (error) {
        console.error('Payment verification failed:', error);
        setStatus('failed');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  if (status === 'verifying') {
    return (
      <div className="verify-page">
        <div className="verify-container">
          <div className="spinner"></div>
          <h2>Verifying your payment...</h2>
          <p>Please wait while we confirm your payment</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="verify-page">
        <div className="verify-container success">
          <div className="success-icon">✓</div>
          <h2>Payment Successful!</h2>
          <p>Your order has been placed successfully</p>
          {orderDetails && (
            <div className="order-info">
              <p>Order ID: {orderDetails.display_id}</p>
              <p>Total: {orderDetails.currency_code?.toUpperCase()} {(orderDetails.total / 100).toFixed(2)}</p>
            </div>
          )}
          <p className="redirect-message">Redirecting to order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-container failed">
        <div className="failed-icon">✕</div>
        <h2>Payment Failed</h2>
        <p>We couldn't verify your payment. Please try again.</p>
        <button onClick={() => navigate('/checkout')}>
          Return to Checkout
        </button>
      </div>
    </div>
  );
};
```

### TypeScript Types

```typescript
// src/types/payment.ts

export type PaymentProvider = 'paystack' | 'flutterwave';

export interface PaymentInitializeResponse {
  success: boolean;
  message: string;
  data: {
    payment_link?: string;
    authorization_url?: string;
    tx_ref?: string;
    reference?: string;
    amount: number;
    currency: string;
  };
}

export interface PaymentVerifyResponse {
  success: boolean;
  message: string;
  order: {
    id: string;
    display_id: string;
    email: string;
    status: string;
    payment_status: string;
    total: number;
    currency_code: string;
  };
  payment: {
    provider: PaymentProvider;
    reference: string;
    transaction_id: string;
    status: string;
    amount: number;
    currency: string;
  };
}
```

### Update Order Metadata Types

```typescript
// src/types/order.ts

export interface OrderMetadata {
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
}

export interface Order {
  id: string;
  display_id: string;
  status: string;
  email: string;
  total: number;
  currency_code: string;
  payment_status: 'captured' | 'awaiting' | 'failed' | 'not_paid';
  fulfillment_status: 'fulfilled' | 'not_fulfilled';
  metadata: OrderMetadata;
  items: OrderItem[];
  created_at: string;
}
```

## Integration Checklist

- [ ] Install required dependencies
- [ ] Set environment variables
- [ ] Create API service with both providers
- [ ] Implement PaymentProviderSelector component
- [ ] Add provider selection to checkout page
- [ ] Implement payment verification page
- [ ] Update TypeScript types
- [ ] Test Paystack flow
- [ ] Test Flutterwave flow
- [ ] Add error handling
- [ ] Style components to match your design
- [ ] Test on mobile devices

## Notes

- Both providers redirect users to their respective payment pages
- Payment verification happens after redirect back to your site
- Order creation happens during verification (backend)
- Always use HTTPS in production
- Never expose secret keys in frontend code
- Test thoroughly with sandbox/test credentials before going live

