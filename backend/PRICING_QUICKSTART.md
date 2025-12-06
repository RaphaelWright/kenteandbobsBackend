# Pricing Consistency Fix - Quick Start Guide

## What Was Fixed

Your Medusa backend had inconsistent pricing where:
- ❌ Prices were stored in Ghana Cedis instead of pesewas
- ❌ A temporary hack multiplied prices by 100 for Paystack payments
- ❌ Cart displayed different amounts than what was charged

Now everything is consistent:
- ✅ All prices stored in **pesewas** (smallest currency unit)
- ✅ API responses include both **pesewas** (for accuracy) and **cedis** (for display)
- ✅ No more multiplier hack - payments work correctly
- ✅ Cart display matches payment amount

## Key Changes

### 1. Currency Utilities
```typescript
import { enrichPrice, cedisToPesewas } from "./utils/currency";

// Convert cedis to pesewas
const pesewas = cedisToPesewas(130.00);  // Returns: 13000

// Enrich price with display values
const enriched = enrichPrice(13000, "ghs");
// Returns: { amount: 13000, display_amount: 130.00, formatted: "GH₵ 130.00" }
```

### 2. API Response Format
All store endpoints now return:
```json
{
  "price": 13000,
  "price_display": 130.00,
  "price_formatted": "GH₵ 130.00",
  "currency_code": "ghs"
}
```

### 3. Frontend Usage
Always use the display fields:
```jsx
// ✅ Correct
<div>{product.price_formatted}</div>  // Shows: GH₵ 130.00

// ❌ Wrong
<div>GH₵ {product.price}</div>  // Shows: GH₵ 13000 (incorrect!)
```

## Quick Setup

### For Fresh Install
```bash
npm install
npm run db:setup
npm run seed  # Seeds data with correct pesewas prices
npm run dev
```

### For Existing Installation

1. **Backup your database first!**

2. **Update code:**
   ```bash
   git pull
   npm install
   npm run build
   ```

3. **Check existing prices:**
   ```bash
   curl http://localhost:9000/admin/custom/convert-prices
   ```

4. **Convert prices if needed:**
   ```bash
   curl -X POST http://localhost:9000/admin/custom/convert-prices \
     -H "Content-Type: application/json" \
     -d '{"confirm": true, "dryRun": false}'
   ```

5. **Or reseed database:**
   ```bash
   npm run db:reset
   npm run seed
   ```

## Testing

1. **Check product prices:**
   ```bash
   curl http://localhost:9000/store/products
   ```
   Verify `price_formatted` shows "GH₵ 130.00" format

2. **Check cart totals:**
   ```bash
   curl http://localhost:9000/store/cart
   ```
   Verify `total_formatted` displays correctly

3. **Test payment:**
   - Add items to cart
   - Initialize Paystack payment
   - Verify amount matches cart display

## Files to Update in Frontend

Your frontend should use the new display fields:

### Products
```typescript
// Old
<div>GH₵ {product.price / 100}</div>

// New
<div>{product.price_formatted}</div>
```

### Cart
```typescript
// Old
<div>GH₵ {cart.total / 100}</div>

// New
<div>{cart.total_formatted}</div>
```

### Cart Items
```typescript
// Old
<div>GH₵ {item.unit_price / 100}</div>

// New
<div>{item.unit_price_formatted}</div>
```

## Environment Variables

**Remove this from `.env`** (no longer needed):
```env
PAYSTACK_PRICE_MULTIPLIER=100  # ❌ Delete this line
```

## Documentation

- **PRICING_CONVENTION.md** - Complete pricing convention guide
- **PRICING_IMPLEMENTATION.md** - Detailed implementation notes
- **src/utils/currency.ts** - Currency utility functions
- **src/middlewares/validatePricing.ts** - Price validation middleware

## Examples

### Creating Products (Admin)
**You can now submit prices in cedis - they'll be automatically converted!**

```typescript
// ✅ RECOMMENDED: Submit in cedis (auto-converted)
POST /admin/products
{
  "variants": [{
    "prices": [{ "amount": 130.00, "currency_code": "ghs" }]  // Auto-converts to 13000 pesewas
  }]
}

// ✅ Also works: Submit in pesewas directly
POST /admin/products
{
  "variants": [{
    "prices": [{ "amount": 13000, "currency_code": "ghs" }]  // Stored as-is
  }]
}

// ✅ Optional: Explicit flag (not needed, but supported)
POST /admin/products
{
  "_pricesInCedis": true,  // Optional - auto-detection works anyway
  "variants": [{
    "prices": [{ "amount": 130.00, "currency_code": "ghs" }]
  }]
}
```

**Note**: All admin routes (`/admin/*`) automatically convert cedis to pesewas. Just enter prices naturally!

### Product Response (Store)
```json
{
  "id": "prod_123",
  "name": "T-Shirt",
  "price": {
    "min": 13000,
    "min_display": 130.00,
    "min_formatted": "GH₵ 130.00",
    "currency": "ghs"
  }
}
```

### Cart Response
```json
{
  "items": [{
    "unit_price": 13000,
    "unit_price_display": 130.00,
    "unit_price_formatted": "GH₵ 130.00",
    "quantity": 2,
    "total": 26000,
    "total_display": 260.00,
    "total_formatted": "GH₵ 260.00"
  }],
  "total": 26000,
  "total_display": 260.00,
  "total_formatted": "GH₵ 260.00"
}
```

## Conversion Reference

| Cedis | Pesewas | Database Value | Display Value |
|-------|---------|----------------|---------------|
| GH₵ 1.30 | 130 | `130` | `"GH₵ 1.30"` |
| GH₵ 10.00 | 1000 | `1000` | `"GH₵ 10.00"` |
| GH₵ 99.99 | 9999 | `9999` | `"GH₵ 99.99"` |
| GH₵ 130.00 | 13000 | `13000` | `"GH₵ 130.00"` |

## Common Issues

### Issue: Prices showing as GH₵ 13000 instead of GH₵ 130.00
**Solution**: Use `price_formatted` field instead of `price`

### Issue: Payment amount doesn't match cart
**Solution**: Run the price conversion utility or reseed database

### Issue: Admin showing large numbers
**Solution**: Use currency utility functions to convert for display

## Support

Need help? Check:
1. `PRICING_CONVENTION.md` - Full documentation
2. `PRICING_IMPLEMENTATION.md` - Implementation details
3. `/admin/custom/convert-prices` - Price conversion tool

## Summary

- 🎯 **Store prices in pesewas** (database)
- 👁️ **Display prices in cedis** (frontend)
- 📊 **Use `*_formatted` fields** (always)
- ✅ **No manual conversion** (use utilities)
- 🚫 **No multiplier hack** (removed)
