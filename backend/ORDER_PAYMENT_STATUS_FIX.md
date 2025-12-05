# Order Payment Status Fix

**Issue:** Order payment status was not updating after payment was made.

**Date Fixed:** December 5, 2025

---

## 🔍 Problem Analysis

### Two Checkout Flows Discovered

Your system has **two different checkout flows** that were handling payment status differently:

#### Flow 1: Paystack Payment Flow ✅ (Working Correctly)
```
1. Initialize Payment → POST /store/payments/paystack/initialize
2. User pays on Paystack checkout page
3. Verify Payment → GET /store/payments/paystack/verify?reference=xxx
4. Order created with payment_status = "success"
```

**Status:** This flow was working correctly and properly setting payment status.

#### Flow 2: Regular Checkout Flow ❌ (Not Updating Payment Status)
```
1. Complete Cart → POST /store/cart/complete
2. Order created WITHOUT payment status metadata
3. Payment made somehow (???)
4. Payment status NEVER updated on order
```

**Status:** This flow was creating orders but **NOT tracking payment status**.

---

## 🐛 Root Cause

### Issue 1: Missing Payment Metadata in Cart Complete

**File:** `src/api/store/cart/complete/route.ts`

When orders were created via `/store/cart/complete`, the metadata only included:
- ✅ `delivery_option`
- ✅ `payment_method`
- ✅ `additional_phone`

But was **missing**:
- ❌ `payment_status`
- ❌ `payment_captured`
- ❌ `payment_reference`
- ❌ `payment_initialized_at`

### Issue 2: No Way to Update Payment Status

There was **no endpoint** to update an order's payment status after payment was completed.

### Issue 3: Order Endpoints Check Missing Fields

**Files:** 
- `src/api/store/orders/[id]/route.ts` (lines 112-125)
- `src/api/store/orders/route.ts` (lines 106-119)

Both endpoints check for:
```typescript
if (order.metadata?.payment_status === "success" || 
    order.metadata?.payment_captured === true) {
  paymentStatus = "captured";
}
```

Since orders from `/store/cart/complete` never had these fields, they always showed as `"not_paid"`.

---

## ✅ Solutions Implemented

### Fix 1: Added Payment Status Metadata to Cart Complete

**File:** `src/api/store/cart/complete/route.ts`

**Changes:**
```typescript
if (payment) {
  orderMetadata.payment_method = payment.paymentMethod;
  // NEW: Initialize payment status fields
  orderMetadata.payment_status = "pending";
  orderMetadata.payment_captured = false;
  orderMetadata.payment_initialized_at = new Date().toISOString();
}
```

**Impact:** Orders created via `/store/cart/complete` now have payment status tracking.

---

### Fix 2: Created Payment Status Update Endpoint

**New File:** `src/api/store/orders/[id]/update-payment-status/route.ts`

**Endpoint:** `POST /store/orders/:id/update-payment-status`

**Purpose:** Allows updating payment status after payment is completed.

**Features:**
- ✅ Verifies payment with Paystack if `payment_reference` provided
- ✅ Updates payment status directly if `payment_status` provided
- ✅ Requires authentication
- ✅ Verifies order ownership
- ✅ Stores comprehensive payment metadata

**Usage Example:**

#### Option A: Verify with Paystack Reference
```typescript
// After payment is completed on Paystack
const response = await fetch(`/store/orders/${orderId}/update-payment-status`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payment_reference: 'PS_1234567890_abc',
  }),
});

const result = await response.json();
console.log(result.order.payment_status); // "captured"
```

#### Option B: Update Status Directly
```typescript
// Mark payment as successful without verification
const response = await fetch(`/store/orders/${orderId}/update-payment-status`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    payment_status: 'success',
    payment_method: 'card',
  }),
});
```

**Request Body:**
```typescript
{
  payment_reference?: string;  // Paystack reference (will verify with Paystack)
  payment_status?: "pending" | "success" | "failed";  // Direct status update
  payment_method?: string;  // Optional payment method
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "order": {
    "id": "order_01abc",
    "display_id": "1001",
    "status": "pending",
    "payment_status": "captured",
    "metadata": {
      "payment_status": "success",
      "payment_captured": true,
      "payment_reference": "PS_1234567890_abc",
      "payment_provider": "paystack",
      "payment_channel": "card",
      "payment_paid_at": "2024-12-05T10:30:00Z",
      "payment_updated_at": "2024-12-05T10:30:15Z"
    },
    "total": 50000,
    "updated_at": "2024-12-05T10:30:15Z"
  }
}
```

---

### Fix 3: Improved Webhook Handler

**File:** `src/api/store/payments/paystack/webhook/route.ts`

**Changes:**
- ✅ Better logging for debugging
- ✅ More comprehensive payment metadata
- ✅ Improved error handling
- ✅ Added pagination to order search for performance

**Impact:** Webhooks now update orders more reliably with detailed payment information.

---

## 🚀 Recommended Integration Approaches

### Approach 1: Paystack-First Flow (Recommended)

**Best for:** Users who want to use Paystack for all payments

```typescript
// 1. Complete cart to create order
const { order } = await fetch('/store/cart/complete', {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ delivery, payment }),
}).then(r => r.json());

// 2. Initialize Paystack payment for the order
const { data } = await fetch('/store/payments/paystack/initialize', {
  method: 'POST',
  credentials: 'include',
}).then(r => r.json());

// 3. Redirect to Paystack
window.location.href = data.authorization_url;

// 4. On callback page, update order payment status
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');

await fetch(`/store/orders/${orderId}/update-payment-status`, {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({ payment_reference: reference }),
});
```

---

### Approach 2: Paystack-Only Flow (Simplest)

**Best for:** New implementations

```typescript
// 1. Initialize payment directly (skips cart/complete)
const { data } = await fetch('/store/payments/paystack/initialize', {
  method: 'POST',
  credentials: 'include',
}).then(r => r.json());

// 2. Redirect to Paystack
window.location.href = data.authorization_url;

// 3. On callback, verify payment (creates order automatically)
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');

const { order } = await fetch(
  `/store/payments/paystack/verify?reference=${reference}`,
  { credentials: 'include' }
).then(r => r.json());

// Order is created with payment_status = "success"
```

---

### Approach 3: Manual Status Update

**Best for:** Custom payment integrations or admin operations

```typescript
// Update payment status manually
await fetch(`/store/orders/${orderId}/update-payment-status`, {
  method: 'POST',
  credentials: 'include',
  body: JSON.stringify({
    payment_status: 'success',
    payment_method: 'bank_transfer',
  }),
});
```

---

## 📊 Payment Status Values

Orders can have the following payment statuses:

| Status | Description | Metadata Check |
|--------|-------------|----------------|
| `"captured"` | Payment successfully captured | `payment_status === "success"` OR `payment_captured === true` |
| `"awaiting"` | Payment pending | `payment_status === "pending"` OR has `payment_reference` |
| `"failed"` | Payment failed | `payment_status === "failed"` |
| `"not_paid"` | No payment information | None of the above |

---

## 🧪 Testing

### Test Scenario 1: Complete Cart → Update Payment

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "password123"}'

# 2. Complete cart (creates order with pending payment)
curl -X POST http://localhost:9000/store/cart/complete \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "delivery": {
      "deliveryOption": "delivery",
      "phone": "+233244123456",
      "streetAddress": "123 Main St",
      "city": "Accra",
      "region": "Greater Accra",
      "country": "Ghana",
      "email": "test@example.com"
    },
    "payment": {
      "paymentMethod": "card"
    }
  }'
# Note the order ID from response

# 3. Update payment status
curl -X POST http://localhost:9000/store/orders/order_01abc/update-payment-status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "payment_status": "success",
    "payment_method": "card"
  }'

# 4. Verify order shows as paid
curl -X GET http://localhost:9000/store/orders/order_01abc \
  -b cookies.txt
# Check that payment_status = "captured"
```

### Test Scenario 2: Paystack Payment Flow

```bash
# 1. Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email": "test@example.com", "password": "password123"}'

# 2. Initialize Paystack payment
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt
# Visit authorization_url in browser

# 3. After payment, verify
curl "http://localhost:9000/store/payments/paystack/verify?reference=PS_XXXXX" \
  -b cookies.txt
# Order created with payment_status = "success"
```

---

## 🔍 Debugging Payment Status Issues

### Check Order Payment Status

```typescript
// Fetch order
const { order } = await fetch(`/store/orders/${orderId}`, {
  credentials: 'include',
}).then(r => r.json());

console.log('Payment Status:', order.payment_status);
console.log('Payment Metadata:', {
  payment_status: order.metadata?.payment_status,
  payment_captured: order.metadata?.payment_captured,
  payment_reference: order.metadata?.payment_reference,
  payment_method: order.metadata?.payment_method,
  payment_provider: order.metadata?.payment_provider,
});
```

### Check Server Logs

Look for these log messages:
- ✅ `"Order payment status updated via webhook: {order_id}"`
- ✅ `"Payment verified and order updated: {details}"`
- ⚠️ `"No order found for payment reference: {reference}"`
- ❌ `"Failed to update order payment status: {error}"`

---

## 📝 Migration Guide

### For Existing Orders with No Payment Status

If you have existing orders that were created without payment status, you can update them:

#### Option 1: Update via API (if you have payment reference)
```bash
curl -X POST http://localhost:9000/store/orders/{order_id}/update-payment-status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"payment_reference": "PS_XXXXX"}'
```

#### Option 2: Manual Database Update (use with caution)
```sql
-- For orders that are actually paid
UPDATE order
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{payment_status}',
  '"success"'
)
WHERE id = 'order_01abc';

UPDATE order
SET metadata = jsonb_set(
  metadata,
  '{payment_captured}',
  'true'
)
WHERE id = 'order_01abc';
```

---

## ✅ Summary

### What Was Fixed
1. ✅ Added payment status metadata to orders created via `/store/cart/complete`
2. ✅ Created new endpoint to update payment status: `POST /store/orders/:id/update-payment-status`
3. ✅ Improved webhook handler for better payment status updates
4. ✅ Added comprehensive payment metadata tracking

### What Changed
- Orders from `/store/cart/complete` now initialize with `payment_status = "pending"`
- New endpoint available to update payment status after payment
- Better logging and error handling throughout

### Breaking Changes
- None! All changes are backward compatible

### Next Steps
1. Test the new payment status update endpoint
2. Update your frontend to use the new endpoint after payment
3. Consider migrating to the simplified Paystack-only flow for new implementations
4. Update existing orders with missing payment status (if needed)

---

**Questions or Issues?**
Check the logs for detailed error messages and payment status updates.
