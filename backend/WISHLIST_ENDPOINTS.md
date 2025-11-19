# Wishlist/Favorites Feature

This document describes the wishlist (favorites) feature that allows customers to save products for later viewing.

## Overview

The wishlist feature allows authenticated customers to:
- Add products to their wishlist
- View all products in their wishlist
- Remove products from their wishlist
- See if a product is already in their wishlist when browsing

## API Endpoints

### 1. Get Customer's Wishlist

**Endpoint:** `GET /store/wishlist`

**Authentication:** Required (customer must be logged in)

**Description:** Retrieves all products in the customer's wishlist with full product details.

**Response:**
```json
{
  "wishlist": [
    {
      "id": "wishlist_item_id",
      "product_id": "prod_123",
      "variant_id": "variant_456",
      "added_at": "2024-01-15T10:30:00Z",
      "product": {
        "id": "prod_123",
        "name": "Product Name",
        "handle": "product-name",
        "description": "Product description",
        "subtitle": "Product subtitle",
        "thumbnail": "https://...",
        "images": [...],
        "price": {
          "min": 1000,
          "max": 2000,
          "currency": "ghs"
        },
        "quantity": 50,
        "in_stock": true
      },
      "variant": {
        "id": "variant_456",
        "title": "Variant Name",
        "sku": "SKU123",
        "price": 1500,
        "currency": "ghs",
        "inventory_quantity": 20
      }
    }
  ],
  "count": 1
}
```

**Status Codes:**
- `200 OK` - Wishlist retrieved successfully
- `401 Unauthorized` - Customer not authenticated

---

### 2. Add Product to Wishlist

**Endpoint:** `POST /store/wishlist`

**Authentication:** Required (customer must be logged in)

**Description:** Adds a product to the customer's wishlist.

**Request Body:**
```json
{
  "product_id": "prod_123",
  "variant_id": "variant_456" // Optional - for specific variant
}
```

**Response:**
```json
{
  "message": "Product added to wishlist",
  "wishlist_item": {
    "id": "wishlist_item_id",
    "customer_id": "cus_123",
    "product_id": "prod_123",
    "variant_id": "variant_456",
    "added_at": "2024-01-15T10:30:00Z"
  }
}
```

**Status Codes:**
- `201 Created` - Product added to wishlist
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Customer not authenticated
- `409 Conflict` - Product already in wishlist

---

### 3. Remove Product from Wishlist

**Endpoint:** `DELETE /store/wishlist/:id`

**Authentication:** Required (customer must be logged in)

**Description:** Removes a product from the customer's wishlist.

**Path Parameters:**
- `id` - The wishlist item ID (not the product ID)

**Response:**
```json
{
  "message": "Product removed from wishlist",
  "id": "wishlist_item_id"
}
```

**Status Codes:**
- `200 OK` - Product removed from wishlist
- `400 Bad Request` - Missing wishlist item ID
- `401 Unauthorized` - Customer not authenticated
- `403 Forbidden` - Wishlist item belongs to another customer
- `404 Not Found` - Wishlist item not found

---

### 4. Get Single Wishlist Item

**Endpoint:** `GET /store/wishlist/:id`

**Authentication:** Required (customer must be logged in)

**Description:** Retrieves a single wishlist item with product details.

**Path Parameters:**
- `id` - The wishlist item ID

**Response:**
```json
{
  "wishlist_item": {
    "id": "wishlist_item_id",
    "product_id": "prod_123",
    "variant_id": "variant_456",
    "added_at": "2024-01-15T10:30:00Z",
    "product": {
      "id": "prod_123",
      "name": "Product Name",
      "handle": "product-name",
      "thumbnail": "https://..."
    }
  }
}
```

**Status Codes:**
- `200 OK` - Wishlist item retrieved
- `400 Bad Request` - Missing wishlist item ID
- `401 Unauthorized` - Customer not authenticated
- `403 Forbidden` - Wishlist item belongs to another customer
- `404 Not Found` - Wishlist item not found

---

## Product Endpoints Enhancement

The wishlist feature also enhances existing product endpoints with wishlist information:

### GET /store/products

All products now include an `is_in_wishlist` boolean field indicating if the product is in the authenticated customer's wishlist.

**Example Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": "Product Name",
      "is_in_wishlist": true,
      // ... other product fields
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 50
}
```

### GET /store/products/:id

Single product endpoint also includes the `is_in_wishlist` field.

**Example Response:**
```json
{
  "product": {
    "id": "prod_123",
    "name": "Product Name",
    "is_in_wishlist": true,
    // ... other product fields
  }
}
```

**Note:** `is_in_wishlist` will be `false` for unauthenticated users.

---

## Usage Examples

### Frontend Integration Example

```javascript
// Add product to wishlist
async function addToWishlist(productId, variantId = null) {
  const response = await fetch('/store/wishlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({
      product_id: productId,
      variant_id: variantId
    })
  });
  
  if (response.status === 409) {
    console.log('Product already in wishlist');
  } else if (response.ok) {
    console.log('Product added to wishlist');
  }
}

// Get wishlist
async function getWishlist() {
  const response = await fetch('/store/wishlist', {
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });
  
  const data = await response.json();
  return data.wishlist;
}

// Remove from wishlist
async function removeFromWishlist(wishlistItemId) {
  const response = await fetch(`/store/wishlist/${wishlistItemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  });
  
  if (response.ok) {
    console.log('Product removed from wishlist');
  }
}

// Check if product is in wishlist (from products list)
function isProductInWishlist(product) {
  return product.is_in_wishlist;
}
```

---

## Database Schema

The wishlist feature uses a custom module with the following schema:

```typescript
{
  id: string (primary key)
  customer_id: string (indexed)
  product_id: string (indexed)
  variant_id: string (nullable, indexed)
  added_at: DateTime
}
```

**Indexes:**
- `customer_id` - For quickly fetching a customer's wishlist
- `product_id` - For checking if a product is in any wishlist
- `variant_id` - For variant-specific wishlist items
- Unique constraint on `(customer_id, product_id, variant_id)` to prevent duplicates

---

## Features

### 1. Authentication Required
All wishlist endpoints require customer authentication. Unauthenticated requests will receive a `401 Unauthorized` response.

### 2. Variant Support
Customers can add specific product variants to their wishlist by providing a `variant_id`. This is useful for products with multiple variants (colors, sizes, etc.).

### 3. Duplicate Prevention
The system automatically prevents duplicate entries. If a customer tries to add a product that's already in their wishlist, they'll receive a `409 Conflict` response.

### 4. Product Availability
Wishlist items include real-time inventory information, showing whether products are in stock.

### 5. Product Discovery
The wishlist feature is integrated into product listing and detail pages, making it easy for customers to see which products they've already favorited.

---

## Error Handling

All endpoints include comprehensive error handling:

- **400 Bad Request** - Missing required fields or invalid data
- **401 Unauthorized** - Authentication required
- **403 Forbidden** - Attempting to access another customer's wishlist
- **404 Not Found** - Resource not found
- **409 Conflict** - Duplicate wishlist entry
- **500 Internal Server Error** - Server-side errors (logged for debugging)

---

## Module Structure

The wishlist feature is implemented as a custom Medusa module:

```
src/modules/wishlist/
├── models/
│   └── wishlist.ts       # Data model definition
├── service.ts            # Service class for business logic
├── index.ts              # Module registration
└── README.md             # Module documentation
```

API Routes:
```
src/api/store/wishlist/
├── route.ts              # GET /wishlist and POST /wishlist
└── [id]/
    └── route.ts          # GET /wishlist/:id and DELETE /wishlist/:id
```

---

## Configuration

The wishlist module is registered in `medusa-config.js`:

```javascript
modules: [
  {
    resolve: './src/modules/wishlist',
    key: 'wishlistModuleService',
  },
  // ... other modules
]
```

---

## Best Practices

1. **UI Integration**: Show a heart icon or "favorite" button on product cards that toggles the wishlist state
2. **Loading States**: Implement loading states when adding/removing items
3. **Optimistic Updates**: Update the UI optimistically before the API call completes for better UX
4. **Empty States**: Show a helpful message when the wishlist is empty
5. **Stock Notifications**: Consider adding notifications when wishlisted items come back in stock
6. **Analytics**: Track wishlist additions to understand customer preferences

---

## Future Enhancements

Potential features to add:
- Wishlist sharing (public/private wishlists)
- Move wishlist items to cart in bulk
- Price drop notifications for wishlisted items
- Wishlist analytics dashboard
- Guest wishlist (stored in localStorage, converted on login)

