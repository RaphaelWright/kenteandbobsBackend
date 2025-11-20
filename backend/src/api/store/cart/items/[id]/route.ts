import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * PATCH /store/cart/items/:id
 * Update cart item quantity
 * Supports both authenticated and guest users
 */
export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const query = req.scope.resolve("query");

    const { id } = req.params;
    const { quantity, cart_id } = req.body;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Item id is required",
      });
    }

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        error: "Bad Request",
        message: "quantity is required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "quantity must be greater than 0",
      });
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || req.query.cart_id || req.session?.cart_id;

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Verify cart exists and item belongs to it
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    const item = cart.items?.find((item: any) => item.id === id);

    if (!item) {
      return res.status(404).json({
        error: "Item not found",
        message: "The specified item does not exist in this cart",
      });
    }

    // Update item quantity
    await cartModuleService.updateLineItems([
      {
        id: id,
        quantity: quantity,
      },
    ]);

    // Fetch updated cart with details
    const updatedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product", "customer", "region"],
    });

    const formattedCart = await formatCartResponse(updatedCart, query);

    res.json({
      message: "Cart item updated successfully",
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    res.status(500).json({
      error: "Failed to update cart item",
      message: error.message,
    });
  }
}

/**
 * DELETE /store/cart/items/:id
 * Remove item from cart
 * Supports both authenticated and guest users
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const query = req.scope.resolve("query");

    const { id } = req.params;
    const { cart_id } = req.body;

    // Validation
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Item id is required",
      });
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || req.query.cart_id || req.session?.cart_id;

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Verify cart exists and item belongs to it
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    const item = cart.items?.find((item: any) => item.id === id);

    if (!item) {
      return res.status(404).json({
        error: "Item not found",
        message: "The specified item does not exist in this cart",
      });
    }

    // Remove item from cart
    await cartModuleService.removeLineItems(targetCartId, [id]);

    // Fetch updated cart with details
    const updatedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product", "customer", "region"],
    });

    const formattedCart = await formatCartResponse(updatedCart, query);

    res.json({
      message: "Item removed from cart successfully",
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({
      error: "Failed to remove cart item",
      message: error.message,
    });
  }
}

/**
 * Helper function to format cart response with product details
 */
async function formatCartResponse(cart: any, query: any) {
  // Fetch product details for cart items
  const itemIds = cart.items?.map((item: any) => item.variant_id).filter(Boolean) || [];
  
  let productsMap: Record<string, any> = {};
  
  if (itemIds.length > 0) {
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "thumbnail",
          "variants.id",
          "variants.title",
          "variants.sku",
          "variants.prices.*",
        ],
        filters: {
          variants: {
            id: itemIds,
          },
        },
      });

      // Build map of variant_id -> product
      products.forEach((product: any) => {
        product.variants?.forEach((variant: any) => {
          productsMap[variant.id] = {
            product: {
              id: product.id,
              title: product.title,
              handle: product.handle,
              thumbnail: product.thumbnail,
            },
            variant: {
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: variant.prices?.[0]?.amount || null,
              currency: variant.prices?.[0]?.currency_code || "ghs",
            },
          };
        });
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }

  return {
    id: cart.id,
    customer_id: cart.customer_id,
    email: cart.email,
    currency_code: cart.currency_code,
    region_id: cart.region_id,
    items: cart.items?.map((item: any) => {
      const productInfo = productsMap[item.variant_id] || {};
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product: productInfo.product || null,
        variant: productInfo.variant || null,
      };
    }) || [],
    subtotal: cart.subtotal || 0,
    tax_total: cart.tax_total || 0,
    shipping_total: cart.shipping_total || 0,
    discount_total: cart.discount_total || 0,
    total: cart.total || 0,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
  };
}

