import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { addToCartWorkflow, updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types";
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
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
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

    // Check if user is authenticated and get customer_id
    const authContext = req.session?.auth_context;
    let customerId: string | undefined;

    if (authContext?.auth_identity_id) {
      const customerEmail = authContext.actor_id;
      
      // Try to find customer by email
      if (customerEmail) {
        try {
          const customers = await customerModuleService.listCustomers({
            email: customerEmail
          });
          if (customers && customers.length > 0) {
            customerId = customers[0].id;
          }
        } catch (error) {
          console.error("Error fetching customer:", error);
        }
      }
    }

    // Verify cart exists using simpler retrieval (avoid MikroORM filter issues)
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

      // If user is authenticated and cart doesn't have customer_id, associate it
      if (customerId && !cart.customer_id) {
        cart = await cartModuleService.updateCarts(targetCartId, {
          customer_id: customerId,
        });
      }
    } catch (error) {
      console.error("Error retrieving cart:", error);
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist or is in an invalid state. Try creating a new cart.",
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items?.find(
      (item: any) => item.variant_id === variant_id
    );

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      
      try {
        await updateLineItemInCartWorkflow(req.scope).run({
          input: {
            cart_id: targetCartId,
            item_id: existingItem.id,
            update: {
              quantity: newQuantity,
            },
          },
        });

        // Fetch updated cart using query graph to avoid MikroORM issues
        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["id", "customer_id", "email", "currency_code", "region_id", "items.*"],
          filters: { id: targetCartId },
        });

        const refreshedCart = carts?.[0];
        if (!refreshedCart) {
          throw new Error("Cart not found after update");
        }

        const formattedCart = await formatCartResponse(refreshedCart, query);

        return res.json({
          message: "Item quantity updated in cart",
          cart: formattedCart,
        });
      } catch (error) {
        console.error("Error updating item quantity:", error);
        throw error;
      }
    }

    // Add new item to cart using workflow
    try {
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

      // Fetch updated cart using query graph to avoid MikroORM issues
      const { data: carts } = await query.graph({
        entity: "cart",
        fields: ["id", "customer_id", "email", "currency_code", "region_id", "items.*"],
        filters: { id: targetCartId },
      });

      const updatedCart = carts?.[0];
      if (!updatedCart) {
        throw new Error("Cart not found after adding item");
      }

      const formattedCart = await formatCartResponse(updatedCart, query);

      res.status(201).json({
        message: "Item added to cart successfully",
        cart: formattedCart,
      });
    } catch (workflowError) {
      console.error("Workflow error details:", workflowError);
      
      // Check if it's a pricing issue
      if (workflowError.message?.includes("price")) {
        return res.status(400).json({
          error: "Pricing error",
          message: "Cannot add item: variant price not available for this cart's region. Please update your cart region or add a price for this region.",
          details: workflowError.message,
        });
      }
      
      throw workflowError;
    }
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({
      error: "Failed to add item to cart",
      message: error.message,
    });
  }
}


