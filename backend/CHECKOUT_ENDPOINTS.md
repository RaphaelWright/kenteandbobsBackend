# Checkout Endpoints Documentation

This document describes all checkout-related endpoints for completing purchases in the Kente & Bobs e-commerce platform.

> **✨ NEW: Frontend Integration**  
> For the latest frontend-compatible checkout flow with delivery/payment structures, see **[CHECKOUT_FRONTEND_INTEGRATION.md](./CHECKOUT_FRONTEND_INTEGRATION.md)** and **[CHECKOUT_QUICK_REFERENCE.md](./CHECKOUT_QUICK_REFERENCE.md)**.  
> This document covers both the **new frontend format** and **legacy format**.

## Overview

The checkout process involves several steps:
1. **Validate Cart** - Ensure cart has items and is ready for checkout
2. **Add Addresses** - Add shipping and billing addresses (or use new delivery format)
3. **Select Shipping Method** - Choose delivery method (pickup or delivery)
4. **Complete Order** - Finalize purchase and create order

All checkout endpoints require **authentication** except for shipping method retrieval.

### Two Supported Formats

The `/store/cart/complete` endpoint now supports **two formats**:

1. **New Frontend Format (Recommended):**
   - Delivery data: `{ deliveryOption: "pickup" | "delivery", ... }`
   - Payment data: `{ paymentMethod: "card" | "mobile_money", ... }`
   - Ghana phone validation: `+233XXXXXXXXX` or `0XXXXXXXXX`
   - See [CHECKOUT_FRONTEND_INTEGRATION.md](./CHECKOUT_FRONTEND_INTEGRATION.md)

2. **Legacy Format (Still Supported):**
   - Traditional `shipping_address` and `billing_address`
   - Documented below in this file

---

## Base URL

Checkout endpoints are split across:
- Cart operations: `/store/cart`
- Shipping: `/store/shipping-options` (if configured)
- Order completion: `/store/cart/complete`
- Order viewing: `/store/orders`

---

## Checkout Flow

### Step 1: Validate Cart Before Checkout

Before starting checkout, ensure the cart is valid and has items.

**Endpoint:** `GET /store/cart`

**Authentication:** Optional (but required for checkout)

**Description:** Retrieve current cart to validate it has items and pricing is correct.

**Response:** `200 OK`

```json
{
  "cart": {
    "id": "cart_01HZXYZ123",
    "customer_id": "cus_01HZABC456",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "region_id": "reg_01HZREG789",
    "items": [
      {
        "id": "li_01HZITEM001",
        "title": "Product Name",
        "quantity": 2,
        "unit_price": 5000,
        "total": 10000,
        "variant_id": "variant_01HZVARIANT456"
      }
    ],
    "subtotal": 10000,
    "tax_total": 0,
    "shipping_total": 0,
    "total": 10000
  }
}
```

**Validation Checklist:**
- ✅ Cart has at least one item
- ✅ All items have valid pricing
- ✅ User is authenticated
- ✅ Cart has a valid region

---

### Step 2: Update Cart with Addresses

**Endpoint:** `PATCH /store/cart`

**Authentication:** Required

**Description:** Add or update shipping and billing addresses on the cart before completing checkout.

**Request Body:**

```json
{
  "email": "customer@example.com",
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "address_2": "Apt 4",
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
    "address_2": "Apt 4",
    "city": "Accra",
    "province": "Greater Accra Region",
    "postal_code": "GA001",
    "country_code": "GH",
    "phone": "+233241234567"
  }
}
```

**Fields:**
- `email` (required): Customer email for order confirmation
- `shipping_address` (required): Where to ship the order
  - `first_name` (required): First name
  - `last_name` (required): Last name
  - `address_1` (required): Primary address line
  - `address_2` (optional): Secondary address line
  - `city` (required): City name
  - `province` (required): State/Province/Region
  - `postal_code` (required): Postal/ZIP code
  - `country_code` (required): ISO 2-letter country code (e.g., "GH", "US")
  - `phone` (required): Contact phone number
- `billing_address` (optional): Billing address (if different from shipping)

**Response:** `200 OK`

```json
{
  "message": "Cart updated successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "email": "customer@example.com",
    "shipping_address": {...},
    "billing_address": {...},
    "items": [...],
    "total": 10000
  }
}
```

**Tips:**
- If `billing_address` is not provided, it defaults to `shipping_address`
- All address fields are validated before acceptance
- Country codes must be valid ISO 3166-1 alpha-2 codes

---

### Step 3: Get Available Shipping Methods (Optional)

**Endpoint:** `GET /store/cart/shipping-methods`

**Authentication:** Optional

**Description:** Get available shipping methods for the cart's region and destination.

**Query Parameters:**
- `cart_id` (optional): Cart ID. Can also be retrieved from session.

**Response:** `200 OK`

```json
{
  "shipping_methods": [
    {
      "id": "sm_01HZSHIP001",
      "name": "Standard Shipping",
      "description": "Delivery in 5-7 business days",
      "amount": 1000,
      "currency_code": "ghs"
    },
    {
      "id": "sm_01HZSHIP002",
      "name": "Express Shipping",
      "description": "Delivery in 2-3 business days",
      "amount": 2500,
      "currency_code": "ghs"
    },
    {
      "id": "sm_01HZSHIP003",
      "name": "Same Day Delivery",
      "description": "Delivery within 24 hours (Accra only)",
      "amount": 5000,
      "currency_code": "ghs"
    }
  ]
}
```

**Note:** This endpoint requires shipping options to be configured in the Medusa admin dashboard. If not configured, shipping method selection can be skipped during checkout.

---

### Step 4: Complete Checkout

**Endpoint:** `POST /store/cart/complete`

**Authentication:** Required

**Description:** Complete the checkout process and create an order. This is the final step that converts the cart into a confirmed order.

**Request Body (New Frontend Format - Recommended):**

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
  }
}
```

**For Pickup:**

```json
{
  "delivery": {
    "deliveryOption": "pickup",
    "phone": "+233244123456"
  },
  "payment": {
    "paymentMethod": "mobile_money",
    "mobileNumber": "+233244123456"
  }
}
```

**Request Body (Legacy Format - Still Supported):**

```json
{
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main Street",
    "address_2": "Apt 4",
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
  },
  "shipping_method_id": "sm_01HZSHIP001",
  "payment_provider_id": "stripe"
}
```

**Fields (New Format):**
- `delivery.deliveryOption` (required): "pickup" or "delivery"
- `delivery.phone` (required): Ghana phone number (+233XXXXXXXXX or 0XXXXXXXXX)
- `delivery.country` (required for delivery): Country name
- `delivery.streetAddress` (required for delivery): Street address
- `delivery.city` (required for delivery): City name
- `delivery.region` (required for delivery): Region/province
- `delivery.additionalPhone` (required for delivery): Additional contact number
- `delivery.email` (required for delivery): Customer email
- `delivery.apartment` (optional): Apartment/suite number
- `delivery.postalCode` (optional): Postal code
- `payment.paymentMethod` (required): "card" or "mobile_money"
- `payment.mobileNumber` (for mobile_money): Mobile money number

**Fields (Legacy Format):**
- `cart_id` (optional): Cart ID. Retrieved from session if not provided.
- `shipping_address` (optional if already set on cart): Shipping address
- `billing_address` (optional if already set on cart): Billing address
- `shipping_method_id` (optional): Selected shipping method ID
- `payment_provider_id` (optional, default: "stripe"): Payment provider

**Validation Rules (New Format):**
- Phone numbers must match: `/^(\+233|0)[2-5][0-9]{8}$/`
- Email must be valid format
- For delivery: all address fields are required
- For pickup: only phone number required

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
    "billing_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main Street",
      "city": "Accra",
      "country_code": "GH"
    },
    "metadata": {
      "delivery_option": "delivery",
      "additional_phone": "+233501234567",
      "payment_method": "card"
    },
    "delivery_option": "delivery",
    "payment_method": "card",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**New Response Fields (when using new format):**
- `order.delivery_option`: "pickup" or "delivery"
- `order.payment_method`: "card" or "mobile_money"
- `order.metadata.delivery_option`: Same as delivery_option
- `order.metadata.additional_phone`: Additional contact number (for delivery)
- `order.metadata.payment_method`: Payment method type

**What Happens After Completion:**
1. Order is created in the system
2. Cart is automatically deleted
3. Cart session is cleared
4. Order confirmation email is sent (if configured)
5. Inventory is reserved for the order

**Error Responses:**

**401 Unauthorized** - User not logged in
```json
{
  "error": "Unauthorized",
  "message": "You must be logged in to complete checkout"
}
```

**400 Bad Request** - Cart is empty
```json
{
  "error": "Bad Request",
  "message": "Cart is empty. Add items before checkout"
}
```

**400 Bad Request** - Invalid delivery data (new format)
```json
{
  "error": "Invalid delivery data",
  "message": "Invalid Ghana phone number. Format: +233XXXXXXXXX or 0XXXXXXXXX"
}
```

**400 Bad Request** - Invalid payment data (new format)
```json
{
  "error": "Invalid payment data",
  "message": "Payment method is required"
}
```

**400 Bad Request** - Missing required fields (new format)
```json
{
  "error": "Invalid delivery data",
  "message": "Missing required field for delivery: streetAddress"
}
```

**404 Not Found** - Cart or customer not found
```json
{
  "error": "Cart not found",
  "message": "The specified cart does not exist"
}
```

**500 Internal Server Error** - Order creation failed
```json
{
  "error": "Failed to create order",
  "message": "Error details here",
  "cart": {...}
}
```

---

### Step 5: View Order Confirmation

**Endpoint:** `GET /store/orders/:id`

**Authentication:** Required

**Description:** Retrieve the created order details for confirmation page.

**Path Parameters:**
- `id` (required): Order ID returned from checkout completion

**Response:** `200 OK`

```json
{
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
    "items": [...],
    "shipping_address": {...},
    "billing_address": {...},
    "payment_status": "not_paid",
    "fulfillment_status": "not_fulfilled",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## Complete Checkout Example

Here's a complete frontend implementation example:

### TypeScript/React Example

```typescript
import { useState } from 'react';

interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  phone: string;
}

interface CheckoutData {
  shippingAddress: Address;
  billingAddress: Address;
  shippingMethodId?: string;
}

async function completeCheckout(data: CheckoutData) {
  // Step 1: Validate cart
  const cartResponse = await fetch('/store/cart', {
    credentials: 'include',
  });
  
  if (!cartResponse.ok) {
    throw new Error('Failed to fetch cart');
  }
  
  const { cart } = await cartResponse.json();
  
  if (!cart.items || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }
  
  // Step 2: Update cart with addresses
  const updateResponse = await fetch('/store/cart', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      shipping_address: data.shippingAddress,
      billing_address: data.billingAddress,
    }),
  });
  
  if (!updateResponse.ok) {
    throw new Error('Failed to update cart');
  }
  
  // Step 3: Complete checkout
  const completeResponse = await fetch('/store/cart/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      shipping_address: data.shippingAddress,
      billing_address: data.billingAddress,
      shipping_method_id: data.shippingMethodId,
      payment_provider_id: 'stripe',
    }),
  });
  
  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.message || 'Checkout failed');
  }
  
  const { order } = await completeResponse.json();
  return order;
}

// Usage in a React component
function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSubmit = async (formData: CheckoutData) => {
    setLoading(true);
    setError(null);
    
    try {
      const order = await completeCheckout(formData);
      
      // Redirect to order confirmation page
      window.location.href = `/order-confirmation/${order.id}`;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <h1>Checkou fix</h1>
      {error && <div className="error">{error}</div>}
      {/* Checkout form here */}
      <button onClick={() => handleSubmit(formData)} disabled={loading}>
        {loading ? 'Processing...' : 'Complete Order'}
      </button>
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
async function checkout() {
  try {
    // Get form data
    const shippingAddress = {
      first_name: document.getElementById('shipping_first_name').value,
      last_name: document.getElementById('shipping_last_name').value,
      address_1: document.getElementById('shipping_address_1').value,
      city: document.getElementById('shipping_city').value,
      province: document.getElementById('shipping_province').value,
      postal_code: document.getElementById('shipping_postal_code').value,
      country_code: 'GH',
      phone: document.getElementById('shipping_phone').value,
    };
    
    const billingAddress = {
      first_name: document.getElementById('billing_first_name').value,
      last_name: document.getElementById('billing_last_name').value,
      address_1: document.getElementById('billing_address_1').value,
      city: document.getElementById('billing_city').value,
      province: document.getElementById('billing_province').value,
      postal_code: document.getElementById('billing_postal_code').value,
      country_code: 'GH',
      phone: document.getElementById('billing_phone').value,
    };
    
    // Complete checkout
    const response = await fetch('/store/cart/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        payment_provider_id: 'stripe',
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Success - redirect to order confirmation
      window.location.href = `/order-confirmation/${data.order.id}`;
    } else {
      // Error - show message
      alert(data.message || 'Checkout failed');
    }
  } catch (error) {
    console.error('Checkout error:', error);
    alert('An error occurred during checkout');
  }
}
```

---

## Checkout Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CHECKOUT FLOW                            │
└─────────────────────────────────────────────────────────────┘

1. Cart Review
   │
   ├── GET /store/cart
   │   └── Validate cart has items
   │
2. User Authentication Check
   │
   ├── If not logged in → Redirect to login
   │   └── After login, return to checkout
   │
3. Shipping Address
   │
   ├── PATCH /store/cart
   │   └── Add shipping_address
   │
4. Billing Address
   │
   ├── PATCH /store/cart
   │   └── Add billing_address
   │
5. Shipping Method (Optional)
   │
   ├── GET /store/cart/shipping-methods
   │   └── Select method
   │
6. Complete Order
   │
   ├── POST /store/cart/complete
   │   ├── Create order
   │   ├── Delete cart
   │   └── Send confirmation email
   │
7. Order Confirmation
   │
   └── GET /store/orders/:id
       └── Display order details
```

---

## Best Practices

### 1. Pre-Checkout Validation

Always validate before allowing users to proceed to checkout:

```typescript
async function validateCartForCheckout(): Promise<boolean> {
  const response = await fetch('/store/cart', { credentials: 'include' });
  const { cart } = await response.json();
  
  if (!cart.items || cart.items.length === 0) {
    alert('Your cart is empty');
    return false;
  }
  
  // Check authentication
  const authResponse = await fetch('/store/auth/me', { 
    credentials: 'include' 
  });
  
  if (!authResponse.ok) {
    // Redirect to login with return URL
    window.location.href = '/login?return=/checkout';
    return false;
  }
  
  return true;
}
```

### 2. Error Handling

Handle all possible checkout errors gracefully:

```typescript
try {
  const order = await completeCheckout(data);
  // Success
} catch (error) {
  if (error.status === 401) {
    // Not authenticated - redirect to login
    window.location.href = '/login?return=/checkout';
  } else if (error.status === 400) {
    // Validation error - show message
    showError(error.message);
  } else {
    // Server error - retry option
    showError('Checkout failed. Please try again.');
  }
}
```

### 3. Loading States

Show loading indicators during checkout:

```typescript
const [checkoutState, setCheckoutState] = useState<
  'idle' | 'validating' | 'processing' | 'success' | 'error'
>('idle');

async function handleCheckout() {
  setCheckoutState('validating');
  // Validate cart...
  
  setCheckoutState('processing');
  // Complete checkout...
  
  setCheckoutState('success');
  // Redirect to confirmation...
}
```

### 4. Address Validation

Validate addresses before submission:

```typescript
function validateAddress(address: Address): string[] {
  const errors: string[] = [];
  
  if (!address.first_name) errors.push('First name is required');
  if (!address.last_name) errors.push('Last name is required');
  if (!address.address_1) errors.push('Address is required');
  if (!address.city) errors.push('City is required');
  if (!address.postal_code) errors.push('Postal code is required');
  if (!address.phone) errors.push('Phone number is required');
  
  // Validate Ghana phone number format
  if (address.phone && !address.phone.match(/^\+233\d{9}$/)) {
    errors.push('Phone number must be in format: +233XXXXXXXXX');
  }
  
  return errors;
}
```

### 5. Save Addresses for Future Use

Consider saving addresses to customer profile after successful checkout:

```typescript
async function saveAddressToProfile(address: Address) {
  await fetch('/store/customers/me/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  });
}
```

---

## Security Considerations

1. **Authentication Required**: All checkout endpoints require valid session authentication
2. **HTTPS Only**: Always use HTTPS in production for secure data transmission
3. **CORS Configuration**: Ensure CORS is properly configured for your frontend domain
4. **Session Security**: Sessions should have secure, httpOnly cookies
5. **Input Validation**: All address fields are validated server-side
6. **Rate Limiting**: Consider implementing rate limiting on checkout endpoints

---

## Common Issues & Solutions

### Issue 1: "You must be logged in to complete checkout"

**Cause**: User session is not authenticated

**Solution**:
```typescript
// Check authentication before checkout
const authResponse = await fetch('/store/auth/me', { 
  credentials: 'include' 
});

if (!authResponse.ok) {
  window.location.href = '/login?return=/checkout';
}
```

### Issue 2: "Cart is empty"

**Cause**: Cart has no items or cart was already completed

**Solution**:
```typescript
// Validate cart before checkout
const { cart } = await fetch('/store/cart', { 
  credentials: 'include' 
}).then(r => r.json());

if (!cart.items?.length) {
  window.location.href = '/cart';
}
```

### Issue 3: "Items do not have a price"

**Cause**: Cart region doesn't match variant prices

**Solution**:
```typescript
// Reset cart with correct region
await fetch('/store/cart/reset', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    region_id: 'reg_correct_region',
    currency_code: 'ghs',
  }),
});
```

### Issue 4: Order created but confirmation page fails

**Cause**: Network error after order creation

**Solution**: Store order ID in localStorage before redirect
```typescript
const { order } = await completeCheckout(data);
localStorage.setItem('last_order_id', order.id);
window.location.href = `/order-confirmation/${order.id}`;

// On confirmation page
const orderId = localStorage.getItem('last_order_id');
if (orderId) {
  fetchOrder(orderId);
  localStorage.removeItem('last_order_id');
}
```

---

## Testing Checkout

### Manual Testing Checklist

- [ ] Cart has items before checkout
- [ ] User is authenticated
- [ ] Shipping address is valid
- [ ] Billing address is valid (or same as shipping)
- [ ] Order is created successfully
- [ ] Cart is cleared after checkout
- [ ] Order confirmation page displays correctly
- [ ] Confirmation email is sent
- [ ] Order appears in order history

### cURL Testing Examples

```bash
# Step 1: Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# Step 2: Get cart
curl -X GET http://localhost:9000/store/cart \
  -b cookies.txt

# Step 3: Add item to cart
curl -X POST http://localhost:9000/store/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "variant_id": "variant_01HZVARIANT456",
    "quantity": 2
  }'

# Step 4: Update cart with addresses
curl -X PATCH http://localhost:9000/store/cart \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "shipping_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "GA001",
      "country_code": "GH",
      "phone": "+233241234567"
    },
    "billing_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "GA001",
      "country_code": "GH",
      "phone": "+233241234567"
    }
  }'

# Step 5: Complete checkout
curl -X POST http://localhost:9000/store/cart/complete \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "shipping_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "GA001",
      "country_code": "GH",
      "phone": "+233241234567"
    },
    "billing_address": {
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "GA001",
      "country_code": "GH",
      "phone": "+233241234567"
    },
    "payment_provider_id": "stripe"
  }'

# Step 6: Get order details
curl -X GET http://localhost:9000/store/orders/order_XXXXX \
  -b cookies.txt
```

---

## Related Documentation

- [Cart Endpoints](./CART_ENDPOINTS.md) - Cart management before checkout
- [Orders Endpoints](./ORDERS_ENDPOINTS.md) - Viewing orders after checkout
- [Customer Endpoints](./CUSTOMER_ENDPOINTS.md) - Customer profile and saved addresses
- [Authentication](./QUICK_START_AUTH.md) - User authentication for checkout

---

## Support

For issues or questions:
1. Check [CART_TROUBLESHOOTING.md](./CART_TROUBLESHOOTING.md) for common cart issues
2. Verify authentication is working with `/store/auth/me`
3. Check server logs for detailed error messages
4. Ensure at least one region is configured in Medusa admin

---

## Summary

The checkout process requires:
1. ✅ User authentication
2. ✅ Cart with items
3. ✅ Valid shipping address
4. ✅ Valid billing address (or same as shipping)
5. ✅ Valid region and currency
6. ✅ Active session with cookies

After successful checkout:
- Order is created
- Cart is deleted
- Session cart is cleared
- Confirmation email sent (if configured)
- User can view order in order history

