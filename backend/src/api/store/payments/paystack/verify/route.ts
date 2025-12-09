import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService, IOrderModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { getCartId, getCustomerFromAuth } from "../../../cart/helpers";
import { PAYSTACK_SECRET_KEY } from "../../../../../lib/constants";
import { createPaystackPaymentCollectionWorkflow } from "workflows/payment";

/**
 * GET /store/payments/paystack/verify?reference=xxx
 * Verify Paystack payment and create order
 * Requires authentication
 * 
 * IMPORTANT: This endpoint creates a complete order (just like cart/complete does).
 * This is the "payment-first" flow where payment verification triggers order creation.
 * The cart is marked as completed, deleted, and the order is created with payment
 * already captured.
 * 
 * See ORDER_COMPLETION_FLOWS.md for detailed documentation about how this flow
 * compares to the traditional cart/complete flow.
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check if Paystack is configured
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({
        error: "Payment system not configured",
        message: "Paystack is not configured. Please contact support.",
      });
    }

    // Check authentication
    const authContext = req.session?.auth_context;
    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to verify payment",
      });
    }

    // Get payment reference from query params
    const reference = req.query.reference as string;
    if (!reference) {
      return res.status(400).json({
        error: "Missing reference",
        message: "Payment reference is required",
      });
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    // Get customer (with fallback mechanisms and auto-create)
    const customer = await getCustomerFromAuth(authContext, customerModuleService, authModuleService);
    if (!customer) {
      return res.status(400).json({
        error: "Customer not found",
        message: "Unable to find or create customer profile. Please log out and log in again.",
      });
    }

    // Verify payment with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackResult.status) {
      console.error("Paystack verification error:", paystackResult);
      return res.status(400).json({
        error: "Payment verification failed",
        message: paystackResult.message || "Failed to verify payment with Paystack",
        details: paystackResult,
      });
    }

    const paymentData = paystackResult.data;

    // Check if payment was successful
    if (paymentData.status !== "success") {
      return res.status(400).json({
        error: "Payment not successful",
        message: `Payment status: ${paymentData.status}`,
        data: {
          status: paymentData.status,
          reference: paymentData.reference,
          gateway_response: paymentData.gateway_response,
        },
      });
    }

    // Get cart from metadata or session
    const cartId = paymentData.metadata?.cart_id || getCartId(req);
    if (!cartId) {
      return res.status(400).json({
        error: "No cart found",
        message: "Unable to find cart associated with payment",
      });
    }

    // Retrieve cart
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The cart associated with this payment no longer exists",
      });
    }

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        error: "Empty cart",
        message: "Cart is empty",
      });
    }

    // Calculate cart total for verification
    let cartTotal = cart.items.reduce((total: number, item: any) => {
      return total + (item.unit_price * item.quantity);
    }, 0);

    // TEMPORARY FIX: Handle case where database has prices in cedis format
    // If cart total seems suspiciously low (< 10000), it's likely in cedis - convert to pesewas
    const likelyInCedis = cartTotal > 0 && cartTotal < 10000 && cart.currency_code?.toLowerCase() === 'ghs';
    
    if (likelyInCedis) {
      console.warn("⚠️ Cart total appears to be in cedis format, converting to pesewas for verification");
      cartTotal = cartTotal * 100;
    }

    // Verify amount matches
    if (paymentData.amount !== cartTotal) {
      console.error("Amount mismatch:", {
        paystack_amount: paymentData.amount,
        cart_total_original: cart.items.reduce((total: number, item: any) => {
          return total + (item.unit_price * item.quantity);
        }, 0),
        cart_total_converted: cartTotal,
        conversion_applied: likelyInCedis,
      });
      return res.status(400).json({
        error: "Amount mismatch",
        message: "Payment amount does not match cart total",
        details: {
          paid_amount: paymentData.amount,
          cart_total: cartTotal,
          conversion_applied: likelyInCedis,
        },
      });
    }

    console.log("✅ Payment amount verified:", {
      paystack_amount: paymentData.amount,
      cart_total: cartTotal,
      conversion_applied: likelyInCedis,
    });

    // Verify customer email matches
    if (paymentData.customer?.email !== customer.email) {
      console.warn("Customer email mismatch:", {
        payment_email: paymentData.customer?.email,
        customer_email: customer.email,
      });
    }

    // Create order from cart
    try {
      // Prepare order items from cart items
      const orderItems = cart.items.map((item: any) => ({
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_id: item.product_id,
        variant_id: item.variant_id,
      }));

      // Prepare order metadata with payment info
      // IMPORTANT: Payment is already verified at this point, so we mark it as captured immediately
      const orderMetadata: any = {
        // Order completion tracking
        order_completed_via: "payment_verification",
        order_completed_at: new Date().toISOString(),
        cart_completed: true,
        
        // Payment details - ALREADY CAPTURED since we verified with Paystack
        payment_provider: "paystack",
        payment_reference: paymentData.reference,
        payment_status: "success", // Explicitly set to "success"
        payment_captured: true, // Mark as captured immediately
        payment_captured_at: new Date().toISOString(), // Set capture timestamp
        payment_channel: paymentData.channel,
        payment_paid_at: paymentData.paid_at,
        payment_transaction_id: paymentData.id,
        payment_gateway_response: paymentData.gateway_response,
        payment_authorization_code: paymentData.authorization?.authorization_code,
        payment_card_type: paymentData.authorization?.card_type,
        payment_last4: paymentData.authorization?.last4,
        payment_bank: paymentData.authorization?.bank,
        
        // Delivery/payment metadata from cart if available
        ...(cart.metadata?.delivery_option && { delivery_option: cart.metadata.delivery_option }),
        ...(cart.metadata?.additional_phone && { additional_phone: cart.metadata.additional_phone }),
        ...(cart.metadata?.payment_method && { payment_method: cart.metadata.payment_method }),
      };

      // Create order
      const orderResult = await orderModuleService.createOrders({
        currency_code: cart.currency_code || "ghs",
        region_id: cart.region_id,
        items: orderItems,
        customer_id: customer.id,
        email: cart.email || customer.email,
        ...(cart.shipping_address && { shipping_address: cart.shipping_address }),
        ...(cart.billing_address && { billing_address: cart.billing_address }),
        metadata: orderMetadata,
      } as any);

      // Handle both array and single order return types
      const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

      if (!order) {
        throw new Error("Failed to create order - no order returned");
      }

      // Create payment collection using workflow
      try {
        const { result: workflowResult } = await createPaystackPaymentCollectionWorkflow(req.scope)
          .run({
            input: {
              order_id: order.id,
              amount: cartTotal,
              currency_code: cart.currency_code || "ghs",
              region_id: cart.region_id,
              payment_data: {
                reference: paymentData.reference,
                transaction_id: paymentData.id,
                channel: paymentData.channel,
                paid_at: paymentData.paid_at,
                gateway_response: paymentData.gateway_response,
                authorization: paymentData.authorization,
              },
            },
          });

        console.log("✅ Payment collection created via workflow:", {
          payment_collection_id: workflowResult.payment_collection.id,
          payment_session_id: workflowResult.payment_session.id,
          order_id: order.id,
        });
      } catch (workflowError) {
        console.error("⚠️ Failed to create payment collection (order still created):", workflowError);
        // Don't fail the entire request - order is already created
        // Payment info is still in metadata as fallback
      }

      // Log successful order creation with payment captured
      console.log("✅ Order completed via payment verification:", {
        order_id: order.id,
        display_id: (order as any).display_id || order.id,
        cart_id: cartId,
        cart_completed: true,
        payment_captured: true,
        payment_status: "success",
        payment_reference: paymentData.reference,
        completion_method: "payment_verification",
      });

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
        created_at: order.created_at,
        updated_at: order.updated_at,
      };

      // Clear cart from session after successful order creation
      if (req.session) {
        delete req.session.cart_id;
        delete req.session.payment_reference;
      }

      // Delete the cart after order creation
      try {
        await cartModuleService.deleteCarts([cartId]);
        console.log("✅ Cart deleted after payment verification:", {
          cart_id: cartId,
          order_id: order.id,
        });
      } catch (error) {
        console.warn("Failed to delete cart after order creation:", error);
        // Don't fail the request if cart deletion fails
      }

      res.status(200).json({
        success: true,
        message: "Payment verified and order created successfully",
        order: formattedOrder,
        payment: {
          reference: paymentData.reference,
          amount: paymentData.amount,
          currency: paymentData.currency,
          status: paymentData.status,
          channel: paymentData.channel,
          paid_at: paymentData.paid_at,
          gateway_response: paymentData.gateway_response,
        },
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({
        error: "Failed to create order",
        message: error.message || "Order creation failed after payment verification",
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

