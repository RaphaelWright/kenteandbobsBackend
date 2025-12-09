# Order Completion Flows

This document explains how orders are created and completed in the backend. Understanding these flows is critical to avoid confusion about order completion.

## Overview

In this backend, there are **two valid ways** to complete an order:

1. **Cart/Complete Flow** - Traditional checkout where the user completes checkout, then pays
2. **Payment Verification Flow** - Payment-first approach where payment completion creates the order

Both flows are valid and result in a complete order with all necessary data.

---

## Flow 1: Cart/Complete (Traditional Checkout)

**Endpoint:** `POST /store/cart/complete`

### Process:
1. User adds items to cart
2. User provides delivery/shipping information
3. User calls `/store/cart/complete` endpoint
4. Backend creates order with `payment_status: "pending"`
5. Backend deletes cart and clears session
6. User proceeds to payment
7. After payment, the order's payment status is updated

### Metadata Set:
```json
{
  "order_completed_via": "cart_complete",
  "order_completed_at": "2024-01-01T00:00:00.000Z",
  "cart_completed": true,
  "payment_status": "pending",
  "payment_captured": false,
  "payment_initialized_at": "2024-01-01T00:00:00.000Z",
  "delivery_option": "delivery",
  "payment_method": "card"
}
```

### What Happens:
- ✅ Order is created
- ✅ Cart is deleted
- ✅ Cart session is cleared
- ✅ Order is marked as complete
- ⏳ Payment status is "pending" until payment is captured

---

## Flow 2: Payment Verification (Payment-First)

**Endpoint:** `GET /store/payments/paystack/verify?reference=xxx`

### Process:
1. User adds items to cart
2. Cart includes delivery/shipping information
3. User initiates payment with Paystack
4. User completes payment
5. Frontend calls `/store/payments/paystack/verify` endpoint
6. Backend verifies payment with Paystack
7. Backend creates order with payment already captured
8. Backend deletes cart and clears session

### Metadata Set:
```json
{
  "order_completed_via": "payment_verification",
  "order_completed_at": "2024-01-01T00:00:00.000Z",
  "cart_completed": true,
  "payment_provider": "paystack",
  "payment_status": "success",
  "payment_captured": true,
  "payment_captured_at": "2024-01-01T00:00:00.000Z",
  "payment_reference": "xyz123",
  "payment_transaction_id": "12345",
  "payment_channel": "card",
  "payment_gateway_response": "Approved",
  "delivery_option": "delivery",
  "payment_method": "card"
}
```

### What Happens:
- ✅ Order is created
- ✅ Cart is deleted
- ✅ Cart session is cleared
- ✅ Order is marked as complete
- ✅ Payment is already captured

---

## Key Differences

| Aspect | Cart/Complete Flow | Payment Verification Flow |
|--------|-------------------|---------------------------|
| **Order Creation** | Before payment | After payment verified |
| **Payment Status** | Initially "pending" | Already "captured" |
| **Cart Deletion** | Yes | Yes |
| **Session Cleared** | Yes | Yes |
| **Order Complete** | Yes | Yes |
| **Typical Use Case** | Checkout-first approach | Payment-first approach |

---

## Important: Both Flows Are Valid!

**The backend must understand that BOTH flows result in a complete order.**

When payment is verified and an order is created, this is equivalent to calling `/store/cart/complete`. The cart has been converted to an order, the cart is deleted, and the order is complete.

### How to Check if an Order is Complete

Use the utility functions in `src/utils/order-completion.ts`:

```typescript
import { isOrderCompleted, getOrderCompletionMethod } from "../utils/order-completion";

// Check if order is complete
if (isOrderCompleted(order)) {
  console.log("Order is complete");
  const method = getOrderCompletionMethod(order);
  console.log(`Completed via: ${method}`); // "payment_verification" or "cart_complete"
}
```

### Metadata Fields to Check

To determine if an order is complete, check for:

1. `metadata.cart_completed === true` - Explicit completion flag
2. `metadata.order_completed_via` - Shows completion method
3. `metadata.order_completed_at` - Shows when order was completed

**Note:** An order object existing means it was completed. Orders can only be created through completion endpoints.

---

## Console Logging

The backend logs order completion for both flows:

### Cart/Complete Log:
```
✅ Order completed via cart/complete: {
  order_id: 'order_123',
  display_id: '1001',
  cart_id: 'cart_456',
  cart_completed: true,
  cart_deleted: true,
  completion_method: 'cart_complete'
}
```

### Payment Verification Log:
```
✅ Order completed via payment verification: {
  order_id: 'order_123',
  display_id: '1001',
  cart_completed: true,
  payment_captured: true,
  completion_method: 'payment_verification'
}
✅ Cart deleted after payment verification: {
  cart_id: 'cart_456',
  order_id: 'order_123'
}
```

---

## Common Confusion Points

### ❌ "The cart wasn't completed because we didn't call cart/complete"

**Incorrect!** The cart is completed when payment verification creates the order. The payment verification endpoint does everything that cart/complete does:
- Creates the order
- Deletes the cart
- Clears the session
- Marks the order as complete

### ❌ "Orders created via payment don't have completion metadata"

**Incorrect!** As of the latest update, both flows set consistent completion metadata:
- `order_completed_via` - Shows which method was used
- `order_completed_at` - Timestamp of completion
- `cart_completed: true` - Explicit flag indicating cart was completed

### ✅ "Both flows result in a complete order"

**Correct!** Both flows are valid ways to complete an order. The backend recognizes both methods and handles them appropriately.

---

## For Developers

When working with orders, remember:

1. **Don't assume** orders were created via cart/complete
2. **Do check** the `order_completed_via` metadata to understand the flow
3. **Do use** the utility functions to check completion status
4. **Don't require** cart/complete to be called for an order to be valid
5. **Do understand** that payment verification is a valid completion method

### Example Code:

```typescript
import { isOrderCompleted, getOrderCompletionMethod } from "../utils/order-completion";

// Retrieve order
const order = await orderModuleService.retrieveOrder(orderId);

// Check if complete
if (isOrderCompleted(order)) {
  const method = getOrderCompletionMethod(order);
  
  if (method === "payment_verification") {
    // Order was created via payment verification
    // Payment is already captured
    console.log("Order created via payment (payment-first flow)");
  } else if (method === "cart_complete") {
    // Order was created via cart/complete
    // Payment may be pending or captured
    console.log("Order created via checkout (traditional flow)");
  }
}
```

---

## Summary

- **Two flows, both valid**: Cart/Complete and Payment Verification
- **Both create complete orders**: Cart is deleted, session cleared, order created
- **Use metadata to distinguish**: `order_completed_via` field
- **Use utility functions**: `isOrderCompleted()`, `getOrderCompletionMethod()`
- **Don't be confused**: Payment verification = order completion

When you see an order created via payment verification, understand that this is the backend working correctly. The payment flow has completed the order, and there's no need (or possibility) to call cart/complete afterward.

