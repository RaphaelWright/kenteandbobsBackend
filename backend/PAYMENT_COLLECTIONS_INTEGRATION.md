# Payment Collections Integration with Paystack

## Overview

This document explains how **payment collections** are now integrated with your custom Paystack payment flow. Payment collections provide a standardized way to track payments in Medusa, offering better consistency and compatibility with Medusa's ecosystem.

---

## What Changed

### Before
- Payment information was **only stored in order metadata**
- No standardized payment collection records
- Payment status determined by checking metadata fields

### After  
- Payment information stored in **both** order metadata AND payment collections
- Standardized payment collection records linked to orders
- Payment status can be retrieved from payment collections OR metadata (fallback)
- Better integration with Medusa's payment ecosystem

---

## How It Works

### 1. Payment Verification Flow

When a customer completes payment and the frontend calls `/store/payments/paystack/verify`:

```typescript
// 1. Verify payment with Paystack API
const paystackResult = await verifyWithPaystack(reference);

// 2. Create order from cart
const order = await orderModuleService.createOrders({...});

// 3. Create payment collection
const paymentCollection = await paymentModuleService.createPaymentCollections({
  currency_code: "ghs",
  amount: cartTotal,
  region_id: cart.region_id,
});

// 4. Create payment record
const payment = await paymentModuleService.createPayments({
  amount: cartTotal,
  currency_code: "ghs",
  provider_id: "paystack",
  data: {
    reference: paymentData.reference,
    transaction_id: paymentData.id,
    channel: paymentData.channel,
    paid_at: paymentData.paid_at,
    // ... more payment details
  },
});

// 5. Link payment collection to order
await remoteLink.create({
  paymentCollectionService: { payment_collection_id: paymentCollection.id },
  orderService: { order_id: order.id },
});

// 6. Link payment to payment collection
await remoteLink.create({
  paymentService: { payment_id: payment.id },
  paymentCollectionService: { payment_collection_id: paymentCollection.id },
});

// 7. Update payment collection status to "captured"
await paymentModuleService.updatePaymentCollections(paymentCollection.id, {
  status: "captured",
});
```

### 2. Webhook Updates

When Paystack sends webhook notifications (`charge.success`):

```typescript
// 1. Find order by payment reference
const order = orders.find(o => o.metadata?.payment_reference === reference);

// 2. Update order metadata (backward compatibility)
await orderModuleService.updateOrders([{
  id: order.id,
  metadata: { ...updatedPaymentMetadata },
}]);

// 3. Update payment collection status
if (order.payment_collections?.length > 0) {
  await paymentModuleService.updatePaymentCollections(
    order.payment_collections[0].id,
    { status: "captured" }
  );
}

// 4. Update payment record with additional details
if (paymentCollection.payments?.length > 0) {
  await paymentModuleService.updatePayments(payment.id, {
    data: { ...webhookData },
  });
}
```

---

## Payment Collection Structure

### Payment Collection

```typescript
{
  id: "paycol_123",
  currency_code: "ghs",
  amount: 10000,  // Amount in pesewas
  region_id: "reg_123",
  status: "captured",  // "pending" | "captured" | "failed"
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

### Payment Record

```typescript
{
  id: "pay_123",
  amount: 10000,
  currency_code: "ghs",
  provider_id: "paystack",
  data: {
    reference: "T123456789",
    transaction_id: "1234567890",
    channel: "card",
    paid_at: "2024-01-01T00:00:00.000Z",
    gateway_response: "Successful",
    authorization: {
      authorization_code: "AUTH_abc123",
      card_type: "visa",
      last4: "4081",
      bank: "TEST BANK"
    }
  },
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

---

## Benefits

### 1. **Standardized Payment Tracking**
- Payment collections follow Medusa's conventions
- Compatible with Medusa admin dashboard and tools
- Easier integration with other Medusa modules

### 2. **Dual Storage (Metadata + Collections)**
- **Order metadata**: Quick access, backward compatibility
- **Payment collections**: Standardized structure, better querying
- Best of both worlds!

### 3. **Better Payment Status Queries**

You can now query payment status from either source:

```typescript
// Method 1: From payment collection (preferred)
if (order.payment_collections?.[0]?.status === "captured") {
  // Payment captured
}

// Method 2: From metadata (fallback)
if (order.metadata?.payment_captured === true) {
  // Payment captured
}

// Method 3: Helper function (checks both)
const status = getPaymentStatus(order); // "captured"
```

### 4. **Webhook Redundancy**
- If verification completes: Payment collection created
- If webhook arrives first: Payment collection updated
- If both happen: No duplicates, just updates
- Resilient to timing issues

---

## Querying Orders with Payment Collections

### Fetch Order with Payment Data

```typescript
const { data: orders } = await query.graph({
  entity: "order",
  fields: [
    "id",
    "status",
    "total",
    "metadata",
    "payment_collections.*",
    "payment_collections.payments.*",
  ],
  filters: { id: orderId },
});

const order = orders[0];

// Access payment collection
const paymentCollection = order.payment_collections?.[0];
console.log("Payment Status:", paymentCollection?.status);

// Access payment details
const payment = paymentCollection?.payments?.[0];
console.log("Payment Provider:", payment?.provider_id);
console.log("Payment Data:", payment?.data);
```

### Check Payment Status

```typescript
// The getPaymentStatus helper checks payment collections first
function getPaymentStatus(order: any): string {
  // 1. Check payment collection (preferred)
  if (order.payment_collections?.[0]?.status) {
    return order.payment_collections[0].status;
  }

  // 2. Check metadata (fallback)
  let metadata = parseMetadata(order.metadata);
  
  if (metadata.payment_captured === true) {
    return "captured";
  }
  
  if (metadata.payment_status === "pending") {
    return "awaiting";
  }
  
  if (metadata.payment_status === "failed") {
    return "failed";
  }

  return "not_paid";
}
```

---

## Error Handling

### Graceful Degradation

If payment collection creation fails, the order still succeeds:

```typescript
try {
  // Create payment collection
  const paymentCollection = await paymentModuleService.createPaymentCollections({...});
  // ... create payment and links
} catch (paymentError) {
  console.error("⚠️ Failed to create payment collection (order still created):", paymentError);
  // Don't fail the entire request
  // Payment info is still available in order metadata
}
```

**Why?** 
- Order creation is the critical operation
- Payment info in metadata ensures nothing is lost
- Payment collection is an enhancement, not a requirement
- System remains functional even if payment collections fail

### Webhook Resilience

Webhooks gracefully handle missing payment collections:

```typescript
if (order.payment_collections?.length > 0) {
  try {
    await updatePaymentCollection(order.payment_collections[0].id);
  } catch (error) {
    console.error("⚠️ Failed to update payment collection:", error);
    // Order metadata still updated - operation continues
  }
}
```

---

## Migration Notes

### Existing Orders

Orders created **before** this integration:
- Have payment info in metadata ✅
- Don't have payment collections ❌
- Will still work correctly ✅

The `getPaymentStatus()` helper handles both cases automatically.

### Future Orders

Orders created **after** this integration:
- Have payment info in metadata ✅
- Have payment collections ✅
- Best of both approaches ✅

---

## Testing

### Test Payment Collection Creation

```bash
# 1. Initialize payment
POST /store/payments/paystack/initialize
{
  "cart_id": "cart_123"
}

# 2. Complete payment on Paystack
# (Use test card: 5060666666666666666, CVV: 123, Expiry: 12/30)

# 3. Verify payment
GET /store/payments/paystack/verify?reference=T123456789

# Expected logs:
# ✅ Payment collection created: { payment_collection_id: "...", amount: 10000 }
# ✅ Payment record created: { payment_id: "...", provider: "paystack" }
# ✅ Payment collection linked to order
# ✅ Payment linked to payment collection
# ✅ Payment collection status set to captured
```

### Verify Payment Collection in Order

```bash
# Fetch order
GET /store/orders/{order_id}

# Response should include:
{
  "order": {
    "id": "order_123",
    "status": "pending",
    "payment_collections": [
      {
        "id": "paycol_123",
        "status": "captured",
        "amount": 10000,
        "payments": [
          {
            "id": "pay_123",
            "amount": 10000,
            "provider_id": "paystack",
            "data": {
              "reference": "T123456789",
              "transaction_id": "1234567890",
              "channel": "card"
            }
          }
        ]
      }
    ],
    "metadata": {
      "payment_provider": "paystack",
      "payment_reference": "T123456789",
      "payment_captured": true,
      "payment_status": "success"
    }
  }
}
```

### Test Webhook Updates

```bash
# Send test webhook from Paystack dashboard
# Event: charge.success
# Reference: (use existing payment reference)

# Expected logs:
# ✓ Order payment status updated via webhook
# ✓ Payment collection updated via webhook: { status: "captured" }
# ✓ Payment record updated via webhook
```

---

## Summary

✅ **Payment collections now integrated** with Paystack  
✅ **Dual storage** for reliability (metadata + collections)  
✅ **Webhook support** for payment collection updates  
✅ **Backward compatible** with existing orders  
✅ **Graceful error handling** ensures orders always succeed  
✅ **Better querying** with standardized Medusa structure  

Your Paystack integration now follows Medusa best practices while maintaining the custom functionality you've built! 🎉

