import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import PaystackService from "../../../../../modules/paystack/service";
import { getCustomerFromAuth, formatCartResponse } from "../../../cart/helpers";

/**
 * GET /store/payments/paystack/verify?reference=xxx
 * Verify a Paystack payment and create order
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Check authentication
    const authContext = req.session?.auth_context;
    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to verify payment",
      });
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const paystackService: PaystackService = req.scope.resolve("paystackService");
    const query = req.scope.resolve("query");

    // Get payment reference
    const reference = req.query.reference as string;
    if (!reference) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Payment reference is required",
      });
    }

    // Verify payment with Paystack
    const verificationResponse = await paystackService.verifyPayment(reference);

    if (!verificationResponse.status) {
      return res.status(400).json({
        error: "Verification failed",
        message: verificationResponse.message || "Payment verification failed",
      });
    }

    const paymentData = verificationResponse.data;

    // Check payment status
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

    // Get customer
    const customer = await getCustomerFromAuth(authContext, customerModuleService);
    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        message: "Please complete your profile first",
      });
    }

    // Get cart from metadata
    const cartId = paymentData.metadata?.cart_id;
    if (!cartId) {
      return res.status(400).json({
        error: "Invalid payment",
        message: "No cart associated with this payment",
      });
    }

    // Retrieve cart
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items", "items.variant", "items.product"],
      });
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The cart associated with this payment no longer exists",
      });
    }

    // Verify amount matches
    if (cart.total !== paymentData.amount) {
      return res.status(400).json({
        error: "Amount mismatch",
        message: `Payment amount (${paymentData.amount}) does not match cart total (${cart.total})`,
      });
    }

    // Create order
    try {
      const orderItems = cart.items.map((item: any) => ({
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        product_id: item.product_id,
        variant_id: item.variant_id,
      }));

      const orderMetadata = {
        payment_provider: "paystack",
        payment_reference: paymentData.reference,
        payment_status: paymentData.status,
        payment_channel: paymentData.channel,
        payment_gateway_response: paymentData.gateway_response,
        authorization_code: paymentData.authorization?.authorization_code,
        card_last4: paymentData.authorization?.last4,
        card_type: paymentData.authorization?.card_type,
        card_bank: paymentData.authorization?.bank,
      };

      const orderResult = await orderModuleService.createOrders({
        currency_code: cart.currency_code || "ghs",
        region_id: cart.region_id,
        items: orderItems,
        customer_id: customer.id,
        email: customer.email,
        shipping_address: cart.shipping_address,
        billing_address: cart.billing_address,
        metadata: orderMetadata,
      } as any);

      const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

      if (!order) {
        throw new Error("Failed to create order");
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
        metadata: order.metadata,
        payment: {
          provider: "paystack",
          reference: paymentData.reference,
          status: paymentData.status,
          channel: paymentData.channel,
          paid_at: paymentData.paid_at,
        },
        created_at: order.created_at,
        updated_at: order.updated_at,
      };

      // Clear cart from session
      if (req.session) {
        delete req.session.cart_id;
        delete req.session.payment_reference;
      }

      // Delete cart
      try {
        await cartModuleService.deleteCarts([cartId]);
      } catch (error) {
        console.warn("Failed to delete cart after order creation:", error);
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
      console.error("Error creating order after payment:", error);
      
      // Payment was successful but order creation failed
      // This needs manual intervention
      res.status(500).json({
        error: "Order creation failed",
        message: "Payment was successful but order creation failed. Please contact support.",
        payment: {
          reference: paymentData.reference,
          amount: paymentData.amount,
          status: paymentData.status,
        },
      });
    }
  } catch (error) {
    console.error("Error verifying Paystack payment:", error);
    res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An error occurred while verifying payment",
    });
  }
}

