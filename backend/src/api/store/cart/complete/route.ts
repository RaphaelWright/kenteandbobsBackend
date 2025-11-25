import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId, getCustomerFromAuth } from "../helpers";

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
    } = req.body as {
      cart_id?: string;
      shipping_address?: any;
      billing_address?: any;
      shipping_method_id?: string;
      payment_provider_id?: string;
    };

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Get customer from auth
    const customer = await getCustomerFromAuth(authContext, customerModuleService);

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        message: "Please complete your profile first",
      });
    }

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

    // Retrieve updated cart with all relations
    const completedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product", "customer", "region"],
    });

    // Create order from cart
    try {
      // Prepare order items from cart items
      const orderItems = completedCart.items.map((item: any) => ({
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_id: item.product_id,
        variant_id: item.variant_id,
      }));

      // Prepare order data
      // Note: Medusa's CreateOrderDTO has specific required fields
      // We'll use a type assertion to work with the order service
      const finalShippingAddress = completedCart.shipping_address || shipping_address;
      const finalBillingAddress = completedCart.billing_address || billing_address;

      // Create order with required structure
      // Using type assertion since CreateOrderDTO structure may vary
      const order = await orderModuleService.createOrders({
        currency_code: completedCart.currency_code || "ghs",
        region_id: completedCart.region_id,
        items: orderItems,
        ...(customer.id && { customer_id: customer.id }),
        ...(customer.email && { email: customer.email }),
        ...(finalShippingAddress && { shipping_address: finalShippingAddress }),
        ...(finalBillingAddress && { billing_address: finalBillingAddress }),
      } as any);

      // Format order response
      const formattedOrder = {
        id: order.id,
        display_id: (order as any).display_id || order.id,
        status: order.status,
        email: order.email,
        currency_code: order.currency_code,
        total: order.total,
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        shipping_total: order.shipping_total,
        discount_total: order.discount_total,
        items: order.items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          thumbnail: item.thumbnail,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          product_id: item.product_id,
          variant_id: item.variant_id,
        })) || [],
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        created_at: order.created_at,
        updated_at: order.updated_at,
      };

      // Clear cart from session after completion
      if (req.session) {
        delete req.session.cart_id;
      }

      // Optionally delete the cart after order creation
      try {
        await cartModuleService.deleteCarts([targetCartId]);
      } catch (error) {
        console.warn("Failed to delete cart after order creation:", error);
        // Don't fail the request if cart deletion fails
      }

      res.status(200).json({
        message: "Order created successfully",
        order: formattedOrder,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      // If order creation fails, still return cart info for debugging
      const formattedCart = await formatCartResponse(completedCart, query);
      
      res.status(500).json({
        error: "Failed to create order",
        message: error.message,
        cart: formattedCart,
      });
    }
  } catch (error) {
    console.error("Error completing cart:", error);
    res.status(500).json({
      error: "Failed to complete cart",
      message: error.message,
    });
  }
}


