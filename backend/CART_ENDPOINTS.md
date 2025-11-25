# Cart Endpoints Documentation

This document describes all available cart endpoints for managing shopping carts in the Kente & Bobs backend.

## Overview

The cart endpoints allow customers (both authenticated and guest users) to:
- Create and retrieve carts
- Add items to carts
- Update item quantities
- Remove items from carts
- Complete checkout (requires authentication)

All endpoints support both authenticated and guest users, except for the cart completion endpoint which requires authentication.

---

## Base URL

All cart endpoints are prefixed with `/store/cart`

---

## Endpoints

### 1. Get or Create Cart

**Endpoint:** `GET /store/cart`

**Description:** Retrieves an existing cart or creates a new one if none exists. The cart ID is stored in the session for guest users.

**Authentication:** Optional (works for both authenticated and guest users)

**Query Parameters:**
- `cart_id` (optional): Specific cart ID to retrieve. If not provided, uses cart from session.

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
    "tax_total": 0,
    "shipping_total": 0,
    "discount_total": 0,
    "total": 10000,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to fetch/create cart

---

### 2. Create Cart

**Endpoint:** `POST /store/cart`

**Description:** Explicitly creates a new cart. The backend automatically assigns a valid region if you omit `region_id`, but you can also provide one explicitly.

**Authentication:** Optional (works for both authenticated and guest users)

**Request Body (optional):**
```json
{
  "currency_code": "ghs",
  "region_id": "reg_01HZREG789"
}
```

**Fields:**
- `currency_code` (optional, default: "ghs"): Currency code for the cart.
- `region_id` (optional but recommended): Region ID for the cart.  
  If omitted, the backend resolves one automatically based on `currency_code` (or falls back to the first available region). This ensures the cart always has a valid region for pricing.

**Response:** `201 Created`

```json
{
  "cart": {
    "id": "cart_01HZXYZ123",
    "customer_id": "cus_01HZABC456",
    "email": null,
    "currency_code": "ghs",
    "region_id": "reg_01HZREG789",
    "items": [],
    "subtotal": 0,
    "tax_total": 0,
    "shipping_total": 0,
    "discount_total": 0,
    "total": 0,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**
- `500 Internal Server Error`: Failed to create cart

---

### 3. Update Cart

**Endpoint:** `PATCH /store/cart`

**Description:** Updates cart properties such as region, currency, email, and addresses. This is useful for updating cart settings without recreating the cart.

**Authentication:** Optional (works for both authenticated and guest users)

**Request Body:**
```json
{
  "currency_code": "usd",
  "region_id": "reg_01HZREG789",
  "email": "customer@example.com",
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
  "cart_id": "cart_01HZXYZ123"
}
```

**Fields:**
- `currency_code` (optional): Currency code for the cart
- `region_id` (optional): Region ID for the cart
- `email` (optional): Customer email for guest checkout
- `shipping_address` (optional): Shipping address object
- `billing_address` (optional): Billing address object
- `cart_id` (optional): Cart ID. Can also be provided via query param or session.

**Response:** `200 OK`

```json
{
  "message": "Cart updated successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "currency_code": "usd",
    "region_id": "reg_01HZREG789",
    "email": "customer@example.com",
    "items": [...],
    "subtotal": 10000,
    "total": 10000,
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing cart_id
- `404 Not Found`: Cart not found
- `500 Internal Server Error`: Failed to update cart

---

### 4. Delete Cart

**Endpoint:** `DELETE /store/cart`

**Description:** Deletes a cart and clears it from the session.

**Authentication:** Optional (works for both authenticated and guest users)

**Query Parameters:**
- `cart_id` (optional): Cart ID to delete. If not provided, uses cart from session.

**Response:** `200 OK`

```json
{
  "message": "Cart deleted successfully"
}
```

**Error Responses:**
- `404 Not Found`: Cart not found
- `500 Internal Server Error`: Failed to delete cart

---

### 4.5. Reset Cart

**Endpoint:** `POST /store/cart/reset`

**Description:** Deletes the current cart and creates a fresh new one. Useful when the cart is in a corrupted state or experiencing issues.

**Authentication:** Optional (works for both authenticated and guest users)

**Request Body (optional):**
```json
{
  "region_id": "reg_01HZREG789",
  "currency_code": "ghs"
}
```

**Fields:**
- `region_id` (optional): Region ID for the new cart. If not provided, auto-resolves based on currency.
- `currency_code` (optional, default: "ghs"): Currency code for the new cart.

**Response:** `201 Created`

```json
{
  "message": "Cart reset successfully",
  "cart": {
    "id": "cart_01HZNEWCART456",
    "customer_id": "cus_01HZABC456",
    "email": "customer@example.com",
    "currency_code": "ghs",
    "region_id": "reg_01HZREG789",
    "items": [],
    "subtotal": 0,
    "total": 0,
    ...
  },
  "previous_cart_id": "cart_01HZOLDCART123"
}
```

**Use Cases:**
- Cart experiencing MikroORM errors
- "Items do not have a price" errors that persist
- Cart in corrupted or invalid state
- Need to change region without migrating items

**Error Responses:**
- `400 Bad Request`: Invalid region_id
- `500 Internal Server Error`: Failed to reset cart

---

### 5. Add Item to Cart

**Endpoint:** `POST /store/cart/items`

**Description:** Adds a new item to the cart. If the item already exists, increases its quantity.

**Authentication:** Optional (works for both authenticated and guest users)

**Request Body:**
```json
{
  "variant_id": "variant_01HZVARIANT456",
  "quantity": 2,
  "cart_id": "cart_01HZXYZ123"
}
```
an endpoint to pick all variants under a product id
**Fields:**
- `variant_id` (required): The product variant ID to add to cart
- `quantity` (optional, default: 1): Quantity to add
- `cart_id` (optional): Cart ID. Can also be provided via query param or session.

**Response:** `201 Created` (new item) or `200 OK` (quantity updated)

```json
{
  "message": "Item added to cart successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [...],
    "subtotal": 10000,
    "total": 10000,
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields, invalid quantity, or pricing error (variant price not available for cart's region)
- `404 Not Found`: Cart not found
- `500 Internal Server Error`: Failed to add item

**Common Issues:**
- **"Items do not have a price"**: The variant's price doesn't match the cart's region. Solution: Update cart region with `PATCH /store/cart` or use `POST /store/cart/reset`.
- **MikroORM errors**: Cart may be corrupted. Solution: Use `POST /store/cart/reset` to create a fresh cart.

**See Also:** `CART_TROUBLESHOOTING.md` for detailed solutions.

---

### 6. Update Cart Item

**Endpoint:** `PATCH /store/cart/items/:id`

**Description:** Updates the quantity of a specific item in the cart.

**Authentication:** Optional (works for both authenticated and guest users)

**Path Parameters:**
- `id` (required): The cart line item ID

**Request Body:**
```json
{
  "quantity": 5,
  "cart_id": "cart_01HZXYZ123"
}
```

**Fields:**
- `quantity` (required): New quantity for the item (must be > 0)
- `cart_id` (optional): Cart ID. Can also be provided via query param or session.

**Response:** `200 OK`

```json
{
  "message": "Cart item updated successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [...],
    "subtotal": 25000,
    "total": 25000,
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid quantity
- `404 Not Found`: Cart or item not found
- `500 Internal Server Error`: Failed to update item

---

### 7. Remove Item from Cart

**Endpoint:** `DELETE /store/cart/items/:id`

**Description:** Removes a specific item from the cart.

**Authentication:** Optional (works for both authenticated and guest users)

**Path Parameters:**
- `id` (required): The cart line item ID

**Request Body:**
```json
{
  "cart_id": "cart_01HZXYZ123"
}
```

**Fields:**
- `cart_id` (optional): Cart ID. Can also be provided via query param or session.

**Response:** `200 OK`

```json
{
  "message": "Item removed from cart successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [...],
    "subtotal": 0,
    "total": 0,
    ...
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing cart_id
- `404 Not Found`: Cart or item not found
- `500 Internal Server Error`: Failed to remove item

---

### 8. Complete Cart (Checkout)

**Endpoint:** `POST /store/cart/complete`

**Description:** Completes the cart checkout process. This endpoint requires authentication and converts the cart into an order.

**Authentication:** Required

**Request Body:**
```json
{
  "cart_id": "cart_01HZXYZ123",
  "shipping_address": {
    "first_name": "John",
    "last_name": "Doe",
    "address_1": "123 Main St",
    "address_2": "Apt 4",
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
    "address_2": "Apt 4",
    "city": "Accra",
    "province": "Greater Accra",
    "postal_code": "GA001",
    "country_code": "GH",
    "phone": "+233241234567"
  },
  "shipping_method_id": "sm_01HZSHIP123",
  "payment_provider_id": "stripe"
}
```

**Fields:**
- `cart_id` (optional): Cart ID. Can also be provided via query param or session.
- `shipping_address` (optional): Shipping address object
- `billing_address` (optional): Billing address object
- `shipping_method_id` (optional): Selected shipping method ID
- `payment_provider_id` (optional, default: "stripe"): Payment provider ID

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
        "quantity": 2,
        "unit_price": 5000,
        "total": 10000,
        "product_id": "prod_01HZPROD123",
        "variant_id": "variant_01HZVARIANT456"
      }
    ],
    "shipping_address": {...},
    "billing_address": {...},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Note:** This endpoint creates an actual order from the cart. The cart is automatically deleted after successful order creation.

**Error Responses:**
- `400 Bad Request`: Missing cart_id or cart is empty
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: Cart not found or customer not found
- `500 Internal Server Error`: Failed to complete cart

---

## Cart ID Handling

The cart ID can be provided in three ways (in order of priority):
1. Request body (`cart_id` field)
2. Query parameter (`?cart_id=...`)
3. Session (`req.session.cart_id`)

For guest users, the cart ID is automatically stored in the session when a cart is created or retrieved.

For authenticated users, the cart is automatically associated with their customer record.

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

---

## Examples

### Example: Complete Cart Workflow

1. **Create a cart:**
```bash
POST /store/cart
```

2. **Add items:**
```bash
POST /store/cart/items
{
  "variant_id": "variant_01HZVARIANT456",
  "quantity": 2
}
```

3. **Update item quantity:**
```bash
PATCH /store/cart/items/li_01HZITEM001
{
  "quantity": 3
}
```

4. **Complete checkout:**
```bash
POST /store/cart/complete
{
  "shipping_address": {...},
  "billing_address": {...}
}
```

---

## Notes

- Guest users can create and manage carts without authentication
- Cart completion (checkout) requires authentication
- Cart IDs are stored in the session for guest users
- Authenticated users' carts are automatically associated with their customer record
- All prices are returned in the cart's currency code
- Product and variant details are included in cart responses for convenience

