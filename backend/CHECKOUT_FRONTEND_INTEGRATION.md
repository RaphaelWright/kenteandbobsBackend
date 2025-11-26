# Checkout Frontend Integration Guide

This guide explains how the backend checkout endpoints integrate with the frontend checkout flow.

## Overview

The checkout system supports a modern frontend structure with:
- **Delivery Options**: Pickup or Delivery
- **Payment Methods**: Card or Mobile Money
- **Ghana-specific Validation**: Phone numbers and addresses
- **Real-time Validation**: Client and server-side validation

---

## Frontend Data Structures

### DeliveryData Interface

```typescript
interface DeliveryData {
  deliveryOption: "pickup" | "delivery";
  country?: string;
  streetAddress?: string;
  apartment?: string;
  city?: string;
  region?: string;
  phone?: string;
  additionalPhone?: string;
  email?: string;
  postalCode?: string;
}
```

### PaymentData Interface

```typescript
interface PaymentData {
  paymentMethod: "card" | "mobile_money";
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  mobileNumber?: string;
}
```

---

## API Endpoint: Complete Checkout

### `POST /store/cart/complete`

Complete the checkout process and create an order.

#### Request Body

The endpoint accepts both the **new frontend format** and **legacy format** for backward compatibility.

**New Format (Recommended):**

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

**Pickup Example:**

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

**Legacy Format (Still Supported):**

```json
{
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Independence Avenue",
    "city": "Accra",
    "country_code": "gh",
    "phone": "+233244123456"
  },
  "billing_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Independence Avenue",
    "city": "Accra",
    "country_code": "gh",
    "phone": "+233244123456"
  },
  "payment_provider_id": "stripe"
}
```

#### Response

**Success (200 OK):**

```json
{
  "message": "Order created successfully",
  "order": {
    "id": "order_01HZXYZ789",
    "display_id": "1001",
    "status": "pending",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "total": 50000,
    "subtotal": 45000,
    "tax_total": 0,
    "shipping_total": 5000,
    "discount_total": 0,
    "items": [
      {
        "id": "li_01HZITEM001",
        "title": "Kente Cloth - Traditional",
        "quantity": 1,
        "unit_price": 45000,
        "total": 45000
      }
    ],
    "shipping_address": {
      "first_name": "customer",
      "address_1": "123 Independence Avenue",
      "city": "Accra",
      "country_code": "gh",
      "phone": "+233244123456"
    },
    "metadata": {
      "delivery_option": "delivery",
      "additional_phone": "+233501234567",
      "payment_method": "card"
    },
    "delivery_option": "delivery",
    "payment_method": "card",
    "created_at": "2024-11-26T10:30:00Z"
  }
}
```

**Error Responses:**

```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "You must be logged in to complete checkout"
}

// 400 Bad Request - Invalid Delivery
{
  "error": "Invalid delivery data",
  "message": "Invalid Ghana phone number. Format: +233XXXXXXXXX or 0XXXXXXXXX"
}

// 400 Bad Request - Empty Cart
{
  "error": "Bad Request",
  "message": "Cart is empty. Add items before checkout"
}

// 404 Not Found - Customer
{
  "error": "Customer not found",
  "message": "Please complete your profile first"
}
```

---

## Validation Rules

### Phone Number Validation

**Format:** `+233XXXXXXXXX` or `0XXXXXXXXX`
- Must start with `+233` or `0`
- Second digit must be 2, 3, 4, or 5
- Total of 9 digits after country code

**Examples:**
- ✅ `+233244123456`
- ✅ `0244123456`
- ❌ `233244123456` (missing +)
- ❌ `+233144123456` (invalid network code)
- ❌ `+23324412345` (too short)

### Email Validation

**Format:** Standard email format `user@domain.com`

### Delivery Validation

#### For Pickup:
- Only `deliveryOption: "pickup"` is required
- Optional: `phone` for contact

#### For Delivery:
- **Required fields:**
  - `country`
  - `streetAddress`
  - `city`
  - `region`
  - `phone` (validated)
  - `additionalPhone` (validated)
  - `email` (validated)
- **Optional fields:**
  - `apartment`
  - `postalCode`

### Payment Validation

#### For Card Payment:
- `paymentMethod: "card"` is required
- Card details validation (if provided):
  - `cardNumber` (will be validated using Luhn algorithm in production)
  - `cardExpiry` (MM/YY format)
  - `cardCvv` (3-4 digits)

#### For Mobile Money:
- `paymentMethod: "mobile_money"` is required
- `mobileNumber` (validated as Ghana phone number)

---

## Frontend Implementation Example

```typescript
import { useState } from "react";

interface CheckoutData {
  delivery: DeliveryData;
  payment: PaymentData;
}

async function handleCheckout(data: CheckoutData) {
  try {
    const response = await fetch("/store/cart/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for session cookies
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Checkout failed");
    }

    const result = await response.json();
    console.log("Order created:", result.order);
    
    // Redirect to order confirmation
    window.location.href = `/orders/${result.order.id}`;
  } catch (error) {
    console.error("Checkout error:", error);
    alert(error.message);
  }
}

// Usage in checkout component
function CheckoutPage() {
  const [delivery, setDelivery] = useState<DeliveryData>({
    deliveryOption: "pickup",
  });
  
  const [payment, setPayment] = useState<PaymentData>({
    paymentMethod: "card",
  });

  const handleSubmit = async () => {
    await handleCheckout({ delivery, payment });
  };

  return (
    <div>
      {/* Your checkout form UI */}
      <button onClick={handleSubmit}>Complete Order</button>
    </div>
  );
}
```

---

## Client-Side Validation

You can use the same validation rules on the frontend before making the API call:

```typescript
// Phone validation
function validateGhanaPhone(phone: string): boolean {
  const phoneRegex = /^(\+233|0)[2-5][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

// Email validation
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Delivery validation
function validateDelivery(delivery: DeliveryData): { valid: boolean; error?: string } {
  if (delivery.deliveryOption === "pickup") {
    return { valid: true };
  }

  const required = [
    "country",
    "streetAddress",
    "city",
    "region",
    "phone",
    "additionalPhone",
    "email",
  ];

  for (const field of required) {
    if (!delivery[field]) {
      return {
        valid: false,
        error: `Missing required field: ${field}`,
      };
    }
  }

  if (!validateGhanaPhone(delivery.phone!)) {
    return {
      valid: false,
      error: "Invalid phone number",
    };
  }

  if (!validateEmail(delivery.email!)) {
    return {
      valid: false,
      error: "Invalid email address",
    };
  }

  return { valid: true };
}
```

---

## Shipping Costs

### Pickup Orders
- **Shipping cost:** FREE (GH₵ 0.00)
- Customer collects from store

### Delivery Orders
- **Shipping cost:** Based on region and cart total
- Calculated automatically by the system
- Shown in cart before checkout

---

## Order Metadata

Orders include metadata about the delivery and payment options:

```json
{
  "metadata": {
    "delivery_option": "delivery" | "pickup",
    "additional_phone": "+233501234567",
    "payment_method": "card" | "mobile_money"
  }
}
```

This metadata can be used for:
- Order fulfillment (pickup vs delivery)
- Customer communication (additional phone)
- Payment processing (payment method reference)

---

## Testing

### Test Checkout Flow

1. **Login:**
   ```bash
   curl -X POST http://localhost:9000/store/auth/login \
     -H "Content-Type: application/json" \
     -c cookies.txt \
     -d '{"email": "test@example.com", "password": "password123"}'
   ```

2. **Add Items to Cart:**
   ```bash
   curl -X POST http://localhost:9000/store/cart/items \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{"variant_id": "variant_123", "quantity": 1}'
   ```

3. **Complete Checkout (Pickup):**
   ```bash
   curl -X POST http://localhost:9000/store/cart/complete \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "delivery": {
         "deliveryOption": "pickup",
         "phone": "+233244123456"
       },
       "payment": {
         "paymentMethod": "mobile_money",
         "mobileNumber": "+233244123456"
       }
     }'
   ```

4. **Complete Checkout (Delivery):**
   ```bash
   curl -X POST http://localhost:9000/store/cart/complete \
     -H "Content-Type: application/json" \
     -b cookies.txt \
     -d '{
       "delivery": {
         "deliveryOption": "delivery",
         "country": "Ghana",
         "streetAddress": "123 Independence Ave",
         "city": "Accra",
         "region": "Greater Accra",
         "phone": "+233244123456",
         "additionalPhone": "+233501234567",
         "email": "customer@example.com"
       },
       "payment": {
         "paymentMethod": "card"
       }
     }'
   ```

---

## Common Issues

### Issue: "You must be logged in to complete checkout"
**Solution:** Ensure the user is authenticated and session cookies are included in the request.

### Issue: "Invalid Ghana phone number"
**Solution:** Use the correct format: `+233XXXXXXXXX` or `0XXXXXXXXX` with valid network codes (2-5).

### Issue: "Cart is empty"
**Solution:** Ensure items are added to the cart before checkout.

### Issue: "Missing required field"
**Solution:** For delivery orders, all required fields must be provided (country, streetAddress, city, region, phone, additionalPhone, email).

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never store sensitive payment data:**
   - Card numbers, CVV, and expiry dates should never be stored in the backend
   - Use payment gateway tokenization (Stripe, Paystack, etc.)
   - Only store payment method type in metadata

2. **Validate on server-side:**
   - Always validate on the backend, even if validated on frontend
   - Client-side validation can be bypassed

3. **Authentication required:**
   - Checkout requires user to be logged in
   - Session cookies must be included in requests

4. **HTTPS required in production:**
   - All checkout requests must use HTTPS
   - Protect customer data in transit

---

## Related Documentation

- [Cart Endpoints](./CART_ENDPOINTS.md) - Managing the shopping cart
- [Customer Endpoints](./CUSTOMER_ENDPOINTS.md) - Customer authentication
- [Orders Endpoints](./ORDERS_ENDPOINTS.md) - Viewing and managing orders
- [Checkout Endpoints](./CHECKOUT_ENDPOINTS.md) - Complete checkout documentation

---

## Support

For issues or questions:
1. Check the [Troubleshooting Guide](./CART_TROUBLESHOOTING.md)
2. Review [Common Issues](#common-issues) above
3. Contact the development team

---

**Last Updated:** November 26, 2024

