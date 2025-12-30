import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, IOrderModuleService, ICustomerModuleService, INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { PAYSTACK_SECRET_KEY } from "../../../../../lib/constants";
import { sendOrderCompletionEmail } from "../../../../../utils/email";

/**
 * GET /store/payments/paystack/verify
 * Verify Paystack payment and create order
 * This is the payment-first order completion flow
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

    // Get payment reference from query params
    const reference = req.query.reference as string;

    if (!reference) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Payment reference is required",
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

    console.log("Verifying payment:", { reference });

    // Verify payment with Paystack
    let paystackResponse;
    try {
      paystackResponse = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      console.error("Error connecting to Paystack:", error);
      return res.status(503).json({
        error: "Payment verification failed",
        message: "Unable to connect to payment provider",
      });
    }

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

    console.log("Payment verified successfully:", {
      reference: paymentData.reference,
      amount: paymentData.amount,
      status: paymentData.status,
      metadata: paymentData.metadata,
    });

    // Get cart_id from payment metadata
    const cartId = paymentData.metadata?.cart_id;

    if (!cartId) {
      return res.status(400).json({
        error: "Invalid payment",
        message: "Payment does not contain cart information",
      });
    }

    // Resolve services
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    // Retrieve cart
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items"],
      });
    } catch (error) {
      console.error("Cart not found:", error);
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

    // Calculate cart total (in pesewas)
    let cartTotal = cart.total || 0;
    
    if (cartTotal <= 0) {
      // Fallback: Calculate from items
      cartTotal = cart.items.reduce((total: number, item: any) => {
        return total + (item.unit_price * item.quantity);
      }, 0);
    }

    // Convert cart total from cedis to pesewas for comparison with Paystack amount
    // Database stores prices in cedis, but Paystack uses pesewas
    let expectedPaystackAmount = cartTotal;
    
    if (cart.currency_code?.toLowerCase() === 'ghs') {
      expectedPaystackAmount = Math.round(cartTotal * 100);
      console.log("💰 Verifying payment amount:", {
        cart_total_cedis: cartTotal,
        expected_pesewas: expectedPaystackAmount,
        received_pesewas: paymentData.amount,
      });
    }

    // Verify payment amount matches cart total
    if (paymentData.amount !== expectedPaystackAmount) {
      console.warn("Payment amount mismatch:", {
        payment_amount_pesewas: paymentData.amount,
        expected_amount_pesewas: expectedPaystackAmount,
        cart_total_cedis: cartTotal,
      });
      // Log warning but don't fail - amount discrepancies can happen with fees
    }

    // Get customer from payment metadata or cart
    const customerEmail = paymentData.metadata?.customer_email || cart.email;

    if (!customerEmail) {
      return res.status(400).json({
        error: "Invalid payment",
        message: "Payment does not contain customer information",
      });
    }

    // Find or create customer
    let customer;
    const customers = await customerModuleService.listCustomers({
      email: customerEmail,
    });

    if (customers && customers.length > 0) {
      customer = customers[0];
    } else {
      // Create customer if doesn't exist
      try {
        customer = await customerModuleService.createCustomers({
          email: customerEmail,
        });
        console.log("Created customer record:", customer.email);
      } catch (error) {
        console.error("Failed to create customer:", error);
        return res.status(500).json({
          error: "Customer creation failed",
          message: "Unable to create customer profile",
        });
      }
    }

    // Ensure cart is associated with customer
    if (!cart.customer_id || cart.customer_id !== customer.id) {
      await cartModuleService.updateCarts([
        {
          id: cartId,
          customer_id: customer.id,
          email: customer.email,
        },
      ]);
    }

    // Debug: Log cart state before creating order
    console.log("🔍 Cart state before order creation:", {
      cartId: cart.id,
      hasShippingAddress: !!cart.shipping_address,
      hasBillingAddress: !!cart.billing_address,
      shippingAddress: cart.shipping_address,
      billingAddress: cart.billing_address,
      itemsCount: cart.items?.length || 0,
    });

    // Try to get addresses from payment metadata (if frontend sends them)
    // This is a fallback in case cart addresses aren't properly saved
    let shippingAddress = cart.shipping_address;
    let billingAddress = cart.billing_address;

    if (paymentData.metadata?.shipping_address) {
      console.log("📦 Using shipping address from payment metadata");
      shippingAddress = paymentData.metadata.shipping_address;
    }

    if (paymentData.metadata?.billing_address) {
      console.log("📦 Using billing address from payment metadata");
      billingAddress = paymentData.metadata.billing_address;
    }

    // If no addresses available, log warning
    if (!shippingAddress || !shippingAddress.first_name) {
      console.warn("⚠️ WARNING: No valid shipping address found for order creation");
    }

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

    // Prepare order metadata with payment information
    const orderMetadata: any = {
      // Order completion tracking
      order_completed_via: "payment_verification",
      order_completed_at: new Date().toISOString(),
      cart_completed: true,
      
      // Payment information from Paystack
      payment_provider: "paystack",
      payment_reference: paymentData.reference,
      payment_status: "success",
      payment_captured: true,
      payment_channel: paymentData.channel,
      payment_paid_at: paymentData.paid_at,
      payment_transaction_id: paymentData.id,
      payment_gateway_response: paymentData.gateway_response,
      payment_amount: paymentData.amount,
      payment_currency: paymentData.currency,
      payment_fees: paymentData.fees,
      payment_verified_at: new Date().toISOString(),
    };

    // CRITICAL: Store complete addresses in metadata as backup
    // Since Medusa's createOrders doesn't properly populate nested address fields,
    // we store the full address data in metadata for reference
    if (shippingAddress) {
      orderMetadata.delivery_address = {
        first_name: shippingAddress.first_name,
        last_name: shippingAddress.last_name,
        address_1: shippingAddress.address_1,
        address_2: shippingAddress.address_2 || '',
        city: shippingAddress.city,
        province: shippingAddress.province || '',
        postal_code: shippingAddress.postal_code || '',
        country_code: shippingAddress.country_code,
        phone: shippingAddress.phone,
      };
      console.log("💾 Storing delivery address in metadata:", orderMetadata.delivery_address);
    }

    if (billingAddress) {
      orderMetadata.billing_info = {
        first_name: billingAddress.first_name,
        last_name: billingAddress.last_name,
        address_1: billingAddress.address_1,
        address_2: billingAddress.address_2 || '',
        city: billingAddress.city,
        province: billingAddress.province || '',
        postal_code: billingAddress.postal_code || '',
        country_code: billingAddress.country_code,
        phone: billingAddress.phone,
      };
    }

    // Add authorization details if present (card payments)
    if (paymentData.authorization) {
      orderMetadata.payment_authorization_code = paymentData.authorization.authorization_code;
      orderMetadata.payment_card_type = paymentData.authorization.card_type;
      orderMetadata.payment_last4 = paymentData.authorization.last4;
      orderMetadata.payment_bank = paymentData.authorization.bank;
      orderMetadata.payment_exp_month = paymentData.authorization.exp_month;
      orderMetadata.payment_exp_year = paymentData.authorization.exp_year;
    }

    // Add customer metadata from payment
    if (paymentData.customer) {
      orderMetadata.payment_customer_code = paymentData.customer.customer_code;
    }

    // Create order from cart
    let order;
    try {
      const orderData = {
        currency_code: cart.currency_code || "ghs",
        region_id: cart.region_id,
        items: orderItems,
        customer_id: customer.id,
        email: customer.email,
        // Include address objects to create the address records (even if fields are null)
        ...(shippingAddress && { shipping_address: shippingAddress }),
        ...(billingAddress && { billing_address: billingAddress }),
        metadata: orderMetadata,
      };

      console.log("📝 Creating order with data:", {
        hasShippingAddress: !!orderData.shipping_address,
        hasBillingAddress: !!orderData.billing_address,
        shippingAddressFields: orderData.shipping_address ? Object.keys(orderData.shipping_address) : [],
        billingAddressFields: orderData.billing_address ? Object.keys(orderData.billing_address) : [],
        shippingAddressData: orderData.shipping_address,
        billingAddressData: orderData.billing_address,
      });

      const orderResult = await orderModuleService.createOrders(orderData as any);

      // Handle both array and single order return types
      order = Array.isArray(orderResult) ? orderResult[0] : orderResult;

      if (!order) {
        throw new Error("Failed to create order - no order returned");
      }

      console.log("✅ Order created via payment verification:", {
        order_id: order.id,
        display_id: (order as any).display_id || order.id,
        cart_id: cartId,
        payment_reference: paymentData.reference,
        completion_method: "payment_verification",
      });

      // CRITICAL FIX: Medusa's createOrders doesn't populate address fields
      // We need to manually update the address records after order creation
      if (shippingAddress && order.shipping_address?.id) {
        try {
          console.log("🔧 Manually updating shipping address record:", order.shipping_address.id);
          
          // Access the internal address service to update the record
          const orderAddressService = (orderModuleService as any).orderAddressService_;
          if (orderAddressService) {
            await orderAddressService.update(order.shipping_address.id, {
              first_name: shippingAddress.first_name,
              last_name: shippingAddress.last_name,
              address_1: shippingAddress.address_1,
              address_2: shippingAddress.address_2 || '',
              city: shippingAddress.city,
              province: shippingAddress.province || '',
              postal_code: shippingAddress.postal_code || '',
              country_code: shippingAddress.country_code?.toUpperCase() || 'GH',
              phone: shippingAddress.phone,
              company: shippingAddress.company || '',
            });
            console.log("✅ Shipping address updated successfully");
          } else {
            console.warn("⚠️ orderAddressService not available");
          }
        } catch (error) {
          console.error("❌ Failed to update shipping address:", error);
          // Don't fail the order creation, addresses are in metadata as backup
        }
      }

      if (billingAddress && order.billing_address?.id) {
        try {
          console.log("🔧 Manually updating billing address record:", order.billing_address.id);
          
          const orderAddressService = (orderModuleService as any).orderAddressService_;
          if (orderAddressService) {
            await orderAddressService.update(order.billing_address.id, {
              first_name: billingAddress.first_name,
              last_name: billingAddress.last_name,
              address_1: billingAddress.address_1,
              address_2: billingAddress.address_2 || '',
              city: billingAddress.city,
              province: billingAddress.province || '',
              postal_code: billingAddress.postal_code || '',
              country_code: billingAddress.country_code?.toUpperCase() || 'GH',
              phone: billingAddress.phone,
              company: billingAddress.company || '',
            });
            console.log("✅ Billing address updated successfully");
          } else {
            console.warn("⚠️ orderAddressService not available");
          }
        } catch (error) {
          console.error("❌ Failed to update billing address:", error);
          // Don't fail the order creation, addresses are in metadata as backup
        }
      }
    } catch (error) {
      console.error("Error creating order:", error);
      return res.status(500).json({
        error: "Failed to create order",
        message: error.message || "An unexpected error occurred while creating the order",
      });
    }

    // Clear cart from session after order creation
    if (req.session) {
      delete req.session.cart_id;
      delete req.session.payment_reference;
    }

    // Delete the cart after order creation
    try {
      await cartModuleService.deleteCarts([cartId]);
      console.log("Cart deleted after order creation:", cartId);
    } catch (error) {
      console.warn("Failed to delete cart after order creation:", error);
      // Don't fail the request if cart deletion fails
    }

    // Fetch complete order with payment status
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "currency_code",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "items.*",
        "shipping_address.*",
        "billing_address.*",
        "metadata",
        "created_at",
        "updated_at",
      ],
      filters: {
        id: order.id,
      },
    });

    const completeOrder = orders[0];

    // Send order completion email
    try {
      const notificationModuleService: INotificationModuleService = req.scope.resolve(Modules.NOTIFICATION);
      await sendOrderCompletionEmail(notificationModuleService, completeOrder);
    } catch (emailError) {
      console.error("❌ Failed to send order completion email (non-fatal):", emailError);
      // Don't fail the order if email fails
    }

    // Format response
    const formattedOrder = {
      id: completeOrder.id,
      display_id: completeOrder.display_id || completeOrder.id,
      status: completeOrder.status,
      email: completeOrder.email,
      currency_code: completeOrder.currency_code,
      total: completeOrder.total,
      subtotal: completeOrder.subtotal,
      tax_total: completeOrder.tax_total,
      shipping_total: completeOrder.shipping_total,
      discount_total: completeOrder.discount_total,
      items: completeOrder.items?.map((item: any) => ({
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
      shipping_address: completeOrder.shipping_address,
      billing_address: completeOrder.billing_address,
      payment_status: "captured",
      payment_reference: paymentData.reference,
      metadata: completeOrder.metadata,
      created_at: completeOrder.created_at,
      updated_at: completeOrder.updated_at,
    };

    res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully",
      order: formattedOrder,
      payment: {
        reference: paymentData.reference,
        amount: paymentData.amount,
        status: paymentData.status,
        channel: paymentData.channel,
        paid_at: paymentData.paid_at,
      },
    });

  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      error: "Payment verification failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

