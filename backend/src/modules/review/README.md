# Review Module

## Overview
This module provides a custom review system for products in your Medusa store. It allows customers to leave ratings and reviews for products they've purchased.

## Features
- ⭐ 5-star rating system
- 📝 Review titles and comments
- ✅ Verified purchase badges for authenticated customers
- 👍 Helpful votes for reviews
- 🔒 Review approval system (pending/approved/rejected)
- 📊 Rating statistics and distribution

## Database Model

The `Review` model includes:
- `id`: Unique identifier
- `product_id`: Product being reviewed
- `customer_id`: Customer who wrote the review (nullable)
- `customer_name`: Display name for the reviewer
- `customer_email`: Email address (nullable)
- `rating`: 1-5 star rating
- `title`: Optional review title
- `comment`: Review text
- `verified_purchase`: Boolean indicating if from authenticated customer
- `status`: pending | approved | rejected
- `helpful_count`: Number of helpful votes
- `created_at`: Creation timestamp
- `updated_at`: Update timestamp

## API Endpoints

See [PRODUCT_ENDPOINTS.md](../../../PRODUCT_ENDPOINTS.md) for full API documentation.

### Store Endpoints
- `GET /store/products/:id/reviews` - Get product reviews
- `POST /store/products/:id/reviews` - Submit a review
- `POST /store/reviews/:id/helpful` - Mark review as helpful

### Admin Endpoints (To be implemented)
- `GET /admin/reviews` - List all reviews
- `PUT /admin/reviews/:id/approve` - Approve a review
- `PUT /admin/reviews/:id/reject` - Reject a review
- `DELETE /admin/reviews/:id` - Delete a review

## Usage

### Submitting a Review

```typescript
const response = await fetch('/store/products/prod_123/reviews', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rating: 5,
    title: 'Great product!',
    comment: 'I really love this product. Highly recommended!',
    customer_name: 'John Doe',
    customer_email: 'john@example.com'
  })
});
```

### Fetching Reviews

```typescript
const response = await fetch('/store/products/prod_123/reviews?limit=10&offset=0');
const data = await response.json();

console.log(data.average_rating); // 4.5
console.log(data.rating_distribution); // { 5: 6, 4: 3, 3: 1, 2: 0, 1: 0 }
```

## Configuration

The review module is registered in `medusa-config.js`:

```javascript
modules: [
  {
    resolve: './src/modules/review',
    key: 'reviewModuleService',
  },
  // ... other modules
]
```

## Service Methods

The `ReviewModuleService` provides these methods:

- `listReviews(filters, config)` - List reviews with filters
- `listAndCountReviews(filters, config)` - List reviews and get total count
- `createReviews(data)` - Create a new review
- `updateReviews(id, data)` - Update a review
- `deleteReviews(id)` - Delete a review

## Future Enhancements

- [ ] Admin UI for review management
- [ ] Email notifications for new reviews
- [ ] Review moderation workflow
- [ ] Review images/photos
- [ ] Review replies from store owners
- [ ] Review reporting for inappropriate content
- [ ] Bulk review import/export

