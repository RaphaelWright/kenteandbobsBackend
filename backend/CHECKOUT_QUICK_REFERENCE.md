# Checkout Quick Reference

Quick reference for the checkout API endpoint matching the frontend structure.

---

## Endpoint

```
POST /store/cart/complete
```

**Authentication:** Required (session cookies)

---

## Request Format

```typescript
{
  delivery: {
    deliveryOption: "pickup" | "delivery",
    // Required for delivery only:
    country?: string,
    streetAddress?: string,
    apartment?: string,
    city?: string,
    region?: string,
    phone?: string,           // +233XXXXXXXXX or 0XXXXXXXXX
    additionalPhone?: string, // +233XXXXXXXXX or 0XXXXXXXXX
    email?: string,
    postalCode?: string
  },
  payment: {
    paymentMethod: "card" | "mobile_money",
    // Card fields (not stored):
    cardNumber?: string,
    cardExpiry?: string,
    cardCvv?: string,
    // Mobile money:
    mobileNumber?: string
  }
}
```

---

## Quick Examples

### Pickup Order

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

### Delivery Order

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

## Validation Rules

| Field | Format | Example |
|-------|--------|---------|
| **Phone** | `+233[2-5]XXXXXXXX` or `0[2-5]XXXXXXXX` | `+233244123456` |
| **Email** | Standard email | `user@example.com` |
| **Delivery Option** | `"pickup"` or `"delivery"` | `"delivery"` |
| **Payment Method** | `"card"` or `"mobile_money"` | `"card"` |

---

## Response Format

```typescript
{
  message: "Order created successfully",
  order: {
    id: string,
    display_id: string,
    status: string,
    total: number,           // Amount in cents
    subtotal: number,
    shipping_total: number,
    currency_code: string,   // "ghs"
    items: Array,
    delivery_option: "pickup" | "delivery",
    payment_method: "card" | "mobile_money",
    created_at: string
  }
}
```

---

## Error Codes

| Code | Error | Cause |
|------|-------|-------|
| **401** | Unauthorized | Not logged in |
| **400** | Invalid delivery data | Missing/invalid fields |
| **400** | Invalid phone number | Wrong phone format |
| **400** | Cart is empty | No items in cart |
| **404** | Customer not found | Profile incomplete |

---

## Frontend Validation (TypeScript)

```typescript
// Phone validation
function validatePhone(phone: string): boolean {
  return /^(\+233|0)[2-5][0-9]{8}$/.test(phone.replace(/\s/g, ""));
}

// Email validation
function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Delivery validation
function validateDelivery(delivery: DeliveryData): boolean {
  if (delivery.deliveryOption === "pickup") return true;
  
  const required = ["country", "streetAddress", "city", "region", 
                    "phone", "additionalPhone", "email"];
  
  return required.every(field => delivery[field]) &&
         validatePhone(delivery.phone!) &&
         validatePhone(delivery.additionalPhone!) &&
         validateEmail(delivery.email!);
}
```

---

## Common Mistakes

❌ **Wrong phone format:**
```json
{ "phone": "233244123456" }  // Missing +
```

✅ **Correct:**
```json
{ "phone": "+233244123456" }
```

---

❌ **Missing required fields for delivery:**
```json
{
  "delivery": {
    "deliveryOption": "delivery",
    "streetAddress": "123 Main St"
    // Missing: country, city, region, phone, etc.
  }
}
```

✅ **Correct:**
```json
{
  "delivery": {
    "deliveryOption": "delivery",
    "country": "Ghana",
    "streetAddress": "123 Main St",
    "city": "Accra",
    "region": "Greater Accra",
    "phone": "+233244123456",
    "additionalPhone": "+233501234567",
    "email": "user@example.com"
  }
}
```

---

❌ **Not including session cookies:**
```javascript
fetch('/store/cart/complete', {
  method: 'POST',
  body: JSON.stringify(data)
  // Missing: credentials: 'include'
})
```

✅ **Correct:**
```javascript
fetch('/store/cart/complete', {
  method: 'POST',
  credentials: 'include',  // Important!
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
```

---

## Full Frontend Example

```typescript
async function completeCheckout(
  delivery: DeliveryData,
  payment: PaymentData
) {
  try {
    const response = await fetch('/store/cart/complete', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery, payment })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }

    const { order } = await response.json();
    
    // Success! Redirect to order confirmation
    window.location.href = `/orders/${order.id}`;
  } catch (error) {
    console.error('Checkout failed:', error);
    alert(error.message);
  }
}
```

---

## Testing Checklist

- [ ] User is logged in (session cookies present)
- [ ] Cart has at least one item
- [ ] Phone numbers in correct format
- [ ] Email is valid
- [ ] All required fields provided (for delivery)
- [ ] Payment method selected
- [ ] Request includes `credentials: 'include'`

---

For complete documentation, see [CHECKOUT_FRONTEND_INTEGRATION.md](./CHECKOUT_FRONTEND_INTEGRATION.md)

