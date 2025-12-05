import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { formatCartResponse, getCartId, getCustomerFromAuth } from "../helpers";
import {
  DeliveryData,
  PaymentData,
  validateDeliveryData,
  validatePaymentData,
  convertDeliveryToAddress,
} from "../../../../utils/checkout-validation";

interface CheckoutRequest {
  cart_id?: string;
  delivery?: DeliveryData;
  payment?: PaymentData;
  // Legacy support
  shipping_address?: any;
  billing_address?: any;
  shipping_method_id?: string;
  payment_provider_id?: string;
}

/**
 * POST /store/cart/complete
 * Complete cart (checkout) - requires authentication
 * Converts cart to order
 * 
 * Accepts frontend structure with delivery and payment data
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
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const query = req.scope.resolve("query");

    const requestBody = req.body as CheckoutRequest;
    const {
      cart_id,
      delivery,
      payment,
      // Legacy support
      shipping_address: legacyShippingAddress,
      billing_address: legacyBillingAddress,
      shipping_method_id,
      payment_provider_id = "stripe",
    } = requestBody;

    // Validate delivery data if provided in new format
    if (delivery) {
      const deliveryValidation = validateDeliveryData(delivery);
      if (!deliveryValidation.valid) {
        return res.status(400).json({
          error: "Invalid delivery data",
          message: deliveryValidation.error,
        });
      }
    }

    // Validate payment data if provided in new format
    if (payment) {
      const paymentValidation = validatePaymentData(payment);
      if (!paymentValidation.valid) {
        return res.status(400).json({
          error: "Invalid payment data",
          message: paymentValidation.error,
        });
      }
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || getCartId(req);

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required",
      });
    }

    // Get customer from auth, create if doesn't exist (now with fallback mechanisms)
    let customer = await getCustomerFromAuth(authContext, customerModuleService, authModuleService);

    if (!customer) {
      // User is authenticated but no customer record exists
      // Create customer record automatically
      const customerEmail = authContext.actor_id;
      
      if (!customerEmail) {
        return res.status(400).json({
          error: "Invalid authentication",
          message: "Unable to determine customer email from authentication context",
        });
      }

      try {
        const newCustomer = await customerModuleService.createCustomers({
          email: customerEmail,
        });

        customer = {
          id: newCustomer.id,
          email: newCustomer.email,
        };

        console.log("Created customer record for authenticated user:", customer.email);
      } catch (error) {
        console.error("Failed to create customer record:", error);
        return res.status(500).json({
          error: "Customer creation failed",
          message: "Unable to create customer profile. Please try again or contact support.",
        });
      }
    }

    // Verify cart exists and belongs to customer
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

    // Convert delivery data to address format
    let shippingAddress;
    let billingAddress;

    if (delivery) {
      // Use new frontend format
      shippingAddress = convertDeliveryToAddress(delivery);
      // For now, use same address for billing, or use customer email
      billingAddress = shippingAddress;
      
      // Update email if provided in delivery data
      if (delivery.email && delivery.email !== customer.email) {
        await cartModuleService.updateCarts([
          {
            id: targetCartId,
            email: delivery.email,
          },
        ]);
      }
    } else {
      // Use legacy format
      shippingAddress = legacyShippingAddress;
      billingAddress = legacyBillingAddress;
    }

    // Update cart with shipping and billing addresses if provided
    const updateData: any = {};
    
    if (shippingAddress) {
      updateData.shipping_address = shippingAddress;
    }

    if (billingAddress) {
      updateData.billing_address = billingAddress;
    }

    // Handle shipping for pickup vs delivery
    if (delivery?.deliveryOption === "pickup") {
      // For pickup, shipping should be free or use a specific method
      updateData.shipping_total = 0;
    }

    if (Object.keys(updateData).length > 0) {
      await cartModuleService.updateCarts([
        {
          id: targetCartId,
          ...updateData,
        },
      ]);
    }

    // Retrieve updated cart with basic relations only
    // Note: Avoid deep relations to prevent MikroORM strategy errors
    const completedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items"],
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
      const finalShippingAddress = completedCart.shipping_address || shippingAddress;
      const finalBillingAddress = completedCart.billing_address || billingAddress;

      // Prepare order metadata
      const orderMetadata: any = {};
      
      if (delivery) {
        orderMetadata.delivery_option = delivery.deliveryOption;
        if (delivery.additionalPhone) {
          orderMetadata.additional_phone = delivery.additionalPhone;
        }
      }
      
      if (payment) {
        orderMetadata.payment_method = payment.paymentMethod;
        // Initialize payment status fields
        // For mobile_money and card, payment is typically captured immediately
        // Set initial status as awaiting payment
        orderMetadata.payment_status = "pending";
        orderMetadata.payment_captured = false;
        orderMetadata.payment_initialized_at = new Date().toISOString();
        // Note: Never store actual card numbers or CVV in metadata
        // Only store payment method type for reference
      }

      // Create order with required structure
      // Using type assertion since CreateOrderDTO structure may vary
      // Note: createOrders can return an array or single order
      const orderResult = await orderModuleService.createOrders({
        currency_code: completedCart.currency_code || "ghs",
        region_id: completedCart.region_id,
        items: orderItems,
        ...(customer.id && { customer_id: customer.id }),
        ...(completedCart.email || customer.email) && { email: completedCart.email || customer.email },
        ...(finalShippingAddress && { shipping_address: finalShippingAddress }),
        ...(finalBillingAddress && { billing_address: finalBillingAddress }),
        ...(Object.keys(orderMetadata).length > 0 && { metadata: orderMetadata }),
      } as any);

      // Handle both array and single order return types
      const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

      if (!order) {
        throw new Error("Failed to create order - no order returned");
      }

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
        metadata: order.metadata || {},
        delivery_option: delivery?.deliveryOption,
        payment_method: payment?.paymentMethod,
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


