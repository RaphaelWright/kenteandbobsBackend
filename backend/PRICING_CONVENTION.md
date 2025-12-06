# Pricing Convention Guide

## Overview

This application follows Medusa's standard pricing convention where **all prices are stored in the smallest currency unit** (e.g., pesewas for Ghana Cedis, cents for USD/EUR).

## Currency Conventions

| Currency | Major Unit | Smallest Unit | Conversion |
|----------|-----------|---------------|------------|
| Ghana Cedis (GHS) | Cedi (₵) | Pesewa | 1 Cedi = 100 Pesewas |
| US Dollar (USD) | Dollar ($) | Cent | 1 Dollar = 100 Cents |
| Euro (EUR) | Euro (€) | Cent | 1 Euro = 100 Cents |

## Examples

### Correct Pricing
```javascript
// GH₵ 1.30 should be stored as 130 pesewas
{
  amount: 130,
  currency_code: "ghs"
}

// GH₵ 99.99 should be stored as 9999 pesewas
{
  amount: 9999,
  currency_code: "ghs"
}

// $15.00 should be stored as 1500 cents
{
  amount: 1500,
  currency_code: "usd"
}
```

### Incorrect Pricing ❌
```javascript
// WRONG: Storing in major currency unit
{
  amount: 1.30,  // ❌ This is wrong!
  currency_code: "ghs"
}

// WRONG: Floating point numbers
{
  amount: 99.99,  // ❌ This is wrong!
  currency_code: "ghs"
}
```

## Implementation

### 1. Database Storage
- **Always store prices in pesewas** (or the smallest unit for other currencies)
- Prices should be **integers**, never floating point numbers
- Example: GH₵ 130.00 = 13000 pesewas

### 2. Admin Panel
- **You can now submit prices in cedis** - they're automatically converted to pesewas!
- All admin routes (`/admin/*`) have automatic conversion enabled
- The system detects cedis input by:
  - Decimal places (e.g., `130.50`)
  - GHS prices < 1000 (likely cedis, not pesewas)
- No flags needed - just enter prices naturally in cedis

```typescript
// Admin request with cedis (automatic conversion)
POST /admin/products
{
  "title": "Product Name",
  "variants": [{
    "prices": [{
      "amount": 130.00,  // ✅ Automatically converted to 13000 pesewas
      "currency_code": "ghs"
    }]
  }]
}

// No flag needed! The system auto-detects and converts cedis input.
// Works for all admin routes starting with /admin/
```

### 3. API Responses
All store API responses include **both** pesewas (raw) and cedis (display) values:

```json
{
  "price": 13000,
  "price_display": 130.00,
  "price_formatted": "GH₵ 130.00",
  "currency_code": "ghs"
}
```

### 4. Frontend Display
Always use the `*_display` or `*_formatted` fields for display:

```typescript
// ✅ Correct
<div>Price: {product.price_formatted}</div>
// Shows: "GH₵ 130.00"

// ❌ Wrong
<div>Price: GH₵ {product.price}</div>
// Shows: "GH₵ 13000" (incorrect!)
```

### 5. Payment Gateways (Paystack)
- Paystack expects amounts in **pesewas** for GHS
- No conversion needed - pass the amount directly from cart/order
- The cart total is already in pesewas

```typescript
// Correct Paystack initialization
const paystackData = {
  amount: cart.total,  // Already in pesewas
  currency: "GHS"
};
```

## Utility Functions

### Currency Conversion
Located in `src/utils/currency.ts`:

```typescript
import { 
  cedisToPesewas, 
  pesewasToCedis, 
  formatPesewasAsCedis,
  enrichPrice 
} from "../utils/currency";

// Convert cedis to pesewas
const pesewas = cedisToPesewas(130.00);  // Returns: 13000

// Convert pesewas to cedis
const cedis = pesewasToCedis(13000);  // Returns: 130.00

// Format for display
const formatted = formatPesewasAsCedis(13000);  // Returns: "GH₵ 130.00"

// Enrich price with display values
const enriched = enrichPrice(13000, "ghs");
// Returns: {
//   amount: 13000,
//   display_amount: 130.00,
//   formatted: "GH₵ 130.00",
//   currency_code: "ghs"
// }
```

### Price Validation Middleware
Located in `src/middlewares/validatePricing.ts`:

```typescript
import { validatePricing, convertCedisToPesewas } from "../middlewares/validatePricing";

// Apply to admin routes that accept price input
router.post("/admin/products", 
  convertCedisToPesewas(),  // Optional: Convert cedis to pesewas
  validatePricing(),        // Validate prices are in pesewas
  createProduct
);
```

## Migration Guide

### Converting Existing Prices

If you have existing prices stored incorrectly in cedis instead of pesewas:

1. **Backup your database first!**

2. Run the price conversion utility:
```bash
# Dry run to preview changes
curl -X GET http://localhost:9000/admin/custom/convert-prices

# Apply the conversion
curl -X POST http://localhost:9000/admin/custom/convert-prices \
  -H "Content-Type: application/json" \
  -d '{"confirm": true, "dryRun": false}'
```

3. The utility will:
   - Find all GHS prices that appear to be in cedis (< 1000)
   - Convert them to pesewas (multiply by 100)
   - Update the database

### Updating Seed Data

The seed data has been updated to use pesewas:

```typescript
// Before (incorrect)
prices: [{ amount: 130, currency_code: "ghs" }]

// After (correct)
prices: [{ amount: 13000, currency_code: "ghs" }]  // GH₵ 130.00
```

## Testing

### Verify Pricing Consistency

1. **Check Product Prices**
   - List products: `GET /store/products`
   - Verify `price_display` shows cedis correctly
   - Verify `price` (raw amount) is in pesewas

2. **Check Cart Totals**
   - Add items to cart: `POST /store/cart/items`
   - Verify `total_display` and `total_formatted` show correct cedis
   - Verify `total` is in pesewas

3. **Check Payment Amount**
   - Initialize payment: `POST /store/payments/paystack/initialize`
   - Verify the amount sent to Paystack is in pesewas
   - Verify it matches the cart total

4. **Check Order Display**
   - Complete order and view: `GET /store/orders/:id`
   - Verify all amounts have display values in cedis

## Common Issues

### Issue: Payment amount doesn't match cart display
**Cause**: Prices were stored in cedis instead of pesewas  
**Solution**: Run the price conversion utility

### Issue: Prices showing as GH₵ 13000.00 instead of GH₵ 130.00
**Cause**: Frontend displaying raw amount instead of display amount  
**Solution**: Use `price_formatted` or `price_display` fields in frontend

### Issue: Admin panel showing very large numbers
**Cause**: Displaying pesewas as if they were cedis  
**Solution**: Use the currency utility functions to convert for display

### Issue: New products created with wrong prices
**Cause**: Admin submitting prices in cedis without conversion  
**Solution**: Either:
- Submit prices in pesewas (multiply by 100)
- Use the `convertCedisToPesewas` middleware
- Add `_pricesInCedis: true` flag to request

## Best Practices

1. ✅ **Always store prices as integers in pesewas**
2. ✅ **Use display fields for frontend rendering**
3. ✅ **Apply validation middleware to price-related endpoints**
4. ✅ **Include both raw and display values in API responses**
5. ✅ **Document currency units in API documentation**
6. ✅ **Test payment amounts match cart display**
7. ❌ **Never use floating point for price storage**
8. ❌ **Never display raw pesewas values to users**
9. ❌ **Never convert payment amounts (already in pesewas)**

## Summary

| Component | Format | Example |
|-----------|--------|---------|
| **Database** | Pesewas (integer) | `13000` |
| **API Response (raw)** | Pesewas (integer) | `"price": 13000` |
| **API Response (display)** | Cedis (float) | `"price_display": 130.00` |
| **API Response (formatted)** | String with symbol | `"price_formatted": "GH₵ 130.00"` |
| **Admin Input** | Cedis (with conversion) | `130.00` → converted to `13000` |
| **Frontend Display** | Formatted string | `"GH₵ 130.00"` |
| **Payment Gateway** | Pesewas (integer) | `13000` |
