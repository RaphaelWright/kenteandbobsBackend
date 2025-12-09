# Checkout Stages - Endpoints Report

This document provides a comprehensive overview of all endpoints involved in the checkout process, organized by stage.

---

## Overview

The checkout process consists of five main stages:
1. **createCart** - Initialize a shopping cart
2. **addLineItem** - Add products to the cart
3. **setShippingMethod** - Select delivery/shipping options
4. **createPayment** - Initialize payment session
5. **authorizePayment** - Verify and complete payment

---

## Stage 1: Create Cart

### Primary Endpoints

#### **GET /store/cart**
**Purpose:** Retrieve existing cart or auto-create a new one if none exists

**Authentication:** Optional (works for both guest and authenticated users)

**Query Parameters:**
- `cart_id` (optional): Specific cart ID to retrieve

**Response:** `200 OK`
```json
{
  "cart": {
    "id": "cart_01HZXYZ123",
    "customer_id": "cus_01HZABC456",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "region_id": "reg_01HZREG789",
    "items": [],
    "subtotal": 0,
    "tax_total": 0,
    "shipping_total": 0,
    "total": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Features:**
- Automatically creates cart if none exists
- Stores cart ID in session for guest users
- Links cart to customer account for authenticated users
- Auto-resolves region based on currency

---

#### **POST /store/cart**
**Purpose:** Explicitly create a new cart

**Authentication:** Optional (works for both guest and authenticated users)

**Request Body:**
```json
{
  "currency_code": "ghs",
  "region_id": "reg_01HZREG789"
}
```

**Fields:**
- `currency_code` (optional, default: "ghs"): Currency for the cart
- `region_id` (optional): Region ID (auto-resolved if not provided)

**Response:** `201 Created`
```json
{
  "cart": {
    "id": "cart_01HZXYZ123",
    "customer_id": "cus_01HZABC456",
    "currency_code": "ghs",
    "region_id": "reg_01HZREG789",
    "items": [],
    "total": 0
  }
}
```

**When to Use:**
- Explicitly creating a fresh cart
- Switching regions or currencies
- Starting a new shopping session

**Error Responses:**
- `400 Bad Request`: Invalid region_id or currency_code
- `500 Internal Server Error`: Failed to create cart

---

## Stage 2: Add Line Item

### Primary Endpoint

#### **POST /store/cart/items**
**Purpose:** Add a product variant to the cart

**Authentication:** Optional (works for both guest and authenticated users)

**Request Body:**
```json
{
  "variant_id": "variant_01HZVARIANT456",
  "quantity": 2,
  "cart_id": "cart_01HZXYZ123"
}
```

**Fields:**
- `variant_id` (required): Product variant ID to add
- `quantity` (optional, default: 1): Number of items to add
- `cart_id` (optional): Cart ID (uses session if not provided)

**Response:** `201 Created`
```json
{
  "message": "Item added to cart successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [
      {
        "id": "li_01HZITEM001",
        "title": "Product Name",
        "subtitle": "Variant Name",
        "thumbnail": "https://example.com/image.jpg",
        "quantity": 2,
        "unit_price": 5000,
        "total": 10000,
        "product_id": "prod_01HZPROD123",
        "variant_id": "variant_01HZVARIANT456",
        "product": {
          "id": "prod_01HZPROD123",
          "title": "Product Name",
          "handle": "product-name",
          "thumbnail": "https://example.com/image.jpg"
        },
        "variant": {
          "id": "variant_01HZVARIANT456",
          "title": "Variant Name",
          "sku": "SKU-123",
          "price": 5000,
          "currency": "ghs"
        }
      }
    ],
    "subtotal": 10000,
    "total": 10000
  }
}
```

**Behavior:**
- If variant already exists in cart, quantity is **incremented** (not duplicated)
- Automatically calculates totals
- Validates variant pricing against cart region

**Error Responses:**
- `400 Bad Request`: Missing variant_id, invalid quantity, or pricing error
- `404 Not Found`: Cart or variant not found
- `500 Internal Server Error`: Failed to add item

### Related Endpoints

#### **PATCH /store/cart/items/:id**
**Purpose:** Update quantity of existing line item

**Request Body:**
```json
{
  "quantity": 5
}
```

**Response:** `200 OK` (updated cart)

---

#### **DELETE /store/cart/items/:id**
**Purpose:** Remove line item from cart

**Response:** `200 OK` (updated cart)

---

## Stage 3: Set Shipping Method

### Primary Endpoint

#### **GET /store/cart/shipping-methods**
**Purpose:** Get available shipping/delivery methods for the cart

**Authentication:** Optional

**Query Parameters:**
- `cart_id` (optional): Cart ID (uses session if not provided)

**Response:** `200 OK`
```json
{
  "shipping_methods": [
    {
      "id": "sm_standard",
      "name": "Standard Shipping",
      "description": "Delivery in 5-7 business days",
      "amount": 1000,
      "currency_code": "ghs"
    },
    {
      "id": "sm_express",
      "name": "Express Shipping",
      "description": "Delivery in 2-3 business days",
      "amount": 2500,
      "currency_code": "ghs"
    },
    {
      "id": "sm_same_day",
      "name": "Same Day Delivery",
      "description": "Delivery within 24 hours (Accra only)",
      "amount": 5000,
      "currency_code": "ghs",
      "restrictions": "Available only in Greater Accra Region"
    },
    {
      "id": "sm_pickup",
      "name": "Store Pickup",
      "description": "Pick up from our store in Accra",
      "amount": 0,
      "currency_code": "ghs"
    }
  ],
  "cart_id": "cart_01HZXYZ123",
  "region_id": "reg_01HZREG789",
  "note": "Configure fulfillment providers in medusa-config.js for dynamic shipping options"
}
```

**Features:**
- Returns shipping methods based on cart region
- Includes pricing in cart currency
- Currently returns default methods (can be enhanced with fulfillment providers)

**Error Responses:**
- `400 Bad Request`: Missing cart_id or cart has no region
- `404 Not Found`: Cart not found
- `500 Internal Server Error`: Failed to fetch shipping methods

### Related Endpoint

#### **PATCH /store/cart**
**Purpose:** Update cart with shipping address and delivery preference

**Request Body (New Frontend Format):**
```json
{
  "delivery": {
    "deliveryOption": "delivery",
    "country": "Ghana",
    "streetAddress": "123 Independence Avenue",
    "apartment": "Apt 4B",
    "city": "Accra",
    "region": "Greater Accra",
    "phone": "+233244123456",
    "additionalPhone": "+233501234567",
    "email": "customer@example.com",
    "postalCode": "GA-123-4567"
  }
}
```

**Request Body (Pickup Option):**
```json
{
  "delivery": {
    "deliveryOption": "pickup",
    "phone": "+233244123456"
  }
}
```

**Request Body (Legacy Format):**
```json
{
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "city": "Accra",
    "province": "Greater Accra Region",
    "postal_code": "GA001",
    "country_code": "GH",
    "phone": "+233241234567"
  },
  "billing_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "city": "Accra",
    "province": "Greater Accra Region",
    "postal_code": "GA001",
    "country_code": "GH",
    "phone": "+233241234567"
  }
}
```

---

## Stage 4: Create Payment

### Primary Endpoint

#### **POST /store/payments/paystack/initialize**
**Purpose:** Initialize Paystack payment session for cart

**Authentication:** Required

**Request Body:**
```json
{
  "cart_id": "cart_01HZXYZ123",
  "channels": ["card", "mobile_money"],
  "metadata": {
    "custom_field": "value"
  }
}
```

**Fields:**
- `cart_id` (optional): Cart ID (uses session if not provided)
- `channels` (optional): Payment channels to enable (default: ["card", "mobile_money"])
- `metadata` (optional): Additional metadata to pass to Paystack

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment initialized successfully",
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123xyz",
    "access_code": "abc123xyz",
    "reference": "T123456789",
    "amount": 1000000,
    "original_cart_amount": 10000,
    "currency": "ghs",
    "converted_for_payment": false
  }
}
```

**Response Fields:**
- `authorization_url`: URL to redirect user for payment
- `access_code`: Paystack access code
- `reference`: Unique payment reference (use this for verification)
- `amount`: Amount in pesewas (kobo) - Paystack requires smallest currency unit
- `original_cart_amount`: Original cart total
- `currency`: Payment currency
- `converted_for_payment`: Whether amount was converted (cedis to pesewas)

**Payment Flow:**
1. Call this endpoint to initialize payment
2. Redirect user to `authorization_url`
3. User completes payment on Paystack
4. Paystack redirects to your callback URL
5. Verify payment using the `reference`

**Supported Payment Methods:**
- **Card** (Visa, Mastercard, Verve)
- **Mobile Money** (MTN, Vodafone, AirtelTigo) - Ghana
- **Bank Transfer**
- **USSD**
- **QR Code**

**Error Responses:**
- `401 Unauthorized`: User not logged in
- `400 Bad Request`: Cart is empty or invalid
- `404 Not Found`: Cart or customer not found
- `503 Service Unavailable`: Paystack not configured
- `500 Internal Server Error`: Payment initialization failed

**Important Notes:**
- Paystack requires amounts in pesewas (smallest unit)
- 1 GHS = 100 pesewas
- Cart ID is stored in payment metadata for verification
- Payment reference is stored in session

---

## Stage 5: Authorize Payment

### Primary Endpoints

#### **GET /store/payments/paystack/verify?reference=xxx**
**Purpose:** Verify Paystack payment and create order

**Authentication:** Required

**Query Parameters:**
- `reference` (required): Payment reference from initialization

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment verified and order created successfully",
  "order": {
    "id": "order_01HZORDER123",
    "display_id": "1001",
    "status": "pending",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "total": 10000,
    "subtotal": 10000,
    "tax_total": 0,
    "shipping_total": 0,
    "discount_total": 0,
    "items": [
      {
        "id": "oi_01HZITEM001",
        "title": "Product Name",
        "subtitle": "Variant Name",
        "thumbnail": "https://example.com/image.jpg",
        "quantity": 2,
        "unit_price": 5000,
        "total": 10000,
        "product_id": "prod_01HZPROD123",
        "variant_id": "variant_01HZVARIANT456"
      }
    ],
    "shipping_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main Street",
      "city": "Accra",
      "country_code": "GH",
      "phone": "+233241234567"
    },
    "billing_address": {...},
    "metadata": {
      "payment_provider": "paystack",
      "payment_reference": "T123456789",
      "payment_status": "success",
      "payment_channel": "card",
      "payment_paid_at": "2024-01-01T00:00:00Z",
      "payment_transaction_id": "1234567890",
      "payment_gateway_response": "Successful",
      "payment_authorization_code": "AUTH_abc123",
      "payment_card_type": "visa",
      "payment_last4": "4081",
      "payment_bank": "TEST BANK",
      "payment_captured": true,
      "payment_captured_at": "2024-01-01T00:00:00Z"
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "payment": {
    "reference": "T123456789",
    "amount": 1000000,
    "currency": "GHS",
    "status": "success",
    "channel": "card",
    "paid_at": "2024-01-01T00:00:00Z",
    "gateway_response": "Successful"
  }
}
```

**Process:**
1. Verifies payment with Paystack API
2. Validates payment status is "success"
3. Retrieves cart associated with payment
4. Validates cart total matches payment amount
5. Creates order from cart
6. Updates order with payment metadata
7. Deletes cart and clears session
8. Returns order details

**Error Responses:**
- `401 Unauthorized`: User not logged in
- `400 Bad Request`: Missing reference, payment not successful, or amount mismatch
- `404 Not Found`: Cart or customer not found
- `500 Internal Server Error`: Payment verification or order creation failed

---

#### **POST /store/orders/:id/update-payment-status**
**Purpose:** Update payment status for an existing order

**Authentication:** Required (must own the order)

**Path Parameters:**
- `id` (required): Order ID

**Request Body:**
```json
{
  "payment_reference": "T123456789",
  "payment_status": "success",
  "payment_method": "card"
}
```

**Fields:**
- `payment_reference` (optional): Payment reference to verify with Paystack
- `payment_status` (optional): Manual payment status update
- `payment_method` (optional): Payment method used

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "order": {
    "id": "order_01HZORDER123",
    "status": "pending",
    "metadata": {
      "payment_provider": "paystack",
      "payment_reference": "T123456789",
      "payment_status": "success",
      "payment_captured": true,
      "payment_captured_at": "2024-01-01T00:00:00Z",
      "payment_channel": "card",
      "payment_paid_at": "2024-01-01T00:00:00Z",
      "payment_transaction_id": "1234567890",
      "payment_gateway_response": "Successful"
    }
  }
}
```

**Use Cases:**
- Updating payment status after webhook notification
- Manually marking payment as captured
- Adding payment details to existing order

**Process (with payment_reference):**
1. Verifies order ownership
2. Verifies payment with Paystack API
3. Validates payment amount matches order total
4. Updates order metadata with payment details
5. Marks payment as captured

**Error Responses:**
- `401 Unauthorized`: User not logged in
- `400 Bad Request`: Missing required fields or invalid data
- `403 Forbidden`: Order doesn't belong to user
- `404 Not Found`: Order not found
- `500 Internal Server Error`: Payment verification or update failed

---

### Webhook Endpoint (Automatic Authorization)

#### **POST /hooks/payment/paystack_paystack**
**Purpose:** Receive and process Paystack webhook events

**Authentication:** Verified via Paystack signature

**Supported Events:**
- `charge.success` - Payment succeeded
- `charge.failed` - Payment failed

**Process (charge.success):**
1. Validates webhook signature
2. Finds order by payment reference
3. Updates order metadata with payment details
4. Marks payment as captured

**Note:** This is called automatically by Paystack - no frontend action needed

---

## Complete Checkout Flow Example

### Step-by-Step Implementation

```typescript
// Step 1: Create Cart
const cartResponse = await fetch('/store/cart', {
  method: 'GET',
  credentials: 'include',
});
const { cart } = await cartResponse.json();

// Step 2: Add Line Items
const addItemResponse = await fetch('/store/cart/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    variant_id: 'variant_01HZVARIANT456',
    quantity: 2,
  }),
});
const { cart: updatedCart } = await addItemResponse.json();

// Step 3: Set Shipping Method (Optional - Get Available Methods)
const shippingResponse = await fetch('/store/cart/shipping-methods', {
  credentials: 'include',
});
const { shipping_methods } = await shippingResponse.json();

// Update cart with delivery information
await fetch('/store/cart', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    delivery: {
      deliveryOption: 'delivery',
      country: 'Ghana',
      streetAddress: '123 Independence Avenue',
      city: 'Accra',
      region: 'Greater Accra',
      phone: '+233244123456',
      additionalPhone: '+233501234567',
      email: 'customer@example.com',
    },
  }),
});

// Step 4: Create Payment
const paymentResponse = await fetch('/store/payments/paystack/initialize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    channels: ['card', 'mobile_money'],
  }),
});
const paymentData = await paymentResponse.json();

// Redirect to Paystack
window.location.href = paymentData.data.authorization_url;

// Step 5: Authorize Payment (After Paystack redirect)
// User is redirected back to your callback URL with reference parameter
const urlParams = new URLSearchParams(window.location.search);
const reference = urlParams.get('reference');

const verifyResponse = await fetch(
  `/store/payments/paystack/verify?reference=${reference}`,
  {
    credentials: 'include',
  }
);
const { order } = await verifyResponse.json();

// Order created successfully! Redirect to confirmation page
window.location.href = `/order-confirmation/${order.id}`;
```

---

## Alternative Flow: Complete Checkout Without Separate Payment

### **POST /store/cart/complete**
**Purpose:** Complete checkout and create order (without separate payment initialization)

**Authentication:** Required

**Request Body (New Frontend Format):**
```json
{
  "delivery": {
    "deliveryOption": "delivery",
    "country": "Ghana",
    "streetAddress": "123 Independence Avenue",
    "apartment": "Apt 4B",
    "city": "Accra",
    "region": "Greater Accra",
    "phone": "+233244123456",
    "additionalPhone": "+233501234567",
    "email": "customer@example.com",
    "postalCode": "GA-123-4567"
  },
  "payment": {
    "paymentMethod": "card"
  },
  "payment_provider_id": "paystack"
}
```

**Response:** `200 OK`
```json
{
  "message": "Order created successfully",
  "order": {
    "id": "order_01HZORDER123",
    "display_id": "1001",
    "status": "pending",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "total": 10000,
    "items": [...],
    "shipping_address": {...},
    "billing_address": {...},
    "metadata": {
      "delivery_option": "delivery",
      "additional_phone": "+233501234567",
      "payment_method": "card",
      "payment_status": "pending",
      "payment_captured": false,
      "payment_initialized_at": "2024-01-01T00:00:00Z"
    },
    "delivery_option": "delivery",
    "payment_method": "card",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Note:** This creates an order immediately but payment is marked as pending. You'll need to initialize and verify payment separately using the payment endpoints.

---

## Endpoint Summary Table

| Stage | Method | Endpoint | Auth Required | Purpose |
|-------|--------|----------|---------------|---------|
| **1. Create Cart** | GET | `/store/cart` | Optional | Get or create cart |
| | POST | `/store/cart` | Optional | Explicitly create new cart |
| **2. Add Line Item** | POST | `/store/cart/items` | Optional | Add product to cart |
| | PATCH | `/store/cart/items/:id` | Optional | Update item quantity |
| | DELETE | `/store/cart/items/:id` | Optional | Remove item from cart |
| **3. Set Shipping** | GET | `/store/cart/shipping-methods` | Optional | Get available shipping methods |
| | PATCH | `/store/cart` | Optional | Update delivery information |
| **4. Create Payment** | POST | `/store/payments/paystack/initialize` | Required | Initialize Paystack payment |
| **5. Authorize Payment** | GET | `/store/payments/paystack/verify` | Required | Verify payment and create order |
| | POST | `/store/orders/:id/update-payment-status` | Required | Update order payment status |
| **Alternative** | POST | `/store/cart/complete` | Required | Complete checkout without separate payment |

---

## Error Handling Best Practices

### Common Error Scenarios

1. **Cart Not Found**
   - Clear session cart_id
   - Create new cart
   - Ask user to re-add items

2. **Payment Initialization Failed**
   - Check user authentication
   - Verify cart has items
   - Ensure Paystack is configured
   - Display error message to user

3. **Payment Verification Failed**
   - Check payment reference is valid
   - Verify payment on Paystack dashboard
   - Contact support if payment was successful but verification failed

4. **Amount Mismatch**
   - Cart was modified after payment initialization
   - Refund payment through Paystack dashboard
   - Ask user to checkout again

5. **Order Creation Failed**
   - Payment was successful but order creation failed
   - Check server logs
   - Manually create order from payment reference
   - Never charge customer twice

---

## Testing Guide

### Test with cURL

```bash
# 1. Create Cart
curl -X POST http://localhost:9000/store/cart \
  -H "Content-Type: application/json" \
  -c cookies.txt

# 2. Add Line Item
curl -X POST http://localhost:9000/store/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "variant_id": "variant_01HZVARIANT456",
    "quantity": 2
  }'

# 3. Get Shipping Methods
curl -X GET http://localhost:9000/store/cart/shipping-methods \
  -b cookies.txt

# 4. Login (Required for payment)
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# 5. Initialize Payment
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "channels": ["card", "mobile_money"]
  }'

# 6. Verify Payment (after completing on Paystack)
curl -X GET "http://localhost:9000/store/payments/paystack/verify?reference=T123456789" \
  -b cookies.txt
```

### Paystack Test Cards

**Success:**
```
Card Number: 4084084084084081
CVV: 408
Expiry: 12/25
PIN: 0000
OTP: 123456
```

**Failure:**
```
Card Number: 5060666666666666666
CVV: 123
Expiry: 12/25
```

---

## Configuration Requirements

### Environment Variables

```bash
# Required for Payment
PAYSTACK_SECRET_KEY=sk_test_your_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key

# Required for Database
DATABASE_URL=postgresql://user:password@localhost:5432/medusa-db

# Required for Security
JWT_SECRET=your-jwt-secret
COOKIE_SECRET=your-cookie-secret

# Required for URLs
FRONTEND_URL=http://localhost:8000
BACKEND_PUBLIC_URL=http://localhost:9000
```

### Paystack Setup

1. Sign up at [Paystack Dashboard](https://dashboard.paystack.com)
2. Get API keys from Settings > API Keys & Webhooks
3. Configure webhook URL: `https://yourdomain.com/hooks/payment/paystack_paystack`
4. Enable events: `charge.success`, `charge.failed`

---

## Related Documentation

- [CART_ENDPOINTS.md](./CART_ENDPOINTS.md) - Complete cart API documentation
- [CHECKOUT_ENDPOINTS.md](./CHECKOUT_ENDPOINTS.md) - Checkout flow documentation
- [SETUP_PAYSTACK_ONLY.md](./SETUP_PAYSTACK_ONLY.md) - Paystack configuration guide
- [CHECKOUT_QUICK_REFERENCE.md](./CHECKOUT_QUICK_REFERENCE.md) - Quick reference guide

---

## Support & Troubleshooting

For issues with:
- **Cart operations**: Check [CART_ENDPOINTS.md](./CART_ENDPOINTS.md)
- **Paystack integration**: Check [SETUP_PAYSTACK_ONLY.md](./SETUP_PAYSTACK_ONLY.md)
- **Authentication**: Check [QUICK_START_AUTH.md](./QUICK_START_AUTH.md)
- **Checkout flow**: Check [CHECKOUT_ENDPOINTS.md](./CHECKOUT_ENDPOINTS.md)

---

**Report Generated:** December 6, 2024  
**Backend Version:** Kente & Bobs E-commerce Platform  
**Payment Provider:** Paystack

