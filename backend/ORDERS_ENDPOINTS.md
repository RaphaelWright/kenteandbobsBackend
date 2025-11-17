# Orders Endpoints Documentation

This document describes the customer orders endpoints available in the store API.

## Authentication

All orders endpoints require authentication. Users must be logged in with a valid session to access their orders.

## Endpoints

### 1. Get All Orders for Customer

**Endpoint:** `GET /store/orders`

**Description:** Retrieves all orders for the authenticated customer.

**Authentication:** Required

**Query Parameters:**
- `limit` (optional, default: 20) - Number of orders to return
- `offset` (optional, default: 0) - Number of orders to skip (for pagination)
- `status` (optional) - Filter by order status (e.g., "pending", "completed", "canceled")
- `order_by` (optional, default: "created_at") - Field to order by
- `order_direction` (optional, default: "desc") - Order direction ("asc" or "desc")

**Example Request:**
```bash
curl -X GET http://localhost:9000/store/orders \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie"
```

**Example with Query Parameters:**
```bash
curl -X GET "http://localhost:9000/store/orders?limit=10&offset=0&status=completed" \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie"
```

**Example Response:**
```json
{
  "orders": [
    {
      "id": "order_01JCXXX",
      "display_id": 1001,
      "status": "completed",
      "email": "customer@example.com",
      "currency_code": "ghs",
      "total": 15000,
      "subtotal": 13000,
      "tax_total": 1500,
      "shipping_total": 500,
      "discount_total": 0,
      "items": [
        {
          "id": "item_01XXX",
          "title": "Product Name",
          "subtitle": "Variant",
          "thumbnail": "https://...",
          "quantity": 2,
          "unit_price": 6500,
          "total": 13000,
          "product_id": "prod_01XXX",
          "variant_id": "variant_01XXX",
          "product": {
            "id": "prod_01XXX",
            "title": "Product Name",
            "thumbnail": "https://..."
          },
          "variant": {
            "id": "variant_01XXX",
            "title": "Small / Blue",
            "sku": "PROD-SM-BLU"
          }
        }
      ],
      "shipping_address": {
        "id": "addr_01XXX",
        "first_name": "John",
        "last_name": "Doe",
        "address_1": "123 Main St",
        "address_2": "Apt 4B",
        "city": "Accra",
        "province": "Greater Accra",
        "postal_code": "00233",
        "country_code": "GH",
        "phone": "+233123456789"
      },
      "billing_address": {
        "id": "addr_02XXX",
        "first_name": "John",
        "last_name": "Doe",
        "address_1": "123 Main St",
        "address_2": "Apt 4B",
        "city": "Accra",
        "province": "Greater Accra",
        "postal_code": "00233",
        "country_code": "GH",
        "phone": "+233123456789"
      },
      "shipping_methods": [
        {
          "id": "sm_01XXX",
          "name": "Standard Shipping",
          "amount": 500
        }
      ],
      "payment_status": "captured",
      "fulfillment_status": "fulfilled",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T11:00:00Z",
      "canceled_at": null
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 20
}
```

---

### 2. Get Single Order by ID

**Endpoint:** `GET /store/orders/:id`

**Description:** Retrieves detailed information for a specific order. Only returns orders that belong to the authenticated customer.

**Authentication:** Required

**Path Parameters:**
- `id` (required) - The order ID

**Example Request:**
```bash
curl -X GET http://localhost:9000/store/orders/order_01JCXXX \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie"
```

**Example Response:**
```json
{
  "order": {
    "id": "order_01JCXXX",
    "display_id": 1001,
    "status": "completed",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "total": 15000,
    "subtotal": 13000,
    "tax_total": 1500,
    "shipping_total": 500,
    "discount_total": 0,
    "items": [
      {
        "id": "item_01XXX",
        "title": "Product Name",
        "subtitle": "Variant",
        "thumbnail": "https://...",
        "quantity": 2,
        "unit_price": 6500,
        "total": 13000,
        "product_id": "prod_01XXX",
        "variant_id": "variant_01XXX",
        "product": {
          "id": "prod_01XXX",
          "title": "Product Name",
          "handle": "product-name",
          "thumbnail": "https://...",
          "images": [
            {
              "id": "img_01XXX",
              "url": "https://..."
            }
          ]
        },
        "variant": {
          "id": "variant_01XXX",
          "title": "Small / Blue",
          "sku": "PROD-SM-BLU"
        }
      }
    ],
    "shipping_address": {
      "id": "addr_01XXX",
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "address_2": "Apt 4B",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "00233",
      "country_code": "GH",
      "phone": "+233123456789"
    },
    "billing_address": {
      "id": "addr_02XXX",
      "first_name": "John",
      "last_name": "Doe",
      "address_1": "123 Main St",
      "address_2": "Apt 4B",
      "city": "Accra",
      "province": "Greater Accra",
      "postal_code": "00233",
      "country_code": "GH",
      "phone": "+233123456789"
    },
    "shipping_methods": [
      {
        "id": "sm_01XXX",
        "name": "Standard Shipping",
        "amount": 500
      }
    ],
    "payment_collections": [
      {
        "id": "paycol_01XXX",
        "status": "captured",
        "amount": 15000,
        "payments": [
          {
            "id": "pay_01XXX",
            "amount": 15000,
            "currency_code": "ghs",
            "provider_id": "pp_stripe"
          }
        ]
      }
    ],
    "fulfillments": [
      {
        "id": "ful_01XXX",
        "created_at": "2024-01-15T11:00:00Z",
        "items": [
          {
            "id": "fulitem_01XXX",
            "quantity": 2,
            "line_item_id": "item_01XXX"
          }
        ]
      }
    ],
    "payment_status": "captured",
    "fulfillment_status": "fulfilled",
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T11:00:00Z",
    "canceled_at": null
  }
}
```

---

## Error Responses

### 401 Unauthorized
Returned when the user is not authenticated.

```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden
Returned when trying to access an order that doesn't belong to the authenticated customer.

```json
{
  "error": "Unauthorized - This order does not belong to you"
}
```

### 404 Not Found
Returned when the order or customer is not found.

```json
{
  "error": "Order not found"
}
```

```json
{
  "error": "Customer not found"
}
```

### 500 Internal Server Error
Returned when there's a server error.

```json
{
  "error": "Failed to fetch orders",
  "message": "Detailed error message"
}
```

---

## Order Statuses

Common order statuses you might encounter:

- `pending` - Order has been created but not yet processed
- `completed` - Order has been successfully completed
- `canceled` - Order has been canceled
- `requires_action` - Order requires some action (e.g., payment)

## Payment Statuses

- `not_paid` - Payment has not been made
- `awaiting` - Awaiting payment confirmation
- `authorized` - Payment has been authorized
- `captured` - Payment has been captured
- `partially_refunded` - Payment has been partially refunded
- `refunded` - Payment has been fully refunded
- `canceled` - Payment has been canceled

## Fulfillment Statuses

- `not_fulfilled` - Order has not been fulfilled
- `fulfilled` - Order has been completely fulfilled
- `partially_fulfilled` - Order has been partially fulfilled

---

## Integration Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Get all orders
async function getMyOrders(limit = 20, offset = 0) {
  const response = await fetch(
    `http://localhost:9000/store/orders?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      credentials: 'include', // Important: includes cookies
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch orders');
  }
  
  return await response.json();
}

// Get specific order
async function getOrder(orderId: string) {
  const response = await fetch(
    `http://localhost:9000/store/orders/${orderId}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch order');
  }
  
  return await response.json();
}
```

### React Example

```tsx
import { useEffect, useState } from 'react';

function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch('http://localhost:9000/store/orders', {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        setOrders(data.orders);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>My Orders</h1>
      {orders.map(order => (
        <div key={order.id}>
          <h2>Order #{order.display_id}</h2>
          <p>Status: {order.status}</p>
          <p>Total: {order.currency_code} {order.total / 100}</p>
          <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Notes

- All monetary values are returned in the smallest unit of the currency (e.g., cents for USD, pesewas for GHS)
- Dates are returned in ISO 8601 format
- The session cookie must be included in all requests for authentication
- Orders can only be viewed by the customer who placed them
- The endpoints automatically fetch related data like products, variants, addresses, and fulfillments

