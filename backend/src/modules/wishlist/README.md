# Wishlist Module

This module manages customer wishlists/favorites for products.

## Features

- Add products to wishlist
- Remove products from wishlist
- Retrieve customer's wishlist
- Support for specific product variants

## Database Schema

```typescript
{
  id: string (primary key)
  customer_id: string
  product_id: string
  variant_id: string (nullable)
  added_at: DateTime
}
```

## Usage

The module is registered in `medusa-config.js` and can be used in API routes:

```typescript
const wishlistModuleService = req.scope.resolve("wishlistModuleService");
```

## API Endpoints

- `GET /store/wishlist` - Get customer's wishlist
- `POST /store/wishlist` - Add product to wishlist
- `DELETE /store/wishlist/:id` - Remove product from wishlist

