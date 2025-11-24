import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId } from "../helpers";

/**
 * POST /store/cart/items
 * Add item to cart
 * Supports both authenticated and guest users
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const query = req.scope.resolve("query");

    const { variant_id, quantity = 1, cart_id } = req.body as { variant_id?: string; quantity?: number; cart_id?: string };

    // Validation
    if (!variant_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "variant_id is required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "quantity must be greater than 0",
      });
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required. Please create a cart first by calling GET /store/cart.",
      });
    }

    // Verify cart exists
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId);
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items?.find(
      (item: any) => item.variant_id === variant_id
    );

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      await cartModuleService.updateLineItems([
        {
          id: existingItem.id,
          quantity: newQuantity,
        },
      ]);

      // Fetch updated cart with details
      const refreshedCart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product", "customer", "region"],
      });

      const formattedCart = await formatCartResponse(refreshedCart, query);

      return res.json({
        message: "Item quantity updated in cart",
        cart: formattedCart,
      });
    }

    // Fetch variant details to get title and unit_price for adding to cart
    // Query through product to get variant details
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.id",
        "variants.title",
        "variants.prices.*",
      ],
      filters: {
        variants: {
          id: variant_id,
        },
      },
    });

    let variant: any = null;
    let price: any = null;
    
    // Find the variant from products
    if (products && products.length > 0) {
      for (const product of products) {
        variant = product.variants?.find((v: any) => v.id === variant_id);
        if (variant) {
          price = variant.prices?.[0];
          break;
        }
      }
    }

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found",
        message: "The specified variant does not exist",
      });
    }
    
    if (!price) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Variant does not have a price",
      });
    }

    // Get product title for the cart item
    const product = products?.find((p: any) => p.variants?.some((v: any) => v.id === variant_id));
    const productTitle = product?.title || variant.title || "Product";

    // Add new item to cart
    await cartModuleService.addLineItems(targetCartId, [
      {
        variant_id,
        quantity,
        title: productTitle,
        unit_price: price.amount,
      },
    ]);

    // Fetch updated cart with details
    const updatedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product", "customer", "region"],
    });

    const formattedCart = await formatCartResponse(updatedCart, query);

    res.status(201).json({
      message: "Item added to cart successfully",
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({
      error: "Failed to add item to cart",
      message: error.message,
    });
  }
}


