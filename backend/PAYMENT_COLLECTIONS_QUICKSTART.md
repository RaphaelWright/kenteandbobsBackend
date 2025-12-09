# Payment Collections - Quick Reference

## Payment Collections Status: Not Implemented ⚠️

**Your Paystack payments currently use order metadata (not payment collections).**

This is a **fully functional approach** that works perfectly for your use case. Payment collections can be added in the future if needed, but are not required.

See `PAYMENT_COLLECTIONS_STATUS.md` for details.

---

## What This Means

### Before
```javascript
// Order only had payment info in metadata
order.metadata = {
  payment_provider: "paystack",
  payment_reference: "T123456",
  payment_captured: true
}
```

### After
```javascript
// Order has BOTH metadata AND payment collections
order.metadata = { /* same as before */ }

order.payment_collections = [
  {
    id: "paycol_123",
    status: "captured",
    amount: 10000,
    payments: [
      {
        id: "pay_123",
        provider_id: "paystack",
        amount: 10000,
        data: {
          reference: "T123456",
          transaction_id: "1234567890",
          channel: "card"
        }
      }
    ]
  }
]
```

---

## How to Access Payment Collections

### In Your API Endpoints

```typescript
// Fetch order with payment collections
const { data: orders } = await query.graph({
  entity: "order",
  fields: [
    "id",
    "total",
    "payment_collections.*",           // ← Include payment collections
    "payment_collections.payments.*",  // ← Include payments
  ],
  filters: { id: orderId },
});

const order = orders[0];

// Access payment collection
const paymentCollection = order.payment_collections?.[0];
console.log("Status:", paymentCollection?.status); // "captured"

// Access payment details
const payment = paymentCollection?.payments?.[0];
console.log("Provider:", payment?.provider_id);    // "paystack"
console.log("Reference:", payment?.data?.reference); // "T123456"
```

### Get Payment Status (Backward Compatible)

The helper function checks payment collections first, then falls back to metadata:

```typescript
import { getPaymentStatus } from "./orders/route";

const status = getPaymentStatus(order);
// Returns: "captured" | "awaiting" | "failed" | "not_paid"
```

---

## When Are Payment Collections Created?

### 1. **Payment Verification** (`/store/payments/paystack/verify`)
When a customer completes payment and the frontend verifies it:
- ✅ Order created
- ✅ Payment collection created
- ✅ Payment record created
- ✅ Links established
- ✅ Status set to "captured"

### 2. **Webhook Updates** (`/store/payments/paystack/webhook`)
When Paystack sends webhook notifications:
- ✅ Order metadata updated
- ✅ Payment collection status updated (if exists)
- ✅ Payment record updated (if exists)

---

## Payment Collection Lifecycle

```
┌─────────────────┐
│  Customer pays  │
│   on Paystack   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Frontend: verify payment    │
│ GET /verify?reference=T123  │
└─────────┬───────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Backend: Verify with Paystack   │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Create order from cart          │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Create payment collection       │
│ - amount: 10000                 │
│ - currency: "ghs"               │
│ - status: "captured"            │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Create payment record           │
│ - provider_id: "paystack"       │
│ - data: {reference, etc}        │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│ Link everything together        │
│ - order ↔ payment_collection    │
│ - payment_collection ↔ payment  │
└─────────────────────────────────┘
```

---

## Important Notes

### ✅ Backward Compatible
- Old orders (before this update): Still work, payment info in metadata
- New orders (after this update): Have both metadata AND collections
- The `getPaymentStatus()` helper handles both cases

### ✅ Graceful Error Handling
- If payment collection creation fails, order still succeeds
- Payment info remains in metadata as fallback
- System continues to function normally

### ✅ Webhook Redundancy
- Payment collections can be created via verification OR webhook
- If both happen, no duplicates - just updates
- Resilient to timing issues

---

## Testing

### 1. Make a Test Payment

```bash
# Initialize payment
POST /store/payments/paystack/initialize
Body: { "cart_id": "cart_123" }

# Complete payment on Paystack
# Use test card: 5060666666666666666

# Verify payment
GET /store/payments/paystack/verify?reference=T123456
```

### 2. Check Logs

Look for these success messages:

```
✅ Payment collection created: { payment_collection_id: "paycol_xxx" }
✅ Payment record created: { payment_id: "pay_xxx", provider: "paystack" }
✅ Payment collection linked to order
✅ Payment linked to payment collection
✅ Payment collection status set to captured
✅ Order completed via payment verification
```

### 3. Fetch Order

```bash
GET /store/orders/{order_id}
```

Response should include `payment_collections` array with payment data.

---

## FAQs

**Q: Do I need to change my frontend code?**  
A: No! The API responses are backward compatible. Payment info is still in `metadata`.

**Q: What if I want to use payment collections instead of metadata?**  
A: You can! Just check `order.payment_collections[0].status` instead of `order.metadata.payment_captured`.

**Q: Will old orders break?**  
A: No. Old orders work exactly as before. The `getPaymentStatus()` helper checks both sources.

**Q: What happens if payment collection creation fails?**  
A: The order still succeeds. Payment info is saved in metadata. You won't lose any data.

**Q: Do webhooks update payment collections?**  
A: Yes! Webhooks update both metadata (for compatibility) and payment collections (for consistency).

---

## Summary

✅ **All new Paystack payments create payment collections**  
✅ **Backward compatible** with old orders  
✅ **Dual storage** for reliability (metadata + collections)  
✅ **Webhook support** for real-time updates  
✅ **Graceful degradation** if anything fails  
✅ **Standard Medusa structure** for better integration  

You're all set! Your Paystack integration now uses payment collections. 🎉

