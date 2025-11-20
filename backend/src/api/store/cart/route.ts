import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

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
    const cartId = (req.query.cart_id as string) || req.session?.cart_id;

    let cart;
    
    if (cartId) {
      // Try to retrieve existing cart
      try {
        cart = await cartModuleService.retrieveCart(cartId, {
          relations: ["items", "items.variant", "items.product", "customer", "region", "region.currency"]
        });
      } catch (error) {
        // Cart not found, will create new one
        cart = null;
      }
    }

    // If no cart found, create a new one
    if (!cart) {
      cart = await cartModuleService.createCarts({
        ...(customerId && { customer_id: customerId }),
        currency_code: "ghs", // Default currency
      });

      // Store cart_id in session
      if (req.session) {
        req.session.cart_id = cart.id;
      }
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

    // Create new cart
    const cart = await cartModuleService.createCarts({
      ...(customerId && { customer_id: customerId }),
      currency_code,
      ...(region_id && { region_id }),
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
 * DELETE /store/cart
 * Delete/clear cart
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);

    const cartId = req.query.cart_id as string || req.session?.cart_id;

    if (!cartId) {
      return res.status(404).json({
        error: "Cart not found",
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

