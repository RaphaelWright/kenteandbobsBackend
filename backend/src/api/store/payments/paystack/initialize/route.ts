import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getCartId, getCustomerFromAuth } from "../../../cart/helpers";
import { PAYSTACK_SECRET_KEY } from "../../../../../lib/constants";

interface InitializePaymentRequest {
  callback_url?: string;
  channels?: string[];
  metadata?: Record<string, any>;
}

/**
 * POST /store/payments/paystack/initialize
 * Initialize Paystack payment for current cart
 * Requires authentication and active cart
 */
export async function POST(
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
        message: "You must be logged in to initialize payment",
      });
    }

    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Get customer
    const customer = await getCustomerFromAuth(authContext, customerModuleService);
    if (!customer) {
      return res.status(400).json({
        error: "Customer not found",
        message: "Unable to find customer profile",
      });
    }

    // Get cart
    const cartId = getCartId(req);
    if (!cartId) {
      return res.status(400).json({
        error: "No cart found",
        message: "Please create a cart before initializing payment",
      });
    }

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

    // Validate cart has items
    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({
        error: "Empty cart",
        message: "Cart is empty. Add items before making payment",
      });
    }

    // Calculate cart total (in pesewas/kobo)
    // Medusa stores amounts in the smallest currency unit (e.g., pesewas for GHS)
    const cartTotal = cart.items.reduce((total: number, item: any) => {
      return total + (item.unit_price * item.quantity);
    }, 0);

    if (cartTotal <= 0) {
      return res.status(400).json({
        error: "Invalid cart total",
        message: "Cart total must be greater than zero",
      });
    }

    // Get request data
    const {
      callback_url,
      channels = ["card", "mobile_money", "bank"],
      metadata = {},
    } = req.body as InitializePaymentRequest;

    // Determine frontend URL for callback
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";
    const finalCallbackUrl = callback_url || `${frontendUrl}/checkout/verify`;

    // Prepare Paystack initialization data
    const paystackData = {
      email: customer.email,
      amount: cartTotal, // Amount in smallest currency unit (pesewas/kobo)
      currency: cart.currency_code?.toUpperCase() || "GHS",
      channels,
      callback_url: finalCallbackUrl,
      metadata: {
        cart_id: cart.id,
        customer_id: customer.id,
        customer_email: customer.email,
        ...metadata,
      },
    };

    // Initialize payment with Paystack API
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackData),
    });

    const paystackResult = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackResult.status) {
      console.error("Paystack initialization error:", paystackResult);
      return res.status(400).json({
        error: "Payment initialization failed",
        message: paystackResult.message || "Failed to initialize payment with Paystack",
        details: paystackResult,
      });
    }

    // Store payment reference in session for verification
    if (req.session) {
      req.session.payment_reference = paystackResult.data.reference;
    }

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        authorization_url: paystackResult.data.authorization_url,
        access_code: paystackResult.data.access_code,
        reference: paystackResult.data.reference,
        amount: cartTotal,
        currency: cart.currency_code?.toLowerCase() || "ghs",
      },
    });
  } catch (error) {
    console.error("Error initializing Paystack payment:", error);
    res.status(500).json({
      error: "Payment initialization failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

