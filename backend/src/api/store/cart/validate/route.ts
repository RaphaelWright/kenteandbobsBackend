import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getCartId } from "../helpers";

/**
 * POST /store/cart/validate
 * Validate cart is ready for checkout
 * Returns validation errors if cart cannot proceed to checkout
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    
    // Get cart_id from request body, query params, or session
    const targetCartId = getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        valid: false,
        errors: ["No cart found. Please create a cart first."],
      });
    }

    // Retrieve cart with items
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product"],
      });
    } catch (error) {
      return res.status(404).json({
        valid: false,
        errors: ["Cart not found"],
      });
    }

    // Validation checks
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check if cart has items
    if (!cart.items || cart.items.length === 0) {
      errors.push("Cart is empty. Add items before checkout.");
    }

    // 2. Check if cart has valid region
    if (!cart.region_id) {
      errors.push("Cart region is not set. Please refresh your cart.");
    }

    // 3. Check if cart has valid currency
    if (!cart.currency_code) {
      errors.push("Cart currency is not set. Please refresh your cart.");
    }

    // 4. Check if items have prices
    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        if (!item.unit_price || item.unit_price === 0) {
          errors.push(
            `Item "${item.title}" does not have a valid price. This may indicate a region mismatch.`
          );
        }
      }
    }

    // 5. Check if user is authenticated (warning only - will be required at checkout)
    const authContext = req.session?.auth_context;
    if (!authContext || !authContext.auth_identity_id) {
      warnings.push("You must be logged in to complete checkout.");
    }

    // 6. Check if cart has customer email
    if (!cart.email && cart.customer_id) {
      warnings.push("Customer email is missing.");
    }

    // 7. Check for shipping address (warning only)
    if (!cart.shipping_address) {
      warnings.push("Shipping address not set. You'll need to provide this at checkout.");
    }

    // 8. Check for billing address (warning only)
    if (!cart.billing_address) {
      warnings.push("Billing address not set. You'll need to provide this at checkout.");
    }

    // 9. Calculate cart totals validation
    if (cart.items && cart.items.length > 0) {
      const calculatedSubtotal = cart.items.reduce(
        (sum, item) => sum + (item.unit_price || 0) * (item.quantity || 0),
        0
      );
      
      if (cart.subtotal !== calculatedSubtotal) {
        warnings.push("Cart totals may need recalculation. Please refresh your cart.");
      }
    }

    // Determine if cart is valid
    const isValid = errors.length === 0;

    // Build response
    const response: any = {
      valid: isValid,
      cart_id: cart.id,
      item_count: cart.items?.length || 0,
      total_items: cart.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0,
      subtotal: cart.subtotal,
      total: cart.total,
      currency_code: cart.currency_code,
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    if (warnings.length > 0) {
      response.warnings = warnings;
    }

    if (isValid) {
      response.message = "Cart is ready for checkout";
    } else {
      response.message = "Cart validation failed. Please fix the errors before proceeding.";
    }

    res.status(isValid ? 200 : 400).json(response);
  } catch (error) {
    console.error("Error validating cart:", error);
    res.status(500).json({
      valid: false,
      errors: ["Failed to validate cart"],
      message: error.message,
    });
  }
}









