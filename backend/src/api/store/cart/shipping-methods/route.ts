import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IFulfillmentModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getCartId } from "../helpers";

/**
 * GET /store/cart/shipping-methods
 * Get available shipping methods for the cart's region
 * This is a placeholder endpoint - actual shipping methods depend on your fulfillment provider configuration
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    
    // Get cart_id from request body, query params, or session
    const targetCartId = getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Retrieve cart
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId);
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Check if cart has region
    if (!cart.region_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cart must have a region before fetching shipping methods",
      });
    }

    // Note: In a production environment with proper fulfillment providers configured,
    // you would fetch actual shipping options from the fulfillment module.
    // This is a simplified response for Ghana-based shipping.

    try {
      // Try to get fulfillment options from Medusa's fulfillment module
      // This requires fulfillment providers to be configured in medusa-config.js
      const fulfillmentService: IFulfillmentModuleService | undefined = 
        req.scope.resolve(Modules.FULFILLMENT);

      if (fulfillmentService) {
        // If fulfillment module is available, you can fetch real shipping options
        // const shippingOptions = await fulfillmentService.listShippingOptionsForContext({
        //   region_id: cart.region_id,
        //   currency_code: cart.currency_code,
        // });
        // For now, return mock data
      }
    } catch (error) {
      // Fulfillment module not configured - return default options
      console.log("Fulfillment module not configured, returning default shipping methods");
    }

    // Return default shipping methods for Ghana
    // In production, these should come from your admin configuration
    const shippingMethods = [
      {
        id: "sm_standard",
        name: "Standard Shipping",
        description: "Delivery in 5-7 business days",
        amount: 1000, // 10 GHS
        currency_code: cart.currency_code || "ghs",
      },
      {
        id: "sm_express",
        name: "Express Shipping",
        description: "Delivery in 2-3 business days",
        amount: 2500, // 25 GHS
        currency_code: cart.currency_code || "ghs",
      },
      {
        id: "sm_same_day",
        name: "Same Day Delivery",
        description: "Delivery within 24 hours (Accra only)",
        amount: 5000, // 50 GHS
        currency_code: cart.currency_code || "ghs",
        restrictions: "Available only in Greater Accra Region",
      },
      {
        id: "sm_pickup",
        name: "Store Pickup",
        description: "Pick up from our store in Accra",
        amount: 0, // Free
        currency_code: cart.currency_code || "ghs",
      },
    ];

    res.status(200).json({
      shipping_methods: shippingMethods,
      cart_id: cart.id,
      region_id: cart.region_id,
      note: "Configure fulfillment providers in medusa-config.js for dynamic shipping options",
    });
  } catch (error) {
    console.error("Error fetching shipping methods:", error);
    res.status(500).json({
      error: "Failed to fetch shipping methods",
      message: error.message,
    });
  }
}


























