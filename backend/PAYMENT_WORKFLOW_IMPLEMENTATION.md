# Payment Workflow Implementation

## ✅ Payment Collections Now Implemented!

Your Paystack integration now uses **Medusa workflows** to create proper payment collections with full rollback support and error handling.

---

## What Was Implemented

### 1. Custom Workflow

Created `create-paystack-payment-collection` workflow with three steps:

```typescript
// Located in: src/workflows/payment/create-paystack-payment-collection.ts

createPaystackPaymentCollectionWorkflow()
  ├─ Step 1: Create Payment Collection
  ├─ Step 2: Create & Authorize Payment Session  
  ├─ Step 3: Link Payment Collection to Order
  └─ Rollback logic for each step if errors occur
```

### 2. Integration with Payment Verification

Updated `/store/payments/paystack/verify` to use the workflow:

```typescript
const { result } = await createPaystackPaymentCollectionWorkflow(req.scope)
  .run({
    input: {
      order_id: order.id,
      amount: cartTotal,
      currency_code: "ghs",
      payment_data: {
        reference: paymentData.reference,
        transaction_id: paymentData.id,
        // ... Paystack payment details
      },
    },
  });
```

### 3. Webhook Updates

Updated webhook handler to update payment sessions when webhooks arrive:

```typescript
// Finds payment collection linked to order
// Updates payment session data with webhook information
// Gracefully handles cases where payment collection doesn't exist
```

---

## How It Works

### Payment Verification Flow

```
Customer completes payment
         ↓
Frontend calls /store/payments/paystack/verify
         ↓
Backend verifies with Paystack API
         ↓
Creates order from cart
         ↓
╔════════════════════════════════╗
║   WORKFLOW STARTS              ║
╠════════════════════════════════╣
║ Step 1: Create Payment         ║
║         Collection             ║
║         ↓                      ║
║ Step 2: Create Payment Session ║
║         & Authorize            ║
║         ↓                      ║
║ Step 3: Link to Order          ║
╚════════════════════════════════╝
         ↓
Order metadata updated (fallback)
         ↓
Response returned
```

### Rollback Protection

If any step fails, previous steps are automatically rolled back:

```typescript
// Example: If linking to order fails
Step 3 fails → Step 2 rollback (delete payment session)
            → Step 1 rollback (delete payment collection)
            → Order still exists with metadata
            → No orphaned records
```

---

## Dual Storage Strategy

Your implementation now uses **both** payment collections AND metadata:

### Payment Collection (Primary)

```typescript
order.payment_collections = [
  {
    id: "paycol_123",
    amount: 10000,
    currency_code: "ghs",
    payment_sessions: [
      {
        id: "ps_456",
        provider_id: "paystack",
        status: "authorized",
        data: {
          reference: "T123456789",
          transaction_id: 1234567890,
          channel: "card",
          paid_at: "2024-01-01T00:00:00Z",
          gateway_response: "Successful",
          authorization: { /* card details */ }
        }
      }
    ]
  }
]
```

### Order Metadata (Fallback)

```typescript
order.metadata = {
  payment_provider: "paystack",
  payment_reference: "T123456789",
  payment_captured: true,
  payment_status: "success",
  // ... all payment details
}
```

### Why Both?

1. **Payment Collection**: Medusa standard, enables admin features
2. **Metadata**: Quick access, backward compatibility, fallback if workflow fails
3. **Resilience**: If workflow fails, metadata ensures no data loss

---

## Benefits

### ✅ Rollback Support

```typescript
try {
  const { result } = await workflow.run({ input });
  // ✓ Payment collection created
  // ✓ Linked to order
} catch (error) {
  // ✗ Workflow automatically rolls back all steps
  // ✓ Order still exists
  // ✓ Payment info still in metadata
  // ✓ No orphaned records in database
}
```

### ✅ Error Handling

Workflow failures don't break order creation:

```typescript
try {
  await createPaystackPaymentCollectionWorkflow().run({...});
  console.log("✅ Payment collection created");
} catch (workflowError) {
  console.error("⚠️ Workflow failed (order still created)");
  // Order creation succeeds
  // Payment info preserved in metadata
  // System remains functional
}
```

### ✅ Medusa Admin Integration

Payment collections enable:
- Payment tracking in Medusa Admin
- Standard payment workflows
- Refund management
- Payment analytics
- Better reporting

### ✅ Webhook Resilience

Webhooks update both systems:

```typescript
// 1. Update order metadata (always happens)
await orderModuleService.updateOrders([{ metadata }]);

// 2. Update payment session (if collection exists)
try {
  const paymentCollectionLinks = await remoteLink.query({...});
  if (paymentCollectionLinks.length > 0) {
    await paymentModule.updatePaymentSession(sessionId, { data });
  }
} catch (error) {
  // Gracefully handle - metadata still updated
}
```

---

## Implementation Files

### New Files Created

1. **`src/workflows/payment/create-paystack-payment-collection.ts`**
   - Main workflow definition
   - Three workflow steps with rollback logic
   - Proper error handling

2. **`src/workflows/payment/index.ts`**
   - Exports workflow for use in API routes

### Modified Files

1. **`src/api/store/payments/paystack/verify/route.ts`**
   - Calls workflow after order creation
   - Graceful error handling
   - Dual storage (collections + metadata)

2. **`src/api/store/payments/paystack/webhook/route.ts`**
   - Queries for payment collections via remote link
   - Updates payment session data
   - Graceful handling if collection doesn't exist

---

## Testing

### Test Payment Collection Creation

```bash
# 1. Create cart and add items
POST /store/cart
POST /store/cart/line-items

# 2. Initialize payment
POST /store/payments/paystack/initialize
{
  "cart_id": "cart_123"
}

# 3. Complete payment on Paystack
# (Use test card: 5060666666666666666)

# 4. Verify payment
GET /store/payments/paystack/verify?reference=T123456

# Expected logs:
# ✅ Order completed via payment verification
# ✅ Payment collection created via workflow: {
#      payment_collection_id: "paycol_xxx",
#      payment_session_id: "ps_yyy",
#      order_id: "order_zzz"
#    }
```

### Verify Payment Collection

```bash
GET /store/orders/{order_id}

# Response includes:
{
  "order": {
    "id": "order_123",
    "payment_collections": [
      {
        "id": "paycol_456",
        "amount": 10000,
        "currency_code": "ghs",
        "payment_sessions": [
          {
            "id": "ps_789",
            "provider_id": "paystack",
            "status": "authorized",
            "data": {
              "reference": "T123456",
              // ... payment details
            }
          }
        ]
      }
    ],
    "metadata": {
      "payment_reference": "T123456",
      "payment_captured": true,
      // ... also has payment details
    }
  }
}
```

### Test Webhook Updates

```bash
# Trigger Paystack webhook (charge.success)

# Expected logs:
# ✓ Order payment status updated via webhook
# ✓ Payment session updated via webhook: {
#     payment_session_id: "ps_789",
#     payment_collection_id: "paycol_456"
#   }
```

### Test Workflow Rollback

To test rollback, you can temporarily inject an error:

```typescript
// In create-paystack-payment-collection.ts
const linkPaymentCollectionToOrderStep = createStep(
  "link-payment-collection-to-order-step",
  async (input, { container }) => {
    throw new Error("Test rollback"); // Temporary error
    // ...
  }
);
```

Expected behavior:
- Payment session deleted
- Payment collection deleted
- Order still created
- Metadata still has payment info
- No orphaned records

---

## Workflow Steps Explained

### Step 1: Create Payment Collection

```typescript
const createPaymentCollectionStep = createStep(
  "create-payment-collection-step",
  async (input, { container }) => {
    const paymentModule = container.resolve(Modules.PAYMENT);
    
    // Create collection
    const paymentCollection = await paymentModule.createPaymentCollections({
      currency_code: input.currency_code,
      amount: input.amount,
    });
    
    return new StepResponse(paymentCollection, paymentCollection.id);
  },
  async (paymentCollectionId, { container }) => {
    // Compensation: Delete if workflow fails
    const paymentModule = container.resolve(Modules.PAYMENT);
    await paymentModule.deletePaymentCollections([paymentCollectionId]);
  }
);
```

**What it does:**
- Creates a payment collection in Medusa
- Returns the collection for next step
- Defines rollback: delete collection if later steps fail

### Step 2: Create Payment Session

```typescript
const createPaymentSessionStep = createStep(
  "create-payment-session-step",
  async (input, { container }) => {
    const paymentModule = container.resolve(Modules.PAYMENT);
    
    // Create session
    const paymentSession = await paymentModule.createPaymentSession(
      input.payment_collection_id,
      {
        provider_id: "paystack",
        data: input.payment_data,
        // ... other fields
      }
    );
    
    // Authorize immediately (payment already completed)
    const authorized = await paymentModule.authorizePaymentSession(
      paymentSession.id,
      {}
    );
    
    return new StepResponse(authorized, paymentSession.id);
  },
  async (paymentSessionId, { container }) => {
    // Compensation: Delete session
    const paymentModule = container.resolve(Modules.PAYMENT);
    await paymentModule.deletePaymentSession(paymentSessionId);
  }
);
```

**What it does:**
- Creates payment session within the collection
- Stores Paystack payment data
- Authorizes session (payment already completed with Paystack)
- Defines rollback: delete session if linking fails

### Step 3: Link to Order

```typescript
const linkPaymentCollectionToOrderStep = createStep(
  "link-payment-collection-to-order-step",
  async (input, { container }) => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    
    // Create link between order and payment collection
    await remoteLink.create({
      [Modules.ORDER]: { order_id: input.order_id },
      [Modules.PAYMENT]: { payment_collection_id: input.payment_collection_id },
    });
    
    return new StepResponse({ linked: true }, input);
  },
  async (linkData, { container }) => {
    // Compensation: Remove link
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    await remoteLink.dismiss({
      [Modules.ORDER]: { order_id: linkData.order_id },
      [Modules.PAYMENT]: { payment_collection_id: linkData.payment_collection_id },
    });
  }
);
```

**What it does:**
- Links payment collection to order using Medusa's remote link
- Makes payment collection accessible via order queries
- Defines rollback: remove link if needed

---

## Summary

✅ **Medusa workflow integration complete**  
✅ **Payment collections created for all new payments**  
✅ **Automatic rollback if any step fails**  
✅ **Dual storage (collections + metadata) for resilience**  
✅ **Webhook updates for payment sessions**  
✅ **Backward compatible with existing code**  
✅ **Production ready**  

Your Paystack integration now follows Medusa best practices with enterprise-grade error handling! 🚀

