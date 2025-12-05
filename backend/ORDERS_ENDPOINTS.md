# Orders Endpoints Documentation

This document describes the customer orders endpoints available in the store API for the Kente & Bobs e-commerce platform.

## Overview

The Orders API allows authenticated customers to:
- **View their order history** with pagination and filtering
- **Get detailed information** about specific orders including items, addresses, and payment status
- **Update payment status** after completing payment through Paystack or other methods

Orders are created through the checkout process (see [CHECKOUT_ENDPOINTS.md](./CHECKOUT_ENDPOINTS.md)). Once created, orders are immutable except for payment status updates and fulfillment changes managed by administrators.

### Related Documentation

- **[CHECKOUT_ENDPOINTS.md](./CHECKOUT_ENDPOINTS.md)** - How to create orders through checkout
- **[CART_ENDPOINTS.md](./CART_ENDPOINTS.md)** - Cart management before checkout
- **[PAYSTACK_ENDPOINTS.md](./PAYSTACK_ENDPOINTS.md)** - Payment integration with Paystack

### Base URL

All order endpoints are available under:
```
http://localhost:9000/store/orders
```

## Authentication

All orders endpoints require authentication. Users must be logged in with a valid session to access their orders.

## Quick Reference

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/store/orders` | GET | Get all orders for customer | ✅ Yes |
| `/store/orders/:id` | GET | Get single order by ID | ✅ Yes |
| `/store/orders/:id/update-payment-status` | POST | Update payment status | ✅ Yes |

### Quick Start

```bash
# Get all orders
curl -X GET http://localhost:9000/store/orders \
  -b "connect.sid=your-session-cookie"

# Get specific order
curl -X GET http://localhost:9000/store/orders/order_01JCXXX \
  -b "connect.sid=your-session-cookie"

# Update payment status (after Paystack payment)
curl -X POST http://localhost:9000/store/orders/order_01JCXXX/update-payment-status \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie" \
  -d '{"payment_reference": "abc123xyz"}'
```

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

### 3. Update Payment Status for Order

**Endpoint:** `POST /store/orders/:id/update-payment-status`

**Description:** Update the payment status for a specific order. This endpoint is used after completing payment via Paystack or other payment methods. It verifies the payment with Paystack (if reference is provided) and updates the order metadata accordingly.

**Authentication:** Required

**Path Parameters:**
- `id` (required) - The order ID

**Request Body:**
```json
{
  "payment_reference": "xyz123abc456",  // Optional: Paystack transaction reference (will verify with Paystack)
  "payment_status": "success",          // Optional: "pending" | "success" | "failed" (if no reference provided)
  "payment_method": "card"              // Optional: Payment method used
}
```

**Note:** Either `payment_reference` or `payment_status` must be provided.

**Example Request (with Paystack verification):**
```bash
curl -X POST http://localhost:9000/store/orders/order_01JCXXX/update-payment-status \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie" \
  -d '{
    "payment_reference": "abc123xyz456"
  }'
```

**Example Request (direct status update):**
```bash
curl -X POST http://localhost:9000/store/orders/order_01JCXXX/update-payment-status \
  -H "Content-Type: application/json" \
  -b "connect.sid=your-session-cookie" \
  -d '{
    "payment_status": "success",
    "payment_method": "mobile_money"
  }'
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Payment status updated successfully",
  "order": {
    "id": "order_01JCXXX",
    "display_id": 1001,
    "status": "completed",
    "payment_status": "captured",
    "metadata": {
      "payment_provider": "paystack",
      "payment_reference": "abc123xyz456",
      "payment_status": "success",
      "payment_captured": true,
      "payment_channel": "card",
      "payment_paid_at": "2024-01-15T10:45:00Z",
      "payment_transaction_id": "123456789",
      "payment_gateway_response": "Approved",
      "payment_authorization_code": "AUTH_xyz",
      "payment_card_type": "visa",
      "payment_last4": "1234",
      "payment_bank": "Test Bank",
      "payment_updated_at": "2024-01-15T10:45:30Z"
    },
    "total": 15000,
    "updated_at": "2024-01-15T10:45:30Z"
  }
}
```

**When Payment Reference is Provided:**
1. System verifies the payment with Paystack API
2. Checks if payment status is "success"
3. Verifies payment amount matches order total (logs warning if mismatch)
4. Updates order metadata with complete payment details
5. Stores authorization details (card type, last4, bank, etc.)

**When Payment Status is Provided Directly:**
1. Updates order metadata with provided status
2. Sets `payment_captured` flag based on status
3. Adds timestamp for status update

**Error Responses:**

**400 Bad Request - Missing Parameters:**
```json
{
  "error": "Bad Request",
  "message": "Either payment_reference or payment_status must be provided"
}
```

**400 Bad Request - Payment Verification Failed:**
```json
{
  "error": "Payment verification failed",
  "message": "Failed to verify payment with Paystack",
  "details": { }
}
```

**400 Bad Request - Payment Not Successful:**
```json
{
  "error": "Payment not successful",
  "message": "Payment status: failed",
  "data": {
    "status": "failed",
    "reference": "abc123xyz456",
    "gateway_response": "Insufficient Funds"
  }
}
```

**503 Service Unavailable - Paystack Not Configured:**
```json
{
  "error": "Payment system not configured",
  "message": "Paystack is not configured. Please contact support."
}
```

---

## Pagination & Filtering

The `/store/orders` endpoint supports pagination and filtering for better performance and user experience.

### Pagination Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of orders to return per page |
| `offset` | number | 0 | Number of orders to skip (for pagination) |
| `order_by` | string | "created_at" | Field to order results by |
| `order_direction` | string | "desc" | Order direction ("asc" or "desc") |

### Filtering Parameters

| Parameter | Type | Description | Example Values |
|-----------|------|-------------|----------------|
| `status` | string | Filter by order status | "pending", "completed", "canceled" |

### Pagination Examples

**Get first page (most recent 10 orders):**
```bash
curl -X GET "http://localhost:9000/store/orders?limit=10&offset=0" \
  -b "connect.sid=your-session-cookie"
```

**Get second page:**
```bash
curl -X GET "http://localhost:9000/store/orders?limit=10&offset=10" \
  -b "connect.sid=your-session-cookie"
```

**Get oldest orders first:**
```bash
curl -X GET "http://localhost:9000/store/orders?order_direction=asc" \
  -b "connect.sid=your-session-cookie"
```

### Filtering Examples

**Get only completed orders:**
```bash
curl -X GET "http://localhost:9000/store/orders?status=completed" \
  -b "connect.sid=your-session-cookie"
```

**Get pending orders with pagination:**
```bash
curl -X GET "http://localhost:9000/store/orders?status=pending&limit=5&offset=0" \
  -b "connect.sid=your-session-cookie"
```

### Response Metadata

The list endpoint returns pagination metadata:

```json
{
  "orders": [...],
  "count": 10,      // Number of orders in current response
  "offset": 0,      // Current offset
  "limit": 20       // Current limit
}
```

**Note:** The `count` reflects the number of items returned in the current response, not the total number of orders across all pages.

### Implementing Pagination in Frontend

```typescript
// React hook for paginated orders
function useOrders(pageSize = 10) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadPage(pageNum: number) {
    setLoading(true);
    try {
      const data = await OrderService.getOrders({
        limit: pageSize,
        offset: pageNum * pageSize,
      });
      
      setOrders(data.orders);
      setHasMore(data.orders.length === pageSize);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage(page);
  }, [page]);

  return {
    orders,
    loading,
    hasMore,
    page,
    nextPage: () => setPage(p => p + 1),
    prevPage: () => setPage(p => Math.max(0, p - 1)),
    goToPage: (p: number) => setPage(p),
  };
}

// Usage in component
function OrderHistory() {
  const { orders, loading, hasMore, page, nextPage, prevPage } = useOrders(10);

  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
      
      <div className="pagination">
        <button onClick={prevPage} disabled={page === 0}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button onClick={nextPage} disabled={!hasMore}>
          Next
        </button>
      </div>
    </div>
  );
}
```

### Infinite Scroll Implementation

```typescript
function useInfiniteOrders(pageSize = 10) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  async function loadMore() {
    if (loading || !hasMore) return;
    
    setLoading(true);
    try {
      const data = await OrderService.getOrders({
        limit: pageSize,
        offset: page * pageSize,
      });
      
      setOrders(prev => [...prev, ...data.orders]);
      setHasMore(data.orders.length === pageSize);
      setPage(p => p + 1);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMore();
  }, []);

  return { orders, loading, hasMore, loadMore };
}

// Usage with Intersection Observer
function InfiniteOrderList() {
  const { orders, loading, hasMore, loadMore } = useInfiniteOrders(10);
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  return (
    <div>
      {orders.map(order => (
        <OrderCard key={order.id} order={order} />
      ))}
      
      {loading && <div>Loading more orders...</div>}
      
      <div ref={observerTarget} style={{ height: '20px' }} />
      
      {!hasMore && <div>No more orders</div>}
    </div>
  );
}
```

---

## Order Metadata

Orders store additional payment and delivery information in the `metadata` field. Here are the common metadata fields:

### Payment-Related Metadata

- `payment_provider` - Payment provider used (e.g., "paystack")
- `payment_reference` - Payment transaction reference
- `payment_status` - Payment status ("pending", "success", "failed")
- `payment_captured` - Boolean indicating if payment was captured
- `payment_channel` - Payment channel used (e.g., "card", "mobile_money")
- `payment_paid_at` - Timestamp when payment was completed
- `payment_transaction_id` - Payment provider's transaction ID
- `payment_gateway_response` - Gateway response message
- `payment_authorization_code` - Payment authorization code
- `payment_card_type` - Card type (e.g., "visa", "mastercard")
- `payment_last4` - Last 4 digits of card
- `payment_bank` - Issuing bank name
- `payment_updated_at` - Last update timestamp
- `payment_method` - Payment method (e.g., "card", "mobile_money", "cash")

### Delivery-Related Metadata

- `delivery_option` - Delivery option ("pickup" | "delivery")
- `delivery_location` - Pickup location or delivery address details
- `delivery_phone` - Contact phone number for delivery
- `delivery_email` - Contact email for delivery

### Example Metadata Object

```json
{
  "payment_provider": "paystack",
  "payment_reference": "abc123xyz456",
  "payment_status": "success",
  "payment_captured": true,
  "payment_channel": "card",
  "payment_paid_at": "2024-01-15T10:45:00Z",
  "payment_card_type": "visa",
  "payment_last4": "1234",
  "payment_method": "card",
  "delivery_option": "delivery",
  "delivery_phone": "+233123456789",
  "delivery_email": "customer@example.com"
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

## Order Creation

Orders are created through the checkout process. To create an order, use the checkout completion endpoint:

**Endpoint:** `POST /store/cart/complete`

For detailed information about creating orders through checkout, see:
- [CHECKOUT_ENDPOINTS.md](./CHECKOUT_ENDPOINTS.md) - Complete checkout documentation
- [CHECKOUT_QUICK_REFERENCE.md](./CHECKOUT_QUICK_REFERENCE.md) - Quick reference for checkout

**Basic Order Creation Flow:**
1. Add items to cart (`POST /store/cart/items`)
2. Add shipping/billing addresses or delivery info (`PATCH /store/cart`)
3. Select shipping method (`POST /store/cart/shipping-methods`)
4. Complete checkout (`POST /store/cart/complete`)
5. Order is created and returned
6. Update payment status after payment (`POST /store/orders/:id/update-payment-status`)

---

## Complete Integration Example

Here's a complete example showing the full order lifecycle from creation to viewing:

### TypeScript/React Integration

```typescript
// types.ts
export interface Order {
  id: string;
  display_id: number;
  status: string;
  email: string;
  currency_code: string;
  total: number;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  shipping_address?: Address;
  billing_address?: Address;
  shipping_methods: ShippingMethod[];
}

export interface OrderItem {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id: string;
  variant_id: string;
  product?: {
    id: string;
    title: string;
    thumbnail?: string;
    handle?: string;
    images?: { id: string; url: string }[];
  };
  variant?: {
    id: string;
    title: string;
    sku: string;
  };
}

export interface Address {
  id: string;
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

export interface ShippingMethod {
  id: string;
  name: string;
  amount: number;
}

// orderService.ts
const API_BASE_URL = 'http://localhost:9000';

export class OrderService {
  /**
   * Fetch all orders for the authenticated customer
   */
  static async getOrders(params?: {
    limit?: number;
    offset?: number;
    status?: string;
  }): Promise<{ orders: Order[]; count: number; offset: number; limit: number }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(
      `${API_BASE_URL}/store/orders?${queryParams.toString()}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch orders');
    }

    return await response.json();
  }

  /**
   * Fetch a specific order by ID
   */
  static async getOrder(orderId: string): Promise<{ order: Order }> {
    const response = await fetch(
      `${API_BASE_URL}/store/orders/${orderId}`,
      {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch order');
    }

    return await response.json();
  }

  /**
   * Update payment status for an order
   */
  static async updatePaymentStatus(
    orderId: string,
    data: {
      payment_reference?: string;
      payment_status?: 'pending' | 'success' | 'failed';
      payment_method?: string;
    }
  ): Promise<{ success: boolean; message: string; order: Order }> {
    const response = await fetch(
      `${API_BASE_URL}/store/orders/${orderId}/update-payment-status`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to update payment status');
    }

    return await response.json();
  }

  /**
   * Format price from smallest unit to display format
   */
  static formatPrice(amount: number, currencyCode: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
    }).format(amount / 100);
  }
}

// OrderList.tsx - React component
import { useEffect, useState } from 'react';
import { OrderService, Order } from './orderService';

export function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    loadOrders();
  }, [page]);

  async function loadOrders() {
    try {
      setLoading(true);
      const data = await OrderService.getOrders({
        limit: pageSize,
        offset: page * pageSize,
      });
      
      setOrders(data.orders);
      setHasMore(data.orders.length === pageSize);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  if (loading && orders.length === 0) {
    return <div className="loading">Loading your orders...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="empty">
        <h2>No orders yet</h2>
        <p>Start shopping to create your first order!</p>
      </div>
    );
  }

  return (
    <div className="order-list">
      <h1>My Orders</h1>
      
      {orders.map(order => (
        <div key={order.id} className="order-card">
          <div className="order-header">
            <h3>Order #{order.display_id}</h3>
            <span className={`status ${order.status}`}>{order.status}</span>
          </div>
          
          <div className="order-info">
            <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Total:</strong> {OrderService.formatPrice(order.total, order.currency_code)}</p>
            <p><strong>Payment:</strong> <span className={`payment-status ${order.payment_status}`}>
              {order.payment_status}
            </span></p>
            <p><strong>Fulfillment:</strong> {order.fulfillment_status}</p>
          </div>
          
          <div className="order-items">
            <h4>Items ({order.items.length})</h4>
            {order.items.map(item => (
              <div key={item.id} className="order-item">
                {item.thumbnail && <img src={item.thumbnail} alt={item.title} />}
                <div>
                  <p><strong>{item.title}</strong></p>
                  {item.subtitle && <p className="subtitle">{item.subtitle}</p>}
                  <p>Quantity: {item.quantity} × {OrderService.formatPrice(item.unit_price, order.currency_code)}</p>
                </div>
              </div>
            ))}
          </div>
          
          <a href={`/orders/${order.id}`} className="view-details">
            View Details →
          </a>
        </div>
      ))}
      
      <div className="pagination">
        <button 
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button 
          onClick={() => setPage(p => p + 1)}
          disabled={!hasMore}
        >
          Next
        </button>
      </div>
    </div>
  );
}

// OrderDetail.tsx - Single order view
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { OrderService, Order } from './orderService';

export function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (orderId) {
      loadOrder(orderId);
    }
  }, [orderId]);

  async function loadOrder(id: string) {
    try {
      setLoading(true);
      const data = await OrderService.getOrder(id);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading order...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div className="order-detail">
      <h1>Order #{order.display_id}</h1>
      
      <div className="order-summary">
        <div className="status-badges">
          <span className={`badge ${order.status}`}>{order.status}</span>
          <span className={`badge ${order.payment_status}`}>{order.payment_status}</span>
          <span className={`badge ${order.fulfillment_status}`}>{order.fulfillment_status}</span>
        </div>
        
        <p><strong>Order Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Email:</strong> {order.email}</p>
      </div>

      <div className="order-items">
        <h2>Items</h2>
        {order.items.map(item => (
          <div key={item.id} className="item">
            {item.product?.thumbnail && (
              <img src={item.product.thumbnail} alt={item.title} />
            )}
            <div className="item-details">
              <h3>{item.title}</h3>
              {item.subtitle && <p>{item.subtitle}</p>}
              {item.variant && <p>SKU: {item.variant.sku}</p>}
              <p>Quantity: {item.quantity}</p>
              <p>Price: {OrderService.formatPrice(item.unit_price, order.currency_code)}</p>
              <p><strong>Total: {OrderService.formatPrice(item.total, order.currency_code)}</strong></p>
            </div>
          </div>
        ))}
      </div>

      <div className="order-addresses">
        <div className="address-section">
          <h3>Shipping Address</h3>
          {order.shipping_address ? (
            <address>
              {order.shipping_address.first_name} {order.shipping_address.last_name}<br />
              {order.shipping_address.address_1}<br />
              {order.shipping_address.address_2 && <>{order.shipping_address.address_2}<br /></>}
              {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}<br />
              {order.shipping_address.country_code.toUpperCase()}<br />
              Phone: {order.shipping_address.phone}
            </address>
          ) : (
            <p>No shipping address</p>
          )}
        </div>

        <div className="address-section">
          <h3>Billing Address</h3>
          {order.billing_address ? (
            <address>
              {order.billing_address.first_name} {order.billing_address.last_name}<br />
              {order.billing_address.address_1}<br />
              {order.billing_address.address_2 && <>{order.billing_address.address_2}<br /></>}
              {order.billing_address.city}, {order.billing_address.province} {order.billing_address.postal_code}<br />
              {order.billing_address.country_code.toUpperCase()}<br />
              Phone: {order.billing_address.phone}
            </address>
          ) : (
            <p>Same as shipping address</p>
          )}
        </div>
      </div>

      <div className="order-totals">
        <h3>Order Summary</h3>
        <div className="total-line">
          <span>Subtotal:</span>
          <span>{OrderService.formatPrice(order.subtotal, order.currency_code)}</span>
        </div>
        <div className="total-line">
          <span>Shipping:</span>
          <span>{OrderService.formatPrice(order.shipping_total, order.currency_code)}</span>
        </div>
        <div className="total-line">
          <span>Tax:</span>
          <span>{OrderService.formatPrice(order.tax_total, order.currency_code)}</span>
        </div>
        {order.discount_total > 0 && (
          <div className="total-line discount">
            <span>Discount:</span>
            <span>-{OrderService.formatPrice(order.discount_total, order.currency_code)}</span>
          </div>
        )}
        <div className="total-line total">
          <span><strong>Total:</strong></span>
          <span><strong>{OrderService.formatPrice(order.total, order.currency_code)}</strong></span>
        </div>
      </div>

      {order.shipping_methods && order.shipping_methods.length > 0 && (
        <div className="shipping-methods">
          <h3>Shipping Method</h3>
          {order.shipping_methods.map(method => (
            <p key={method.id}>{method.name} - {OrderService.formatPrice(method.amount, order.currency_code)}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Testing & Troubleshooting

### Testing with cURL

```bash
# 1. Login first to get session cookie
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "customer@example.com",
    "password": "password123"
  }'

# 2. Get orders using the saved cookie
curl -X GET http://localhost:9000/store/orders \
  -b cookies.txt

# 3. Get specific order
curl -X GET http://localhost:9000/store/orders/order_01JCXXX \
  -b cookies.txt

# 4. Update payment status
curl -X POST http://localhost:9000/store/orders/order_01JCXXX/update-payment-status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "payment_reference": "your-paystack-reference"
  }'
```

### Common Issues

#### 401 Unauthorized
**Problem:** Not authenticated or session expired

**Solutions:**
- Ensure you're logged in (`POST /store/auth/login`)
- Include the session cookie in your request
- Check if session has expired (sessions expire after inactivity)
- For browser requests, ensure `credentials: 'include'` is set

```typescript
// ✅ Correct - includes credentials
fetch('/store/orders', {
  credentials: 'include'
})

// ❌ Wrong - no credentials
fetch('/store/orders')
```

#### 403 Forbidden
**Problem:** Trying to access an order that doesn't belong to you

**Solutions:**
- Verify you're using the correct order ID
- Ensure you're logged in as the customer who placed the order
- Check that the order exists in the system

#### 404 Not Found
**Problem:** Order or customer not found

**Solutions:**
- Verify the order ID is correct
- Ensure the customer account exists
- Check if the order was successfully created during checkout

#### Empty Orders List
**Problem:** Getting empty array when you expect to have orders

**Possible Causes:**
- No orders have been created yet
- Orders belong to a different customer account
- Using wrong filters (e.g., filtering by non-existent status)

**Debug Steps:**
```bash
# Check if customer exists and is authenticated
curl -X GET http://localhost:9000/store/customers/me -b cookies.txt

# Get orders without filters
curl -X GET http://localhost:9000/store/orders -b cookies.txt

# Check all order statuses
curl -X GET "http://localhost:9000/store/orders?status=pending" -b cookies.txt
curl -X GET "http://localhost:9000/store/orders?status=completed" -b cookies.txt
```

#### Payment Status Not Updating
**Problem:** Payment status shows "not_paid" even after payment

**Solutions:**
1. Call the update payment status endpoint after payment:
```bash
curl -X POST http://localhost:9000/store/orders/ORDER_ID/update-payment-status \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"payment_reference": "PAYSTACK_REFERENCE"}'
```

2. Verify Paystack reference is correct
3. Check Paystack dashboard to confirm payment was successful
4. Ensure PAYSTACK_SECRET_KEY environment variable is set

### Testing Payment Status Updates

```typescript
// After successful Paystack payment
async function handlePaymentSuccess(orderId: string, paystackReference: string) {
  try {
    const result = await OrderService.updatePaymentStatus(orderId, {
      payment_reference: paystackReference
    });
    
    console.log('Payment updated:', result);
    
    // Reload order to see updated status
    const { order } = await OrderService.getOrder(orderId);
    console.log('Order payment status:', order.payment_status);
    
    if (order.payment_status === 'captured') {
      // Payment successful - show success message
      showSuccessMessage('Payment successful!');
    }
  } catch (error) {
    console.error('Failed to update payment:', error);
    // Handle error - payment might still be processing
  }
}
```

### Debugging Tips

1. **Check Authentication State:**
```typescript
// Verify you're authenticated
const response = await fetch('/store/customers/me', {
  credentials: 'include'
});
console.log('Auth status:', response.status); // Should be 200
```

2. **Inspect Order Metadata:**
```typescript
const { order } = await OrderService.getOrder(orderId);
console.log('Order metadata:', order.metadata);
// Check for payment_* fields
```

3. **Monitor Network Tab:**
- Open browser DevTools → Network tab
- Check if cookies are being sent with requests
- Verify request/response payloads
- Look for CORS errors

4. **Check Server Logs:**
```bash
# Backend logs will show detailed error messages
docker logs your-medusa-backend-container
# or
npm run dev  # Check console output
```

---

## Order Events & Notifications

The system automatically triggers events and sends notifications when orders are created or updated.

### Order Placed Event

When an order is successfully created (via checkout completion), the system:

1. **Triggers Event:** `order.placed`
2. **Sends Email:** Order confirmation email to customer
3. **Email Contains:**
   - Order ID and display number
   - Items ordered with quantities and prices
   - Shipping address
   - Order total and breakdown
   - Payment status

### Email Notification Example

```typescript
// This happens automatically - no action needed
// When order is created, customer receives:
{
  to: "customer@example.com",
  subject: "Your order has been placed",
  template: "ORDER_PLACED",
  data: {
    order: { /* order details */ },
    shippingAddress: { /* address */ },
    preview: "Thank you for your order!"
  }
}
```

### Subscribing to Order Events

If you need to perform custom actions when orders are created or updated, you can create a subscriber:

```typescript
// src/subscribers/custom-order-handler.ts
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { IOrderModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function customOrderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  // Get order details
  const order = await orderModuleService.retrieveOrder(data.id, {
    relations: ['items', 'shipping_address', 'billing_address']
  })
  
  // Your custom logic here
  console.log('New order placed:', order.id)
  
  // Examples of custom actions:
  // - Send to external system (ERP, warehouse management, etc.)
  // - Update inventory in external database
  // - Send SMS notification
  // - Create shipping label
  // - Log to analytics
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
```

### Available Order Events

| Event | Description | Triggered When |
|-------|-------------|----------------|
| `order.placed` | Order is created | Checkout is completed successfully |
| `order.updated` | Order is modified | Order details are changed |
| `order.canceled` | Order is canceled | Order status set to canceled |
| `order.completed` | Order is completed | All items fulfilled and payment captured |

### Payment Status Webhook

When using Paystack, the payment provider can send webhooks to update payment status automatically:

**Webhook URL:** `POST /store/payments/paystack/webhook`

See [PAYSTACK_ENDPOINTS.md](./PAYSTACK_ENDPOINTS.md) for webhook setup and configuration.

### Integrating with External Systems

**Example: Send order to warehouse management system**

```typescript
// src/subscribers/send-to-warehouse.ts
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { IOrderModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function sendOrderToWarehouse({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, {
    relations: ['items', 'items.product', 'items.variant', 'shipping_address']
  })
  
  // Only send orders that need fulfillment
  if (order.metadata?.delivery_option === 'pickup') {
    console.log('Order is for pickup, skipping warehouse')
    return
  }
  
  // Check payment status
  const isPaid = order.metadata?.payment_status === 'success' || 
                 order.metadata?.payment_captured === true
  
  if (!isPaid) {
    console.log('Order not paid yet, skipping warehouse')
    return
  }
  
  try {
    // Send to warehouse API
    await fetch('https://warehouse-api.example.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WAREHOUSE_API_KEY}`
      },
      body: JSON.stringify({
        order_id: order.id,
        order_number: order.display_id,
        customer_email: order.email,
        items: order.items.map(item => ({
          sku: item.variant?.sku,
          quantity: item.quantity,
          product_name: item.title
        })),
        shipping_address: {
          name: `${order.shipping_address.first_name} ${order.shipping_address.last_name}`,
          address: order.shipping_address.address_1,
          city: order.shipping_address.city,
          phone: order.shipping_address.phone
        }
      })
    })
    
    console.log('Order sent to warehouse:', order.id)
  } catch (error) {
    console.error('Failed to send order to warehouse:', error)
    // Consider implementing retry logic or alerting
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
```

**Example: Send SMS notification**

```typescript
// src/subscribers/send-order-sms.ts
import { SubscriberArgs, SubscriberConfig } from '@medusajs/medusa'
import { IOrderModuleService } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'

export default async function sendOrderSMS({
  event: { data },
  container,
}: SubscriberArgs<any>) {
  const orderModuleService: IOrderModuleService = container.resolve(Modules.ORDER)
  
  const order = await orderModuleService.retrieveOrder(data.id, {
    relations: ['shipping_address']
  })
  
  const phone = order.shipping_address?.phone || order.metadata?.delivery_phone
  
  if (!phone) {
    console.log('No phone number found for order:', order.id)
    return
  }
  
  try {
    // Send SMS using your SMS provider
    await fetch('https://sms-api.example.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SMS_API_KEY}`
      },
      body: JSON.stringify({
        to: phone,
        message: `Your order #${order.display_id} has been placed successfully! Total: GHS ${(order.total / 100).toFixed(2)}`
      })
    })
    
    console.log('SMS sent for order:', order.id)
  } catch (error) {
    console.error('Failed to send SMS:', error)
  }
}

export const config: SubscriberConfig = {
  event: 'order.placed'
}
```

---

## Best Practices

### 1. Always Handle Authentication
```typescript
// ✅ Good: Handle authentication errors gracefully
async function fetchOrders() {
  try {
    const response = await fetch('/store/orders', {
      credentials: 'include'
    });
    
    if (response.status === 401) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    // Show error message to user
  }
}

// ❌ Bad: Don't assume authentication will always work
async function fetchOrders() {
  const response = await fetch('/store/orders');
  return await response.json(); // Will fail if not authenticated
}
```

### 2. Use Pagination for Better Performance
```typescript
// ✅ Good: Load orders in batches
function OrderList() {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  // Load only what you need
  const { orders } = useOrders({ limit: pageSize, offset: page * pageSize });
  
  return (/* ... */);
}

// ❌ Bad: Don't try to load all orders at once
function OrderList() {
  const { orders } = useOrders({ limit: 999999 });
  return (/* ... */);
}
```

### 3. Display Formatted Prices
```typescript
// ✅ Good: Format prices properly
function formatPrice(amount: number, currencyCode: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount / 100); // Convert from smallest unit
}

// Display: "GHS 50.00" instead of "5000"
<p>Total: {formatPrice(order.total, order.currency_code)}</p>

// ❌ Bad: Show raw amounts
<p>Total: {order.total}</p> // Shows "5000" instead of "GHS 50.00"
```

### 4. Update Payment Status After Payment
```typescript
// ✅ Good: Update payment status immediately after successful payment
async function handlePaystackSuccess(reference: string, orderId: string) {
  try {
    // Update payment status
    await OrderService.updatePaymentStatus(orderId, {
      payment_reference: reference
    });
    
    // Redirect to success page
    window.location.href = `/order-confirmation/${orderId}`;
  } catch (error) {
    console.error('Payment update failed:', error);
    // Still show success but inform user to contact support
  }
}

// ❌ Bad: Forget to update payment status
async function handlePaystackSuccess(reference: string, orderId: string) {
  window.location.href = `/order-confirmation/${orderId}`;
  // Order will still show as unpaid!
}
```

### 5. Cache Orders When Appropriate
```typescript
// ✅ Good: Cache orders list for better UX
import { useQuery } from '@tanstack/react-query';

function useOrders(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => OrderService.getOrders(params),
    staleTime: 60000, // Cache for 1 minute
  });
}

// ❌ Bad: Fetch every time component renders
function OrderList() {
  const [orders, setOrders] = useState([]);
  
  useEffect(() => {
    fetchOrders(); // Fetches on every render
  });
  
  return (/* ... */);
}
```

### 6. Show Loading and Error States
```typescript
// ✅ Good: Provide feedback to users
function OrderList() {
  const { orders, loading, error } = useOrders();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorMessage message={error.message} />;
  }
  
  if (orders.length === 0) {
    return <EmptyState message="No orders yet" />;
  }
  
  return <div>{/* Render orders */}</div>;
}

// ❌ Bad: Leave users wondering what's happening
function OrderList() {
  const { orders } = useOrders();
  return <div>{orders.map(/* ... */)}</div>;
  // Shows nothing while loading, no error handling
}
```

### 7. Verify Order Ownership on Backend
The backend automatically verifies order ownership, but never skip authentication:

```typescript
// ✅ Backend handles security (already implemented)
// Orders endpoint checks:
// 1. User is authenticated
// 2. Order belongs to authenticated user
// 3. Returns 403 if unauthorized

// ❌ Don't rely only on frontend checks
// Backend MUST always verify ownership
```

## Security Considerations

### 1. Never Expose Sensitive Payment Data
```typescript
// ✅ Good: Use payment references
{
  payment_reference: "abc123xyz",
  payment_last4: "1234", // Only last 4 digits
  payment_card_type: "visa"
}

// ❌ Bad: Never store or display full card numbers
{
  card_number: "4111111111111111", // NEVER DO THIS
  cvv: "123" // NEVER DO THIS
}
```

### 2. Always Use HTTPS in Production
```typescript
// ✅ Good: Use secure connections
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.yourdomain.com'
  : 'http://localhost:9000';

// ❌ Bad: HTTP in production
const API_URL = 'http://api.yourdomain.com'; // Insecure!
```

### 3. Validate Payment Status with Provider
```typescript
// ✅ Good: Backend verifies with Paystack
POST /store/orders/:id/update-payment-status
{
  "payment_reference": "xyz123" // Backend calls Paystack API to verify
}

// ❌ Bad: Trust client-provided payment status without verification
{
  "payment_status": "success" // Anyone could send this!
}
```

### 4. Set Proper CORS Configuration
```javascript
// medusa-config.js
module.exports = {
  projectConfig: {
    http: {
      cors: process.env.STORE_CORS || "http://localhost:3000",
      // In production, set to your actual domain
    }
  }
}
```

### 5. Use Environment Variables for Secrets
```bash
# .env
PAYSTACK_SECRET_KEY=sk_live_your_secret_key
DATABASE_URL=postgres://...

# ✅ Never commit secrets to git
# Add .env to .gitignore
```

### 6. Implement Rate Limiting (Production)
```typescript
// Consider adding rate limiting middleware
// To prevent abuse of order endpoints
import rateLimit from 'express-rate-limit';

const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

app.use('/store/orders', orderLimiter);
```

### 7. Log Security Events
```typescript
// Log important events for security auditing
export default async function orderPlacedHandler({ event, container }) {
  const order = await orderService.retrieve(event.data.id);
  
  console.log('Order placed:', {
    order_id: order.id,
    customer_email: order.email,
    amount: order.total,
    timestamp: new Date().toISOString(),
    ip: event.context?.ip // If available
  });
}
```

---

## Performance Tips

### 1. Use Field Selection (Backend)
The query service already selects only needed fields. If you modify endpoints, keep this pattern:

```typescript
// ✅ Good: Select only needed fields
await query.graph({
  entity: "order",
  fields: ["id", "status", "total", "created_at"],
  filters: { customer_id }
});

// ❌ Bad: Fetch everything
await query.graph({
  entity: "order",
  fields: ["*"],
  filters: { customer_id }
});
```

### 2. Implement Virtual Scrolling for Large Lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualOrderList({ orders }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: orders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index}>
            <OrderCard order={orders[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Use Optimistic Updates
```typescript
// Update UI immediately, then sync with server
async function updatePaymentStatus(orderId: string, data: any) {
  // Optimistically update local state
  setOrder(prev => ({
    ...prev,
    payment_status: 'captured'
  }));
  
  try {
    // Sync with server
    const result = await OrderService.updatePaymentStatus(orderId, data);
    setOrder(result.order);
  } catch (error) {
    // Revert on error
    setOrder(prev => ({
      ...prev,
      payment_status: 'not_paid'
    }));
  }
}
```

---

## Notes

- All monetary values are returned in the smallest unit of the currency (e.g., cents for USD, pesewas for GHS)
- Dates are returned in ISO 8601 format (UTC timezone)
- The session cookie (`connect.sid`) must be included in all requests for authentication
- Orders can only be viewed by the customer who placed them (ownership verification is enforced)
- The endpoints automatically fetch related data like products, variants, addresses, and fulfillments
- Payment status is determined from both `payment_collections` and order `metadata`
- For Paystack payments, use the `update-payment-status` endpoint after payment completion
- Orders are immutable after creation - use the update payment status endpoint to track payment changes
- All endpoints return standardized error responses with appropriate HTTP status codes
- Consider implementing request retry logic for better reliability in production

