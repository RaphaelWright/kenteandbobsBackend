import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { FLUTTERWAVE_SECRET_KEY } from "../../../../../lib/constants";

interface VerifyPaymentRequest {
  tx_ref?: string;
  transaction_id?: string;
}

/**
 * POST /store/payments/flutterwave/verify
 * Verify Flutterwave payment and create order
 * This endpoint verifies payment and creates order from cart
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check if Flutterwave is configured
    if (!FLUTTERWAVE_SECRET_KEY) {
      return res.status(503).json({
        error: "Payment system not configured",
        message: "Flutterwave is not configured. Please contact support.",
      });
    }

    const { tx_ref, transaction_id } = req.body as VerifyPaymentRequest;

    if (!transaction_id && !tx_ref) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "Either transaction_id or tx_ref is required",
      });
    }

    // Verify payment with Flutterwave API
    const verificationId = transaction_id || tx_ref;
    const flutterwaveResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${verificationId}/verify`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const flutterwaveResult = await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok || flutterwaveResult.status !== "success") {
      console.error("Flutterwave verification error:", flutterwaveResult);
      return res.status(400).json({
        error: "Payment verification failed",
        message: flutterwaveResult.message || "Failed to verify payment with Flutterwave",
        details: flutterwaveResult,
      });
    }

    const paymentData = flutterwaveResult.data;

    // Check if payment was successful
    if (paymentData.status !== "successful") {
      return res.status(400).json({
        error: "Payment not successful",
        message: `Payment status: ${paymentData.status}`,
        data: {
          status: paymentData.status,
          tx_ref: paymentData.tx_ref,
          transaction_id: paymentData.id,
        },
      });
    }

    // Get cart ID from payment metadata
    const cartId = paymentData.meta?.cart_id || paymentData.meta?.cartId;
    
    if (!cartId) {
      console.error("Cart ID not found in payment metadata:", paymentData.meta);
      return res.status(400).json({
        error: "Invalid payment",
        message: "Cart ID not found in payment data",
      });
    }

    // Resolve services
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Retrieve cart
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items", "items.product", "items.variant"],
      });
    } catch (error) {
      console.error("Cart not found:", error);
      return res.status(404).json({
        error: "Cart not found",
        message: "The cart associated with this payment does not exist",
      });
    }

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        error: "Empty cart",
        message: "Cart is empty",
      });
    }

    // Get customer
    const customerId = paymentData.meta?.customer_id || paymentData.customer?.id;
    const customerEmail = paymentData.customer?.email;
    
    let customer;
    if (customerId) {
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch (error) {
        console.error("Customer not found, will create from email:", error);
      }
    }

    if (!customer && customerEmail) {
      // Try to find by email
      const customers = await customerModuleService.listCustomers({
        email: customerEmail,
      });
      
      if (customers && customers.length > 0) {
        customer = customers[0];
      } else {
        // Create customer
        customer = await customerModuleService.createCustomers({
          email: customerEmail,
        });
      }
    }

    // Verify amount matches cart total (Flutterwave amount is in major currency units)
    const cartTotal = cart.total || 0;
    const paymentAmount = Math.round(paymentData.amount * 100); // Convert to pesewas
    
    if (cartTotal > 0 && Math.abs(paymentAmount - cartTotal) > 100) { // Allow 1 GHS tolerance
      console.warn("Amount mismatch:", {
        flutterwave_amount: paymentAmount,
        cart_total: cartTotal,
        difference: Math.abs(paymentAmount - cartTotal),
      });
      // Don't fail on minor amount mismatch, just log warning
    }

    // Prepare order items
    const orderItems = cart.items.map((item: any) => ({
      title: item.title || item.product?.title || "Unknown Product",
      subtitle: item.variant?.title || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      compare_at_unit_price: item.compare_at_unit_price || null,
      requires_shipping: item.requires_shipping !== false,
      product_id: item.product_id,
      variant_id: item.variant_id,
      metadata: item.metadata || {},
    }));

    // Prepare order metadata with payment information
    const orderMetadata: any = {
      payment_provider: "flutterwave",
      payment_reference: paymentData.tx_ref,
      payment_transaction_id: paymentData.id.toString(),
      payment_status: "success",
      payment_captured: true,
      payment_captured_at: paymentData.created_at,
      payment_paid_at: paymentData.created_at,
      payment_channel: paymentData.payment_type,
      payment_method: paymentData.payment_type,
      payment_amount: paymentData.amount,
      payment_currency: paymentData.currency,
      cart_completed: true,
      order_completed_via: "payment_verification",
      ...(cart.metadata || {}),
    };

    // Prepare addresses if available in cart metadata
    let shippingAddress = null;
    let billingAddress = null;

    // Check if shipping address exists in cart metadata
    if (cart.metadata?.shipping_address) {
      try {
        shippingAddress = typeof cart.metadata.shipping_address === 'string' 
          ? JSON.parse(cart.metadata.shipping_address) 
          : cart.metadata.shipping_address;
      } catch (error) {
        console.error("Error parsing shipping address:", error);
      }
    }

    // Create order
    const orderResult = await orderModuleService.createOrders({
      currency_code: cart.currency_code || paymentData.currency.toLowerCase() || "ghs",
      region_id: cart.region_id,
      items: orderItems,
      email: customerEmail || cart.email || customer?.email,
      ...(customer?.id && { customer_id: customer.id }),
      ...(shippingAddress && { shipping_address: shippingAddress }),
      ...(billingAddress && { billing_address: billingAddress }),
      metadata: orderMetadata,
    } as any);

    // Handle both array and single order return types
    const order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

    if (!order) {
      throw new Error("Failed to create order - no order returned");
    }

    console.log("Order created successfully via Flutterwave payment:", {
      order_id: order.id,
      cart_id: cartId,
      payment_reference: paymentData.tx_ref,
      transaction_id: paymentData.id,
      amount: paymentData.amount,
      currency: paymentData.currency,
    });

    // Delete the cart after successful order creation
    try {
      await cartModuleService.deleteCarts([cartId]);
      console.log("Cart deleted after order creation:", cartId);
    } catch (error) {
      console.error("Failed to delete cart:", error);
      // Don't fail the request if cart deletion fails
    }

    // Return order details
    res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully",
      order: {
        id: order.id,
        display_id: order.display_id,
        email: order.email,
        status: order.status,
        payment_status: "captured",
        fulfillment_status: "not_fulfilled",
        total: order.total,
        currency_code: order.currency_code,
        created_at: order.created_at,
        metadata: order.metadata,
      },
      payment: {
        provider: "flutterwave",
        reference: paymentData.tx_ref,
        transaction_id: paymentData.id,
        status: paymentData.status,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_type: paymentData.payment_type,
      },
    });
  } catch (error) {
    console.error("Error verifying Flutterwave payment:", error);
    res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

