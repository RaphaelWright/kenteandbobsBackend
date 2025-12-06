# Pricing Consistency Implementation

## Summary

This implementation ensures pricing consistency across the entire application by enforcing that **all prices are stored in pesewas** (the smallest currency unit for Ghana Cedis), while displaying prices in cedis for user convenience.

## Changes Made

### 1. Currency Conversion Utilities (`src/utils/currency.ts`)
Created comprehensive currency conversion functions:

- **`cedisToPesewas(cedis)`** - Convert Ghana Cedis to Pesewas
- **`pesewasToCedis(pesewas)`** - Convert Pesewas to Ghana Cedis
- **`formatPesewasAsCedis(pesewas)`** - Format pesewas as "GH₵ 1.30"
- **`enrichPrice(amount, currency)`** - Add display fields to price objects
- **`toSmallestCurrencyUnit(amount, currency)`** - Generic conversion for all currencies
- **`fromSmallestCurrencyUnit(amount, currency)`** - Generic reverse conversion

Example:
```typescript
import { cedisToPesewas, enrichPrice } from "./utils/currency";

// Convert cedis to pesewas
const pesewas = cedisToPesewas(130.00);  // Returns: 13000

// Enrich price with display values
const enriched = enrichPrice(13000, "ghs");
// Returns: {
//   amount: 13000,
//   display_amount: 130.00,
//   formatted: "GH₵ 130.00",
//   currency_code: "ghs"
// }
```

### 2. Price Validation Middleware (`src/middlewares/validatePricing.ts`)

Created two middlewares:

#### `validatePricing()`
Validates that all prices in requests are in pesewas (whole numbers):
- Checks for integer values
- Warns if prices seem suspiciously low (< 50 pesewas for GHS)
- Provides helpful error messages

#### `convertCedisToPesewas()`
Converts prices from cedis to pesewas in request bodies:
- Looks for `_pricesInCedis: true` flag
- Recursively converts all price amounts
- Used for admin endpoints where prices are submitted in cedis

Usage:
```typescript
import { validatePricing, convertCedisToPesewas } from "./middlewares/validatePricing";

// Apply to routes that accept price data
router.post("/admin/products", 
  convertCedisToPesewas(),  // Optional: Convert cedis to pesewas
  validatePricing(),        // Validate prices are correct
  createProduct
);
```

### 3. Updated API Responses

All store API endpoints now return enriched price objects with display values:

#### Products (`/store/products`, `/store/products/:id`)
```json
{
  "price": {
    "min": 13000,
    "max": 13000,
    "min_display": 130.00,
    "max_display": 130.00,
    "min_formatted": "GH₵ 130.00",
    "max_formatted": "GH₵ 130.00",
    "currency": "ghs"
  },
  "variants": [{
    "price": 13000,
    "price_display": 130.00,
    "price_formatted": "GH₵ 130.00",
    "currency": "ghs"
  }]
}
```

#### Cart (`/store/cart`)
```json
{
  "items": [{
    "unit_price": 13000,
    "unit_price_display": 130.00,
    "unit_price_formatted": "GH₵ 130.00",
    "total": 13000,
    "total_display": 130.00,
    "total_formatted": "GH₵ 130.00"
  }],
  "subtotal": 13000,
  "subtotal_display": 130.00,
  "subtotal_formatted": "GH₵ 130.00",
  "total": 13000,
  "total_display": 130.00,
  "total_formatted": "GH₵ 130.00"
}
```

#### Orders (`/store/orders/:id`)
Similar enrichment for order totals and line items.

#### Search (`/store/search`)
Search results include enriched price displays.

#### Wishlist (`/store/wishlist`)
Wishlist items include enriched price displays.

### 4. Removed Price Multiplier Hack

**Before:**
```typescript
// ⚠️ TEMPORARY HACK: Multiply by 100 to convert prices
const PRICE_MULTIPLIER = parseInt(process.env.PAYSTACK_PRICE_MULTIPLIER || "1");
if (PRICE_MULTIPLIER !== 1) {
  cartTotal = cartTotal * PRICE_MULTIPLIER;
}
```

**After:**
```typescript
// No conversion needed - amount is already in pesewas
const paystackData = {
  amount: cartTotal,  // Already in pesewas
  currency: "GHS"
};
```

The payment initialization now works correctly without any multiplier because all prices are stored in pesewas from the start.

### 5. Updated Seed Data (`src/scripts/seed.ts`)

All product and shipping prices updated to use pesewas:

**Before:**
```typescript
prices: [
  { amount: 130, currency_code: "ghs" }  // ❌ Wrong: This is cedis
]
```

**After:**
```typescript
prices: [
  { amount: 13000, currency_code: "ghs" }  // ✅ Correct: GH₵ 130.00 in pesewas
]
```

### 6. Admin Conversion Utility (`/admin/custom/convert-prices`)

Created an admin endpoint to convert existing prices from cedis to pesewas:

```bash
# Preview changes (dry run)
curl -X GET http://localhost:9000/admin/custom/convert-prices

# Apply conversion
curl -X POST http://localhost:9000/admin/custom/convert-prices \
  -H "Content-Type: application/json" \
  -d '{"confirm": true, "dryRun": false}'
```

Features:
- Dry run mode to preview changes
- Only converts GHS prices that appear to be in cedis (< 1000)
- Shows old and new values with formatted display
- Requires explicit confirmation

### 7. Comprehensive Documentation

Created `PRICING_CONVENTION.md` with:
- Overview of currency conventions
- Examples of correct vs incorrect pricing
- Implementation details for each layer (database, admin, API, frontend, payments)
- Utility function documentation
- Migration guide for existing data
- Testing checklist
- Common issues and solutions
- Best practices

## Files Modified

### New Files
- ✅ `backend/src/utils/currency.ts` - Currency conversion utilities
- ✅ `backend/src/middlewares/validatePricing.ts` - Price validation middleware
- ✅ `backend/src/api/admin/custom/convert-prices/route.ts` - Admin conversion utility
- ✅ `backend/PRICING_CONVENTION.md` - Comprehensive documentation
- ✅ `backend/PRICING_IMPLEMENTATION.md` - This file

### Modified Files
- ✅ `backend/src/api/store/products/route.ts` - Added price enrichment
- ✅ `backend/src/api/store/products/[id]/route.ts` - Added price enrichment
- ✅ `backend/src/api/store/cart/helpers.ts` - Added price enrichment to cart responses
- ✅ `backend/src/api/store/orders/[id]/route.ts` - Added price enrichment
- ✅ `backend/src/api/store/search/route.ts` - Added price enrichment
- ✅ `backend/src/api/store/wishlist/route.ts` - Added price enrichment
- ✅ `backend/src/api/store/payments/paystack/initialize/route.ts` - Removed multiplier hack
- ✅ `backend/src/scripts/seed.ts` - Updated all prices to pesewas

## How It Works

### Data Flow

1. **Database Storage** (Pesewas)
   ```
   Product price: 13000 pesewas (GH₵ 130.00)
   ```

2. **API Layer** (Enrichment)
   ```typescript
   const enriched = enrichPrice(13000, "ghs");
   // Adds display_amount and formatted fields
   ```

3. **API Response** (Both formats)
   ```json
   {
     "price": 13000,
     "price_display": 130.00,
     "price_formatted": "GH₵ 130.00"
   }
   ```

4. **Frontend Display** (Cedis)
   ```jsx
   <div>{product.price_formatted}</div>
   // Shows: "GH₵ 130.00"
   ```

5. **Payment Gateway** (Pesewas)
   ```typescript
   paystack.initialize({
     amount: 13000  // Pesewas, no conversion needed
   })
   ```

## Migration Steps

### For Existing Deployments

1. **Backup Database**
   ```bash
   # Your backup command here
   ```

2. **Deploy Code**
   ```bash
   git pull
   npm install
   npm run build
   ```

3. **Check Existing Prices**
   ```bash
   curl -X GET http://localhost:9000/admin/custom/convert-prices
   ```

4. **Convert Prices** (if needed)
   ```bash
   curl -X POST http://localhost:9000/admin/custom/convert-prices \
     -H "Content-Type: application/json" \
     -d '{"confirm": true, "dryRun": false}'
   ```

5. **Reseed Database** (if starting fresh)
   ```bash
   npm run db:reset
   npm run seed
   ```

6. **Test Critical Flows**
   - View products → Check prices display as cedis
   - Add to cart → Check totals are correct
   - Initialize payment → Check Paystack amount matches cart
   - Complete order → Check order totals match payment

### For New Deployments

Just run the standard setup - seed data already has correct prices:
```bash
npm install
npm run db:setup
npm run seed
npm run dev
```

## Testing Checklist

- [ ] **Product Listing** - Prices display in cedis (e.g., GH₵ 130.00)
- [ ] **Product Detail** - Prices display in cedis
- [ ] **Add to Cart** - Cart totals display in cedis
- [ ] **Cart View** - Item prices and totals display correctly
- [ ] **Payment Init** - Amount sent to Paystack is in pesewas
- [ ] **Payment Amount** - Paystack displays correct cedis amount (e.g., GH₵ 130.00)
- [ ] **Order Confirmation** - Order totals display in cedis
- [ ] **Order History** - Past orders show correct amounts
- [ ] **Search Results** - Product prices display in cedis
- [ ] **Wishlist** - Product prices display in cedis
- [ ] **Admin Panel** - Can create products with cedis input (with conversion)

## Frontend Integration

### Recommended Usage

Always use the formatted or display fields:

```typescript
// ✅ CORRECT - Use formatted field
<div className="price">{product.price_formatted}</div>
// Output: "GH₵ 130.00"

// ✅ CORRECT - Use display_amount if you need the number
<div className="price">
  GH₵ {product.price_display.toFixed(2)}
</div>
// Output: "GH₵ 130.00"

// ❌ WRONG - Don't use raw amount
<div className="price">GH₵ {product.price}</div>
// Output: "GH₵ 13000" (WRONG!)

// ❌ WRONG - Don't divide by 100 manually
<div className="price">GH₵ {(product.price / 100).toFixed(2)}</div>
// Better to use the provided display fields
```

### Example Components

```tsx
// Product Card
function ProductCard({ product }) {
  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      <p className="price">{product.price.min_formatted}</p>
      {product.price.min !== product.price.max && (
        <p className="price-range">
          {product.price.min_formatted} - {product.price.max_formatted}
        </p>
      )}
    </div>
  );
}

// Cart Item
function CartItem({ item }) {
  return (
    <div className="cart-item">
      <span>{item.title}</span>
      <span>{item.unit_price_formatted}</span>
      <span>Qty: {item.quantity}</span>
      <span className="total">{item.total_formatted}</span>
    </div>
  );
}

// Cart Total
function CartTotal({ cart }) {
  return (
    <div className="cart-total">
      <div>Subtotal: {cart.subtotal_formatted}</div>
      <div>Shipping: {cart.shipping_total_formatted}</div>
      <div>Tax: {cart.tax_total_formatted}</div>
      <div className="total">Total: {cart.total_formatted}</div>
    </div>
  );
}
```

## Benefits

1. ✅ **Consistency** - All prices stored in same format (pesewas)
2. ✅ **Accuracy** - No floating point errors
3. ✅ **Clarity** - Display values separated from storage values
4. ✅ **Validation** - Middleware catches incorrect price submissions
5. ✅ **No Hacks** - Removed multiplier workaround
6. ✅ **Payment Accuracy** - Payment amounts always match cart display
7. ✅ **Developer Experience** - Utility functions make conversions easy
8. ✅ **Documentation** - Comprehensive guides for implementation

## Environment Variables

The `PAYSTACK_PRICE_MULTIPLIER` environment variable is **no longer needed** and can be removed from your `.env` file.

**Before:**
```env
PAYSTACK_PRICE_MULTIPLIER=100  # ❌ No longer needed
```

**After:**
```env
# No price multiplier needed - prices are stored correctly
```

## Support

For questions or issues:
1. Check `PRICING_CONVENTION.md` for detailed documentation
2. Review the utility functions in `src/utils/currency.ts`
3. Test with the conversion utility at `/admin/custom/convert-prices`
4. Verify payment amounts match cart display

## Conclusion

All pricing is now consistent across the application:
- **Database**: Stores in pesewas ✅
- **Admin**: Can input in cedis (with conversion) ✅
- **API**: Returns both pesewas and cedis ✅
- **Frontend**: Displays in cedis ✅
- **Payments**: Sends pesewas to Paystack ✅

No more price multiplier hacks or inconsistencies!
