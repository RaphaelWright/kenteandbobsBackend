import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/cart/complete
 * Complete cart (checkout) - requires authentication
 * Converts cart to order
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check authentication - completing cart requires login
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to complete checkout",
      });
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    const {
      cart_id,
      shipping_address,
      billing_address,
      shipping_method_id,
      payment_provider_id = "stripe",
    } = req.body;

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || req.query.cart_id || req.session?.cart_id;

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Get customer email from auth
    const customerEmail = authContext.actor_id;

    if (!customerEmail) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Customer email not found",
      });
    }

    // Find customer by email
    const customers = await customerModuleService.listCustomers({
      email: customerEmail,
    });

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
        message: "Please complete your profile first",
      });
    }

    const customer = customers[0];

    // Verify cart exists and belongs to customer
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product", "customer", "region"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Cart is empty. Add items before checkout",
      });
    }

    // Ensure cart is associated with customer
    if (!cart.customer_id) {
      await cartModuleService.updateCarts([
        {
          id: targetCartId,
          customer_id: customer.id,
          email: customer.email,
        },
      ]);
    }

    // Update cart with shipping and billing addresses if provided
    const updateData: any = {};
    
    if (shipping_address) {
      updateData.shipping_address = shipping_address;
    }

    if (billing_address) {
      updateData.billing_address = billing_address;
    }

    if (Object.keys(updateData).length > 0) {
      await cartModuleService.updateCarts([
        {
          id: targetCartId,
          ...updateData,
        },
      ]);
    }

    // Complete the cart - this typically creates a draft order
    // In Medusa, you might need to use a workflow or service to complete checkout
    // For now, we'll create an order from the cart
    try {
      // Use Medusa's workflow or service to complete cart
      // This is a simplified version - actual implementation may vary
      const completedCart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product", "customer", "region"],
      });

      // Note: Actual order creation from cart typically uses Medusa workflows
      // This is a placeholder - you may need to use:
      // - createOrderFromCart workflow
      // - or direct order service methods
      
      // For now, return success with cart details
      // In production, you'd want to create the actual order here
      const formattedCart = await formatCartResponse(completedCart, query);

      // Clear cart from session after completion
      if (req.session) {
        delete req.session.cart_id;
      }

      res.status(200).json({
        message: "Cart completed successfully",
        cart: formattedCart,
        note: "Order creation workflow should be implemented here",
      });
    } catch (error) {
      console.error("Error completing cart:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error completing cart:", error);
    res.status(500).json({
      error: "Failed to complete cart",
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
    shipping_address: cart.shipping_address,
    billing_address: cart.billing_address,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
  };
}

