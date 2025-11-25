# Cart Troubleshooting Guide

## Common Issues and Solutions

### 1. "Items do not have a price" Error

**Cause:** The variant's price doesn't match the cart's region.

**Diagnosis:**
1. Check your cart's region:
   ```bash
   GET /store/cart
   # Look for "region_id" in response
   ```

2. Check your variant's prices:
   - Variant prices can have region rules (e.g., `"rules": {"region_id": "reg_xxx"}`)
   - Prices without region rules work for any region
   - Region-specific prices only work for that specific region

**Solutions:**

**Option A: Update cart region to match variant price**
```bash
PATCH /store/cart
Content-Type: application/json

{
  "region_id": "reg_01KA6V687ZJCKNTQ0CSFJ37ZHS"  # Use region from variant price
}
```

**Option B: Create cart with correct region from start**
```bash
POST /store/cart
Content-Type: application/json

{
  "region_id": "reg_01KA6V687ZJCKNTQ0CSFJ37ZHS",
  "currency_code": "ghs"
}
```

**Option C: Add a price without region rules in Medusa Admin**
- Go to Products → Select Product → Variant
- Add a price with no region restriction

---

### 2. MikroORM "Cannot read properties of undefined" Error

**Error Message:**
```
TypeError: Cannot read properties of undefined (reading 'strategy')
at SqlEntityManager.getJoinedFilters
```

**Cause:** Cart is in a corrupted state or there's a database relationship issue.

**Solution: Reset the cart**
```bash
POST /store/cart/reset
Content-Type: application/json

{
  "region_id": "reg_01KA6V687ZJCKNTQ0CSFJ37ZHS",
  "currency_code": "ghs"
}
```

This will:
1. Delete the old corrupted cart
2. Create a fresh new cart
3. Update your session with the new cart ID

**Alternative: Delete cart and create new one**
```bash
# Step 1: Delete
DELETE /store/cart

# Step 2: Create fresh cart
GET /store/cart  # This auto-creates a new cart
```

---

### 3. Cart Not Found Error

**Cause:** Cart ID in session is invalid or cart was deleted.

**Solution:**
```bash
# Simply call GET to create a new cart
GET /store/cart
```

The endpoint automatically creates a new cart if none exists.

---

### 4. Region Configuration Issues

**Problem:** "No region found" or "Region not configured"

**Solution:** Ensure at least one region exists in Medusa Admin:

1. Go to Medusa Admin → Settings → Regions
2. Create a region with:
   - Name: "Ghana"
   - Currency: GHS
   - Countries: Ghana

---

## Best Practices

### 1. Always Initialize Cart Before Adding Items

```typescript
// Frontend example
async function initializeCart() {
  const response = await fetch('/store/cart', {
    credentials: 'include',
  });
  const data = await response.json();
  return data.cart;
}

// Use before adding items
const cart = await initializeCart();
```

### 2. Handle Region Mismatches Gracefully

```typescript
async function addToCartWithRegionCheck(variantId, quantity) {
  try {
    const response = await fetch('/store/cart/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ variant_id: variantId, quantity }),
    });

    const data = await response.json();

    if (!response.ok) {
      if (data.error === "Pricing error") {
        // Region mismatch - reset cart with correct region
        console.log('Region mismatch detected, resetting cart...');
        await fetch('/store/cart/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            region_id: 'reg_01KA6V687ZJCKNTQ0CSFJ37ZHS', // Your correct region
          }),
        });
        
        // Retry adding item
        return addToCartWithRegionCheck(variantId, quantity);
      }
      throw new Error(data.message);
    }

    return data.cart;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}
```

### 3. Reset Cart When Issues Persist

If you encounter persistent errors, reset the cart:

```typescript
async function resetAndRetry(variantId, quantity) {
  // Reset cart
  await fetch('/store/cart/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });

  // Try adding item again
  return addToCart(variantId, quantity);
}
```

---

## Diagnostic Endpoints

### Check Cart Status
```bash
GET /store/cart
```

Returns current cart with:
- `region_id` - Region the cart is using
- `currency_code` - Currency
- `items` - Current items

### Check Variant Details
```bash
GET /store/variants/{variant_id}
```

Returns variant with:
- `prices` - All available prices
- `prices[].rules` - Region restrictions (if any)

### List All Regions
```bash
GET /store/regions
```

Returns all available regions to choose from.

---

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| "Items do not have a price" | `PATCH /store/cart` with correct `region_id` |
| MikroORM error | `POST /store/cart/reset` |
| Cart not found | `GET /store/cart` (auto-creates) |
| Corrupted cart | `POST /store/cart/reset` |
| Need fresh start | `DELETE /store/cart` then `GET /store/cart` |

---

## Contact & Support

If issues persist after trying these solutions:
1. Check Medusa version compatibility
2. Verify database integrity
3. Check Medusa logs for detailed error messages
4. Consider opening an issue on GitHub


