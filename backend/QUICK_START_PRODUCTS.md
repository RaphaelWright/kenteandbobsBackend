# Quick Start Guide: Product & Review Endpoints

## 🚀 Getting Started

Your backend now has comprehensive product endpoints with support for:
- Images
- Product names and descriptions
- Pricing (with variant support)
- Categories
- Inventory quantities
- Customer reviews

## 📦 Setup

### 1. Build and Start the Server

```bash
cd backend
pnpm build
pnpm dev
```

### 2. Database Migration

The review module will automatically create its database table on first run. No manual migrations needed!

## 🛍️ Using the Product Endpoints

### Fetch All Products

```bash
curl http://localhost:9000/store/products
```

**With filters:**
```bash
# Search for products
curl "http://localhost:9000/store/products?search=shirt"

# Filter by category
curl "http://localhost:9000/store/products?category_id=pcat_123"

# Pagination
curl "http://localhost:9000/store/products?limit=10&offset=0"
```

### Fetch Single Product

```bash
curl http://localhost:9000/store/products/prod_123
```

This returns:
- ✅ All product images
- ✅ Product name, description, subtitle
- ✅ Price range from all variants
- ✅ Categories and tags
- ✅ Total inventory quantity
- ✅ All reviews with ratings
- ✅ Product variants with options

## ⭐ Using the Review Endpoints

### Get Product Reviews

```bash
curl http://localhost:9000/store/products/prod_123/reviews
```

Returns:
- All approved reviews
- Average rating
- Rating distribution (5-star, 4-star, etc.)

### Submit a Review

```bash
curl -X POST http://localhost:9000/store/products/prod_123/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "title": "Excellent product!",
    "comment": "This product exceeded my expectations. Highly recommend!",
    "customer_name": "Jane Smith",
    "customer_email": "jane@example.com"
  }'
```

**Required fields:**
- `rating` (1-5)
- `comment`
- `customer_name`

**Optional fields:**
- `title`
- `customer_email`

### Mark Review as Helpful

```bash
curl -X POST http://localhost:9000/store/reviews/review_123/helpful
```

## 🔐 Admin Review Management

### List All Reviews

```bash
curl http://localhost:9000/admin/reviews
```

**Filter by status:**
```bash
# Pending reviews
curl "http://localhost:9000/admin/reviews?status=pending"

# Approved reviews
curl "http://localhost:9000/admin/reviews?status=approved"

# For specific product
curl "http://localhost:9000/admin/reviews?product_id=prod_123"
```

### Approve a Review

```bash
curl -X POST http://localhost:9000/admin/reviews/review_123/approve
```

### Reject a Review

```bash
curl -X POST http://localhost:9000/admin/reviews/review_123/reject
```

### Update a Review

```bash
curl -X PUT http://localhost:9000/admin/reviews/review_123 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "rating": 4
  }'
```

### Delete a Review

```bash
curl -X DELETE http://localhost:9000/admin/reviews/review_123
```

## 📊 Response Examples

### Product Response

```json
{
  "product": {
    "id": "prod_123",
    "name": "Premium T-Shirt",
    "description": "High quality cotton t-shirt",
    "images": [
      { "id": "img_1", "url": "https://..." }
    ],
    "price": {
      "min": 2999,
      "max": 3999,
      "currency": "usd"
    },
    "categories": [
      { "id": "cat_1", "name": "Clothing" }
    ],
    "quantity": 150,
    "variants": [
      {
        "id": "var_1",
        "title": "Small",
        "sku": "TSHIRT-SM",
        "price": 2999,
        "inventory_quantity": 50
      }
    ],
    "reviews": {
      "total": 25,
      "average_rating": 4.6,
      "rating_distribution": {
        "5": 18,
        "4": 5,
        "3": 2,
        "2": 0,
        "1": 0
      },
      "items": [...]
    }
  }
}
```

### Review Response

```json
{
  "reviews": [
    {
      "id": "review_123",
      "product_id": "prod_123",
      "customer_name": "John Doe",
      "rating": 5,
      "title": "Love it!",
      "comment": "Great quality and fast shipping",
      "verified_purchase": true,
      "helpful_count": 8,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 25,
  "average_rating": 4.6,
  "rating_distribution": {
    "5": 18,
    "4": 5,
    "3": 2,
    "2": 0,
    "1": 0
  }
}
```

## 💡 Tips

1. **Verified Purchases**: Reviews from authenticated customers are automatically marked as verified
2. **Review Moderation**: All reviews start with "pending" status and need admin approval
3. **Inventory**: Total quantity is calculated across all product variants
4. **Pricing**: Prices are in the smallest currency unit (cents for USD)
5. **Images**: The first image is used as the thumbnail

## 🔧 Troubleshooting

### Module not found error
Make sure you've built the project:
```bash
pnpm build
```

### Review module not registered
Check `medusa-config.js` includes:
```javascript
modules: [
  {
    resolve: './src/modules/review',
    key: 'reviewModuleService',
  },
  // ...
]
```

### Can't fetch products
Make sure you have products in your database. You can add them via:
- Admin panel: http://localhost:9000/app
- Admin API
- Seed script

## 📚 Full Documentation

See [PRODUCT_ENDPOINTS.md](./PRODUCT_ENDPOINTS.md) for complete API documentation.

## 🎯 Next Steps

- Set up admin authentication for review management
- Add email notifications for new reviews
- Create a frontend UI for displaying products and reviews
- Implement review filtering and sorting
- Add review images/photos support

