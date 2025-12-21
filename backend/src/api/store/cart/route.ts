import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId, getCustomerFromAuth, calculateAndUpdateCartTotals } from "./helpers";

/**
 * GET /store/cart
 * Get or retrieve cart (creates one if doesn't exist)
 * Supports both authenticated and guest users
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    // Check if user is authenticated
    const authContext = req.session?.auth_context;
    let customerId: string | undefined;
    let customerEmail: string | undefined;

    if (authContext?.auth_identity_id) {
      customerEmail = authContext.actor_id;
      
      // Try to find customer by email
      if (customerEmail) {
        const customers = await customerModuleService.listCustomers({
          email: customerEmail
        });
        if (customers && customers.length > 0) {
          customerId = customers[0].id;
        }
      }
    }

    // Try to get cart_id from query params or session
    const cartId = getCartId(req);

    let cart;
    
    if (cartId) {
      // Try to retrieve existing cart
      try {
        cart = await cartModuleService.retrieveCart(cartId, {
          relations: ["items"]
        });

        // If cart exists and customer is authenticated but cart not linked, link it
        if (cart && customerId && !cart.customer_id) {
          await cartModuleService.updateCarts([
            {
              id: cart.id,
              customer_id: customerId,
              email: cart.email || customerEmail,
            },
          ]);

          cart = await cartModuleService.retrieveCart(cart.id, {
            relations: ["items"],
          });
        }
      } catch (error) {
        // Cart not found, will create new one
        cart = null;
      }
    }

    // If no cart found, create a new one
    if (!cart) {
      const defaultCurrency = "ghs";
      const resolvedRegionId = await resolveRegionId(query, undefined, defaultCurrency);

      if (!resolvedRegionId) {
        return res.status(500).json({
          error: "Region not configured",
          message: "No region found. Please configure at least one region in the admin dashboard.",
        });
      }

      cart = await cartModuleService.createCarts({
        ...(customerId && { customer_id: customerId }),
        currency_code: defaultCurrency,
        region_id: resolvedRegionId,
      });

      // Store cart_id in session
      if (req.session) {
        req.session.cart_id = cart.id;
      }
    }

    // Calculate cart totals if cart has items
    if (cart.items && cart.items.length > 0) {
      await calculateAndUpdateCartTotals(cart.id, cartModuleService);
      
      // Retrieve cart again with updated totals
      cart = await cartModuleService.retrieveCart(cart.id, {
        relations: ["items"]
      });
    }

    // Format cart response with product details
    const formattedCart = await formatCartResponse(cart, query);

    res.json({
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({
      error: "Failed to fetch cart",
      message: error.message,
    });
  }
}

/**
 * POST /store/cart
 * Create a new cart
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

    // Check if user is authenticated
    const authContext = req.session?.auth_context;
    let customerId: string | undefined;
    let customerEmail: string | undefined;

    if (authContext?.auth_identity_id) {
      customerEmail = authContext.actor_id;
      
      // Try to find customer by email
      if (customerEmail) {
        const customers = await customerModuleService.listCustomers({
          email: customerEmail
        });
        if (customers && customers.length > 0) {
          customerId = customers[0].id;
        }
      }
    }

    const { currency_code = "ghs", region_id } = req.body as { currency_code?: string; region_id?: string };

    const resolvedRegionId = await resolveRegionId(query, region_id, currency_code);

    if (!resolvedRegionId) {
      return res.status(400).json({
        error: "Region not found",
        message: "Unable to resolve a region for the provided currency. Please provide a valid region_id.",
      });
    }

    // Create new cart
    const cart = await cartModuleService.createCarts({
      ...(customerId && { customer_id: customerId }),
      currency_code,
      region_id: resolvedRegionId,
    });

    // Store cart_id in session
    if (req.session) {
      req.session.cart_id = cart.id;
    }

    // Format cart response
    const formattedCart = await formatCartResponse(cart, query);

    res.status(201).json({
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error creating cart:", error);
    res.status(500).json({
      error: "Failed to create cart",
      message: error.message,
    });
  }
}

/**
 * PATCH /store/cart
 * Update cart properties (region, currency, email, addresses)
 * Supports both authenticated and guest users
 */
export async function PATCH(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const query = req.scope.resolve("query");

    const cartId = getCartId(req);

    if (!cartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Verify cart exists and retrieve with items to preserve them
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Get update data from request body
    const {
      currency_code,
      region_id,
      email,
      shipping_address,
      billing_address,
      items, // Capture items if accidentally sent from frontend
      ...rest // Capture any other fields
    } = req.body as {
      currency_code?: string;
      region_id?: string;
      email?: string;
      shipping_address?: any;
      billing_address?: any;
      items?: any;
      [key: string]: any;
    };

    // Debug logging to understand what's being updated
    console.log("🔍 PATCH /store/cart - Update request:", {
      cartId,
      hasItems: cart.items?.length > 0,
      itemsCount: cart.items?.length || 0,
      updateFields: Object.keys(req.body),
      bodyIncludesItems: items !== undefined,
      itemsValue: items,
      extraFields: Object.keys(rest),
      shippingAddressReceived: shipping_address,
      billingAddressReceived: billing_address,
    });

    // CRITICAL: If frontend accidentally sends items field (e.g., items: []),
    // we should NOT include it in the update as it will clear the cart
    if (items !== undefined) {
      console.warn("⚠️ WARNING: Request body includes 'items' field - this will be ignored to prevent clearing cart");
    }

    // Build update object carefully to preserve items
    const updateData: any = {};

    if (currency_code !== undefined) {
      updateData.currency_code = currency_code;
    }

    if (region_id !== undefined) {
      updateData.region_id = region_id;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    // NOTE: We do NOT update cart addresses via cartModuleService.updateCarts()
    // because Medusa v2 creates empty address records with null fields.
    // Instead, we store addresses in session for later retrieval.
    // The addresses will be passed directly when creating the order.
    
    if (shipping_address || billing_address) {
      console.log("💾 Storing addresses in session (not in cart due to Medusa v2 limitation)");
      
      // Store addresses in session for later use during payment/order creation
      if (req.session) {
        if (shipping_address) {
          req.session.shipping_address = shipping_address;
          console.log("✅ Shipping address saved to session:", {
            hasFirstName: !!shipping_address.first_name,
            hasAddress: !!shipping_address.address_1,
            fields: Object.keys(shipping_address),
          });
        }
        
        if (billing_address) {
          req.session.billing_address = billing_address;
          console.log("✅ Billing address saved to session:", {
            hasFirstName: !!billing_address.first_name,
            hasAddress: !!billing_address.address_1,
            fields: Object.keys(billing_address),
          });
        }
      } else {
        console.warn("⚠️ WARNING: Session not available, addresses cannot be stored");
      }
    }

    // Check if user is authenticated and link customer if needed
    const authContext = req.session?.auth_context;
    if (authContext?.auth_identity_id) {
      const customer = await getCustomerFromAuth(authContext, customerModuleService, authModuleService);
      if (customer && !cart.customer_id) {
        updateData.customer_id = customer.id;
        if (!updateData.email) {
          updateData.email = customer.email;
        }
      }
    }

    // Update cart if there are changes (excluding addresses)
    if (Object.keys(updateData).length > 0) {
      console.log("📝 Updating cart with data:", updateData);
      
      await cartModuleService.updateCarts([
        {
          id: cartId,
          ...updateData,
        },
      ]);
      
      console.log("✅ Cart updated successfully");
    }

    // Fetch updated cart with basic relations only
    // Note: We only need items relation here. Product details are fetched
    // separately by formatCartResponse using Query Graph API to avoid MikroORM issues
    const updatedCart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    });
    
    console.log("🔍 Cart after update - items count:", updatedCart.items?.length || 0);

    // Format cart response
    const formattedCart = await formatCartResponse(updatedCart, query);

    res.json({
      message: "Cart updated successfully",
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error updating cart:", error);
    res.status(500).json({
      error: "Failed to update cart",
      message: error.message,
    });
  }
}

/**
 * DELETE /store/cart
 * Delete/clear cart
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);

    const cartId = getCartId(req);

    if (!cartId) {
      return res.status(404).json({
        error: "Cart not found",
        message: "No cart ID provided",
      });
    }

    // Verify cart exists
    try {
      await cartModuleService.retrieveCart(cartId);
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Delete cart
    await cartModuleService.deleteCarts([cartId]);

    // Clear cart_id from session
    if (req.session) {
      delete req.session.cart_id;
    }

    res.status(200).json({
      message: "Cart deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting cart:", error);
    res.status(500).json({
      error: "Failed to delete cart",
      message: error.message,
    });
  }
}


async function resolveRegionId(
  query: any,
  providedRegionId?: string,
  currencyCode?: string
): Promise<string | null> {
  try {
    if (providedRegionId) {
      return providedRegionId;
    }

    const filters: Record<string, any> = {};
    if (currencyCode) {
      filters.currency_code = currencyCode;
    }

    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "currency_code"],
      ...(Object.keys(filters).length ? { filters } : {}),
      pagination: { take: 1 },
    });

    if (regions && regions.length > 0) {
      return regions[0].id;
    }
  } catch (error) {
    console.error("Error resolving region:", error);
  }

  return null;
}

