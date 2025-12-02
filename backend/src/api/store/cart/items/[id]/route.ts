import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { ICartModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId } from "../../helpers";

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
    const { quantity, cart_id } = req.body as { quantity?: number; cart_id?: string };

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
    const targetCartId = cart_id || getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Verify cart exists and item belongs to it
    let cart;
    try {
      // First try with minimal relations to avoid MikroORM issues
      cart = await cartModuleService.retrieveCart(targetCartId);
      
      // Manually fetch items if needed using query
      if (!cart.items) {
        const { data: cartWithItems } = await query.graph({
          entity: "cart",
          fields: ["id", "items.*"],
          filters: { id: targetCartId },
        });
        cart.items = cartWithItems?.[0]?.items || [];
      }
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

    // Update item quantity using workflow
    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id: targetCartId,
        item_id: id,
        update: {
          quantity: quantity,
        },
      },
    });

    // Fetch updated cart using query graph to avoid MikroORM issues
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id", 
        "customer_id", 
        "email", 
        "currency_code", 
        "region_id", 
        "items.*", 
        "items.variant.*", 
        "items.product.*",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "total"
      ],
      filters: { id: targetCartId },
    });

    const updatedCart = carts?.[0];
    if (!updatedCart) {
      throw new Error("Cart not found after update");
    }

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
    const { cart_id } = req.body as { cart_id?: string };

    // Validation
    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Item id is required",
      });
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Verify cart exists and item belongs to it
    let cart;
    try {
      // First try with minimal relations to avoid MikroORM issues
      cart = await cartModuleService.retrieveCart(targetCartId);
      
      // Manually fetch items if needed using query
      if (!cart.items) {
        const { data: cartWithItems } = await query.graph({
          entity: "cart",
          fields: ["id", "items.*"],
          filters: { id: targetCartId },
        });
        cart.items = cartWithItems?.[0]?.items || [];
      }
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
    await cartModuleService.deleteLineItems([id]);

    // Fetch updated cart using query graph to avoid MikroORM issues
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id", 
        "customer_id", 
        "email", 
        "currency_code", 
        "region_id", 
        "items.*", 
        "items.variant.*", 
        "items.product.*",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "total"
      ],
      filters: { id: targetCartId },
    });

    const updatedCart = carts?.[0];
    if (!updatedCart) {
      throw new Error("Cart not found after deletion");
    }

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


