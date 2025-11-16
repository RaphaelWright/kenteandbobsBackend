# Product Endpoints Documentation

## Overview
This document describes the product and review endpoints available in the API. All endpoints support products with the following features:
- **Images**: Product images and thumbnails
- **Name**: Product title
- **Price**: Price range from variants
- **Description**: Product description and subtitle
- **Category**: Product categories
- **Quantity**: Total inventory quantity
- **Reviews**: Customer reviews with ratings

---

## Product Endpoints

### 1. Get All Products

**Endpoint:** `GET pricong fix`

**Description:** Fetch all published products with their details, reviews, and inventory.

**Query Parameters:**
- `limit` (optional, default: 50): Number of products to return
- `offset` (optional, default: 0): Number of products to skip
- `category_id` (optional): Filter by category ID
- `search` (optional): Search products by title
- `order` (optional, default: "created_at"): Sort order

**Response:**
```json
{
  "products": [
    {
      "id": "prod_123",
      "name": "Product Name",
      "handle": "product-name",
      "description": "Product description",
      "subtitle": "Product subtitle",
      "thumbnail": "https://example.com/image.jpg",
      "status": "published",
      "images": [
        {
          "id": "img_123",
          "url": "https://example.com/image.jpg"
        }
      ],
      "price": {
        "min": 1000,
        "max": 2000,
        "currency": "usd"
      },
      "categories": [
        {
          "id": "cat_123",
          "name": "Category Name",
          "handle": "category-name"
        }
      ],
      "tags": [
        {
          "id": "tag_123",
          "value": "tag-value"
        }
      ],
      "quantity": 100,
      "variants": [
        {
          "id": "variant_123",
          "title": "Variant Title",
          "sku": "SKU-123",
          "price": 1000,
          "currency": "usd",
          "inventory_quantity": 50
        }
      ],
      "reviews": {
        "total": 10,
        "average_rating": 4.5,
        "recent": [
          {
            "id": "review_123",
            "customer_name": "John Doe",
            "rating": 5,
            "title": "Great product!",
            "comment": "I love this product",
            "verified_purchase": true,
            "helpful_count": 5,
            "created_at": "2024-01-01T00:00:00Z"
          }
        ]
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "offset": 0,
  "limit": 50
}
```

---

### 2. Get Product by ID

**Endpoint:** `GET /store/products/:id`

**Description:** Fetch a single product with all details and reviews.

**Parameters:**
- `id` (required): Product ID

**Response:**
```json
{
  "product": {
    "id": "prod_123",
    "name": "Product Name",
    "handle": "product-name",
    "description": "Product description",
    "subtitle": "Product subtitle",
    "thumbnail": "https://example.com/image.jpg",
    "status": "published",
    "images": [
      {
        "id": "img_123",
        "url": "https://example.com/image.jpg"
      }
    ],
    "price": {
      "min": 1000,
      "max": 2000,
      "currency": "usd"
    },
    "categories": [
      {
        "id": "cat_123",
        "name": "Category Name",
        "handle": "category-name",
        "description": "Category description"
      }
    ],
    "tags": [
      {
        "id": "tag_123",
        "value": "tag-value"
      }
    ],
    "options": [
      {
        "id": "opt_123",
        "title": "Size",
        "values": ["S", "M", "L"]
      }
    ],
    "quantity": 100,
    "variants": [
      {
        "id": "variant_123",
        "title": "Variant Title",
        "sku": "SKU-123",
        "barcode": "123456",
        "price": 1000,
        "currency": "usd",
        "inventory_quantity": 50,
        "options": {
          "Size": "M"
        }
      }
    ],
    "reviews": {
      "total": 10,
      "average_rating": 4.5,
      "rating_distribution": {
        "5": 6,
        "4": 3,
        "3": 1,
        "2": 0,
        "1": 0
      },
      "items": [
        {
          "id": "review_123",
          "customer_name": "John Doe",
          "rating": 5,
          "title": "Great product!",
          "comment": "I love this product",
          "verified_purchase": true,
          "helpful_count": 5,
          "created_at": "2024-01-01T00:00:00Z"
        }
      ]
    },
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

---

## Review Endpoints

### 3. Get Product Reviews

**Endpoint:** `GET /store/products/:id/reviews`

**Description:** Fetch all approved reviews for a specific product.

**Parameters:**
- `id` (required): Product ID

**Query Parameters:**
- `limit` (optional, default: 20): Number of reviews to return
- `offset` (optional, default: 0): Number of reviews to skip
- `sort` (optional, default: "created_at:desc"): Sort order

**Response:**
```json
{
  "reviews": [
    {
      "id": "review_123",
      "product_id": "prod_123",
      "customer_id": "cust_123",
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "rating": 5,
      "title": "Great product!",
      "comment": "I love this product",
      "verified_purchase": true,
      "status": "approved",
      "helpful_count": 5,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 10,
  "average_rating": 4.5,
  "rating_distribution": {
    "5": 6,
    "4": 3,
    "3": 1,
    "2": 0,
    "1": 0
  },
  "offset": 0,
  "limit": 20
}
```

---

### 4. Create Product Review

**Endpoint:** `POST /store/products/:id/reviews`

**Description:** Submit a new review for a product. Reviews are pending approval by default.

**Parameters:**
- `id` (required): Product ID

**Request Body:**
```json
{
  "rating": 5,
  "title": "Great product!",
  "comment": "I love this product",
  "customer_name": "John Doe",
  "customer_email": "john@example.com"
}
```

**Required Fields:**
- `rating` (number, 1-5): Product rating
- `comment` (string): Review comment
- `customer_name` (string): Reviewer name

**Optional Fields:**
- `title` (string): Review title
- `customer_email` (string): Reviewer email

**Response:**
```json
{
  "review": {
    "id": "review_123",
    "product_id": "prod_123",
    "customer_name": "John Doe",
    "rating": 5,
    "title": "Great product!",
    "comment": "I love this product",
    "status": "pending",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Review submitted successfully. It will be visible after approval."
}
```

---

### 5. Mark Review as Helpful

**Endpoint:** `POST /store/reviews/:id/helpful`

**Description:** Increment the helpful count for a review.

**Parameters:**
- `id` (required): Review ID

**Response:**
```json
{
  "review": {
    "id": "review_123",
    "helpful_count": 6
  },
  "message": "Review marked as helpful"
}
```

---

## Examples

### Fetch all products
```bash
curl http://localhost:9000/store/products
```

### Fetch products by category
```bash
curl "http://localhost:9000/store/products?category_id=cat_123"
```

### Search products
```bash
curl "http://localhost:9000/store/products?search=shirt"
```

### Fetch single product
```bash
curl http://localhost:9000/store/products/prod_123
```

### Submit a review
```bash
curl -X POST http://localhost:9000/store/products/prod_123/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Great product!",
    "comment": "I love this product",
    "customer_name": "John Doe"
  }'
```

### Mark review as helpful
```bash
curl -X POST http://localhost:9000/store/reviews/review_123/helpful
```

---

## Notes

1. **Authentication**: Reviews submitted by authenticated customers are marked as "verified purchase"
2. **Review Approval**: All reviews are pending approval by default. Only approved reviews are shown.
3. **Inventory**: Quantity is calculated from all variants' inventory items
4. **Pricing**: Prices are shown in the smallest currency unit (e.g., cents for USD)
5. **Categories**: Products can belong to multiple categories
6. **Images**: Multiple images can be associated with each product

---

## Admin Endpoints (Coming Soon)

For managing product reviews from the admin panel:
- `GET /admin/reviews` - List all reviews
- `PUT /admin/reviews/:id/approve` - Approve a review
- `PUT /admin/reviews/:id/reject` - Reject a review
- `DELETE /admin/reviews/:id` - Delete a review

