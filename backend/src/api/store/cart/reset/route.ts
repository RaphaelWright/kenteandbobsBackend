import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId, getCustomerFromAuth } from "../helpers";

/**
 * POST /store/cart/reset
 * Delete old cart and create a fresh one
 * Useful when cart is in corrupted/invalid state
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    // Get old cart ID
    const oldCartId = getCartId(req);

    // Try to delete old cart if it exists
    if (oldCartId) {
      try {
        await cartModuleService.deleteCarts([oldCartId]);
        console.log(`Deleted old cart: ${oldCartId}`);
      } catch (error) {
        console.log("Could not delete old cart (might not exist):", error.message);
      }
    }

    // Check if user is authenticated
    const authContext = req.session?.auth_context;
    let customerId: string | undefined;
    let customerEmail: string | undefined;

    if (authContext?.auth_identity_id) {
      const customer = await getCustomerFromAuth(authContext, customerModuleService);
      if (customer) {
        customerId = customer.id;
        customerEmail = customer.email;
      }
    }

    // Get region and currency from request or use defaults
    const { currency_code = "ghs", region_id } = req.body as { currency_code?: string; region_id?: string };

    // Resolve region
    let resolvedRegionId = region_id;
    if (!resolvedRegionId) {
      const { data: regions } = await query.graph({
        entity: "region",
        fields: ["id", "currency_code", "name"],
        filters: { currency_code },
        pagination: { take: 1 },
      });

      if (regions && regions.length > 0) {
        resolvedRegionId = regions[0].id;
        console.log(`Auto-resolved region: ${regions[0].name} (${resolvedRegionId})`);
      }
    }

    if (!resolvedRegionId) {
      return res.status(400).json({
        error: "Region not found",
        message: "Unable to resolve a region. Please provide a valid region_id or ensure regions are configured.",
      });
    }

    // Create fresh cart
    const newCart = await cartModuleService.createCarts({
      ...(customerId && { customer_id: customerId }),
      ...(customerEmail && { email: customerEmail }),
      currency_code,
      region_id: resolvedRegionId,
    });

    console.log(`Created new cart: ${newCart.id} with region ${resolvedRegionId}`);

    // Update session with new cart ID
    if (req.session) {
      req.session.cart_id = newCart.id;
    }

    // Format response
    const formattedCart = await formatCartResponse(newCart, query);

    res.status(201).json({
      message: "Cart reset successfully",
      cart: formattedCart,
      previous_cart_id: oldCartId,
    });
  } catch (error) {
    console.error("Error resetting cart:", error);
    res.status(500).json({
      error: "Failed to reset cart",
      message: error.message,
    });
  }
}

