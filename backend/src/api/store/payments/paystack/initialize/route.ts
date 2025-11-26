import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import PaystackService from "../../../../../modules/paystack/service";
import { getCartId, getCustomerFromAuth } from "../../../cart/helpers";

/**
 * POST /store/payments/paystack/initialize
 * Initialize a Paystack payment session
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Check authentication
    const authContext = req.session?.auth_context;
    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to initialize payment",
      });
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const paystackService: PaystackService = req.scope.resolve("paystackService");

    // Get customer
    const customer = await getCustomerFromAuth(authContext, customerModuleService);
    if (!customer) {
      return res.status(404).json({
        error: "Customer not found",
        message: "Please complete your profile first",
      });
    }

    // Get cart
    const cartId = getCartId(req);
    if (!cartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "No cart found",
      });
    }

    let cart;
    try {
      cart = await cartModuleService.retrieveCart(cartId, {
        relations: ["items", "items.variant", "items.product"],
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
        message: "Cart is empty",
      });
    }

    // Get callback URL from request or use default
    const { callback_url, channels } = req.body as {
      callback_url?: string;
      channels?: string[];
    };

    // Prepare metadata
    const metadata = {
      cart_id: cart.id,
      customer_id: customer.id,
      customer_email: customer.email,
      order_type: "ecommerce",
      items_count: cart.items.length,
    };

    // Initialize payment with Paystack
    const paymentResponse = await paystackService.initializePayment({
      email: customer.email,
      amount: cart.total || 0, // Amount in smallest unit (pesewas for GHS)
      currency: cart.currency_code?.toUpperCase() || "GHS",
      callback_url: callback_url || `${process.env.FRONTEND_URL}/checkout/verify`,
      metadata,
      channels: channels || ["card", "mobile_money", "bank"],
    });

    // Store payment reference in session for verification
    if (req.session) {
      req.session.payment_reference = paymentResponse.data.reference;
    }

    res.json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paymentResponse.data.authorization_url,
        access_code: paymentResponse.data.access_code,
        reference: paymentResponse.data.reference,
        amount: cart.total,
        currency: cart.currency_code,
      },
    });
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    res.status(500).json({
      error: "Payment initialization failed",
      message: error.message || "An error occurred while initializing payment",
    });
  }
}

