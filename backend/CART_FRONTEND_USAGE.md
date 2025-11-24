# Cart Endpoints - Frontend Usage Guide

This guide explains how to use the cart endpoints in your frontend application.

## Overview

The cart system supports both **guest users** and **authenticated users**:
- **Guest users**: Cart ID is stored in session (handled automatically by cookies)
- **Authenticated users**: Cart is automatically linked to customer account

## Key Concepts

### Cart ID Management

The cart ID can be provided in **three ways** (in order of priority):
1. **Request body** (`cart_id` field)
2. **Query parameter** (`?cart_id=...`)
3. **Session** (automatically stored in cookies for guest users)

**Best Practice**: For most operations, you don't need to manually pass `cart_id` - it's automatically handled via session cookies.

---

## Frontend Implementation Flow

### 1. Initialize Cart (On App Load)

When your app loads, fetch or create a cart:

```typescript
// Initialize cart on app load
async function initializeCart() {
  try {
    const response = await fetch('/store/cart', {
      method: 'GET',
      credentials: 'include', // Important: include cookies for session
    });
    
    const data = await response.json();
    return data.cart; // Returns existing cart or creates new one
  } catch (error) {
    console.error('Failed to initialize cart:', error);
    return null;
  }
}
```

**Response:**
```json
{
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [],
    "subtotal": 0,
    "total": 0,
    "currency_code": "ghs"
  }
}
```

**Important**: Always use `credentials: 'include'` to send/receive cookies for session management.

---

### 2. Add Item to Cart

When user clicks "Add to Cart" button:

```typescript
async function addToCart(variantId: string, quantity: number = 1) {
  try {
    const response = await fetch('/store/cart/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        variant_id: variantId,
        quantity: quantity,
        // cart_id is optional - session handles it automatically
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Update your cart state with data.cart
      return data.cart;
    } else {
      throw new Error(data.message || 'Failed to add item');
    }
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

// Usage
const updatedCart = await addToCart('variant_01HZVARIANT456', 2);
```

**Response:**
```json
{
  "message": "Item added to cart successfully",
  "cart": {
    "id": "cart_01HZXYZ123",
    "items": [
      {
        "id": "li_01HZITEM001",
        "title": "Product Name",
        "quantity": 2,
        "unit_price": 5000,
        "total": 10000,
        "variant_id": "variant_01HZVARIANT456",
        "product": {
          "id": "prod_01HZPROD123",
          "title": "Product Name",
          "handle": "product-name",
          "thumbnail": "https://..."
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
    "total": 10000
  }
}
```

**Note**: If the same variant is added again, the quantity is **incremented** (not duplicated).

---

### 3. Update Item Quantity

When user changes quantity in cart:

```typescript
async function updateCartItem(itemId: string, newQuantity: number) {
  try {
    const response = await fetch(`/store/cart/items/${itemId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        quantity: newQuantity,
        // cart_id optional - handled by session
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return data.cart;
    } else {
      throw new Error(data.message || 'Failed to update item');
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
    throw error;
  }
}

// Usage
const updatedCart = await updateCartItem('li_01HZITEM001', 5);
```

**Response:** Same structure as add to cart, with updated quantities and totals.

---

### 4. Remove Item from Cart

When user clicks "Remove" button:

```typescript
async function removeCartItem(itemId: string) {
  try {
    const response = await fetch(`/store/cart/items/${itemId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        // cart_id optional - handled by session
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      return data.cart;
    } else {
      throw new Error(data.message || 'Failed to remove item');
    }
  } catch (error) {
    console.error('Error removing cart item:', error);
    throw error;
  }
}

// Usage
const updatedCart = await removeCartItem('li_01HZITEM001');
```

---

### 5. Get Current Cart

Refresh cart data (useful for cart page or cart icon):

```typescript
async function getCart() {
  try {
    const response = await fetch('/store/cart', {
      method: 'GET',
      credentials: 'include',
    });
    
    const data = await response.json();
    return data.cart;
  } catch (error) {
    console.error('Error fetching cart:', error);
    return null;
  }
}
```

---

### 6. Update Cart Properties

Update cart settings like currency, region, email, or addresses:

```typescript
async function updateCart(updates: {
  currency_code?: string;
  region_id?: string;
  email?: string;
  shipping_address?: Address;
  billing_address?: Address;
}) {
  try {
    const response = await fetch('/store/cart', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    
    if (response.ok) {
      return data.cart;
    } else {
      throw new Error(data.message || 'Failed to update cart');
    }
  } catch (error) {
    console.error('Error updating cart:', error);
    throw error;
  }
}

// Usage examples
// Change currency
await updateCart({ currency_code: 'usd' });

// Update email for guest checkout
await updateCart({ email: 'customer@example.com' });

// Update shipping address
await updateCart({
  shipping_address: {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'Accra',
    province: 'Greater Accra',
    postal_code: 'GA001',
    country_code: 'GH',
    phone: '+233241234567'
  }
});
```

**Response:**
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
    "total": 10000
  }
}
```

---

### 7. Complete Checkout (Requires Authentication)

When user proceeds to checkout:

```typescript
async function completeCheckout(
  shippingAddress: Address,
  billingAddress: Address,
  shippingMethodId?: string
) {
  try {
    // Ensure user is authenticated
    const response = await fetch('/store/cart/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include auth token if using JWT
        // 'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        shipping_method_id: shippingMethodId,
        payment_provider_id: 'stripe', // or your payment provider
        // cart_id optional - handled by session
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      // Returns order object, not cart
      return data.order;
    } else if (response.status === 401) {
      // Redirect to login
      throw new Error('Please log in to complete checkout');
    } else {
      throw new Error(data.message || 'Failed to complete checkout');
    }
  } catch (error) {
    console.error('Error completing checkout:', error);
    throw error;
  }
}

// Address type
interface Address {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  province: string;
  postal_code: string;
  country_code: string;
  phone: string;
}

// Usage
const order = await completeCheckout(
  {
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'Accra',
    province: 'Greater Accra',
    postal_code: 'GA001',
    country_code: 'GH',
    phone: '+233241234567'
  },
  {
    // Same structure for billing
    first_name: 'John',
    last_name: 'Doe',
    address_1: '123 Main St',
    city: 'Accra',
    province: 'Greater Accra',
    postal_code: 'GA001',
    country_code: 'GH',
    phone: '+233241234567'
  }
);

// Order is created and cart is automatically deleted
console.log('Order ID:', order.id);
console.log('Order Status:', order.status);
```

**Response:**
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
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

**Important Notes:**
- This endpoint requires authentication. If user is not logged in, they should be redirected to login first.
- **The cart is automatically deleted after successful order creation.**
- The response contains an `order` object, not a `cart` object.
- You should redirect the user to an order confirmation page after successful checkout.

---

### 8. Clear Cart

When user wants to empty cart:

```typescript
async function clearCart() {
  try {
    const response = await fetch('/store/cart', {
      method: 'DELETE',
      credentials: 'include',
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      throw new Error('Failed to clear cart');
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    throw error;
  }
}
```

---

## Complete React Example

Here's a complete React hook example:

```typescript
import { useState, useEffect, useCallback } from 'react';

interface CartItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total: number;
  variant_id: string;
  product: {
    id: string;
    title: string;
    handle: string;
    thumbnail: string;
  };
  variant: {
    id: string;
    title: string;
    sku: string;
    price: number;
    currency: string;
  };
}

interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency_code: string;
}

export function useCart() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = '/store/cart';

  // Initialize cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch cart');
      
      const data = await response.json();
      setCart(data.cart);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (variantId: string, quantity: number = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ variant_id: variantId, quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add to cart');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
      return data.cart;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update item');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
      return data.cart;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove item');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
      return data.cart;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCart = useCallback(async (updates: {
    currency_code?: string;
    region_id?: string;
    email?: string;
    shipping_address?: any;
    billing_address?: any;
  }) => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update cart');
      }

      const data = await response.json();
      setCart(data.cart);
      setError(null);
      return data.cart;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(API_BASE, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to clear cart');

      setCart(null);
      setError(null);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const completeCheckout = useCallback(async (
    shippingAddress: any,
    billingAddress: any,
    shippingMethodId?: string
  ) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          shipping_address: shippingAddress,
          billing_address: billingAddress,
          shipping_method_id: shippingMethodId,
          payment_provider_id: 'stripe',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (response.status === 401) {
          throw new Error('Please log in to complete checkout');
        }
        throw new Error(error.message || 'Failed to complete checkout');
      }

      const data = await response.json();
      // Clear cart after successful checkout
      setCart(null);
      setError(null);
      return data.order;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    cart,
    loading,
    error,
    addToCart,
    updateItem,
    removeItem,
    updateCart,
    clearCart,
    completeCheckout,
    refreshCart: fetchCart,
    itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0,
  };
}

// Usage in component
function CartIcon() {
  const { itemCount } = useCart();
  
  return (
    <div>
      Cart ({itemCount})
    </div>
  );
}

function ProductPage({ variantId }: { variantId: string }) {
  const { addToCart, loading } = useCart();
  
  const handleAddToCart = async () => {
    try {
      await addToCart(variantId, 1);
      alert('Added to cart!');
    } catch (error) {
      alert('Failed to add to cart');
    }
  };
  
  return (
    <button onClick={handleAddToCart} disabled={loading}>
      Add to Cart
    </button>
  );
}
```

---

## Important Notes

### Session Management
- **Always use `credentials: 'include'`** in fetch requests to handle session cookies
- Cart ID is automatically stored in session for guest users
- For authenticated users, cart is linked to customer account automatically

### Error Handling
- Always check `response.ok` before processing data
- Handle 401 errors for checkout (redirect to login)
- Handle 404 errors (cart/item not found)
- Handle 400 errors (validation issues)

### Cart State Management
- After each cart operation, the response includes the full updated cart
- Update your local state with the returned cart data
- Consider debouncing rapid quantity updates

### Authentication Flow
- Guest users can add items to cart without login
- Checkout requires authentication
- When user logs in, cart is automatically linked to their account
- Guest cart items are preserved when user logs in

### Best Practices
1. **Initialize cart on app load** - Call `GET /store/cart` when app starts
2. **Store cart ID locally** - You can store `cart.id` in state, but session handles it automatically
3. **Handle loading states** - Show loading indicators during cart operations
4. **Optimistic updates** - Update UI immediately, then sync with server response
5. **Error recovery** - If cart operation fails, refresh cart state
6. **Update cart before checkout** - Use `PATCH /store/cart` to set addresses, currency, or region before completing checkout
7. **Handle order creation** - After successful checkout, redirect to order confirmation page (cart is automatically deleted)

---

## Common Patterns

### Pattern 1: Add to Cart with Optimistic Update

```typescript
async function addToCartOptimistic(variantId: string, quantity: number) {
  // Optimistically update UI
  const tempItem = { /* temporary item data */ };
  updateCartUI(tempItem);
  
  try {
    const cart = await addToCart(variantId, quantity);
    // Update with real data
    updateCartUI(cart);
  } catch (error) {
    // Revert optimistic update
    revertCartUI();
    showError(error.message);
  }
}
```

### Pattern 2: Merge Guest Cart on Login

```typescript
async function handleLogin(email: string, password: string) {
  // 1. Login user
  await login(email, password);
  
  // 2. Get current guest cart
  const guestCart = await getCart();
  
  // 3. After login, cart is automatically linked to customer
  // Items from guest cart should be preserved
  const userCart = await getCart();
  
  // 4. If needed, merge items manually
  // (Backend should handle this automatically)
}
```

### Pattern 3: Cart Icon with Badge

```typescript
function CartBadge() {
  const { cart, loading } = useCart();
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  return (
    <Link to="/cart">
      <ShoppingCartIcon />
      {itemCount > 0 && <Badge>{itemCount}</Badge>}
    </Link>
  );
}
```

### Pattern 4: Complete Checkout Flow

```typescript
async function handleCheckout(
  shippingAddress: Address,
  billingAddress: Address
) {
  try {
    // 1. Update cart with addresses before checkout
    await updateCart({
      shipping_address: shippingAddress,
      billing_address: billingAddress,
    });

    // 2. Complete checkout (creates order)
    const order = await completeCheckout(
      shippingAddress,
      billingAddress
    );

    // 3. Redirect to order confirmation
    router.push(`/orders/${order.id}`);
    
    return order;
  } catch (error) {
    if (error.message.includes('log in')) {
      // Redirect to login
      router.push('/login?redirect=/checkout');
    } else {
      // Show error message
      alert(`Checkout failed: ${error.message}`);
    }
    throw error;
  }
}
```

---

## Testing

### Test Cart Flow

```typescript
// 1. Initialize
const cart = await initializeCart();
console.log('Cart ID:', cart.id);

// 2. Add item
const updatedCart = await addToCart('variant_123', 2);
console.log('Items:', updatedCart.items.length);

// 3. Update quantity
const itemId = updatedCart.items[0].id;
const newCart = await updateCartItem(itemId, 5);
console.log('New quantity:', newCart.items[0].quantity);

// 4. Remove item
const finalCart = await removeCartItem(itemId);
console.log('Final items:', finalCart.items.length);
```

---

## Troubleshooting

### Issue: Cart ID not persisting
**Solution**: Ensure `credentials: 'include'` is set in all fetch requests

### Issue: Items not adding
**Solution**: Check that `variant_id` is correct and variant has a price

### Issue: 401 on checkout
**Solution**: User must be authenticated. Redirect to login page

### Issue: Cart empty after page refresh
**Solution**: Ensure session cookies are being sent. Check browser cookie settings

---

## API Base URL

All endpoints are prefixed with `/store/cart`:
- `GET /store/cart` - Get or create cart
- `POST /store/cart` - Create cart explicitly
- `PATCH /store/cart` - Update cart properties (currency, region, email, addresses)
- `DELETE /store/cart` - Delete cart
- `POST /store/cart/items` - Add item
- `PATCH /store/cart/items/:id` - Update item quantity
- `DELETE /store/cart/items/:id` - Remove item
- `POST /store/cart/complete` - Complete checkout (creates order)


