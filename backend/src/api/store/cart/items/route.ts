import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { addToCartWorkflow, updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
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
      cart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items"],
      });
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
      
      await updateLineItemInCartWorkflow(req.scope).run({
        input: {
          cart_id: targetCartId,
          item_id: existingItem.id,
          update: {
            quantity: newQuantity,
          },
        },
      });

      // Fetch updated cart with details
      const refreshedCart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product"],
      });

      const formattedCart = await formatCartResponse(refreshedCart, query);

      return res.json({
        message: "Item quantity updated in cart",
        cart: formattedCart,
      });
    }

    // Add new item to cart using workflow
    await addToCartWorkflow(req.scope).run({
      input: {
        items: [
          {
            variant_id,
            quantity,
          },
        ],
        cart_id: targetCartId,
      },
    });

    // Fetch updated cart with details
    const updatedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product"],
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


