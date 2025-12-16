import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService, ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { getCartId } from "../../../cart/helpers";
import { FLUTTERWAVE_SECRET_KEY } from "../../../../../lib/constants";

interface InitializePaymentRequest {
  callback_url?: string;
  payment_options?: string;
  metadata?: Record<string, any>;
}

/**
 * POST /store/payments/flutterwave/initialize
 * Initialize Flutterwave payment for current cart
 * Requires authentication and active cart
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
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Retrieve auth identity to get customer email properly
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    if (!authIdentity) {
      console.error("Auth identity not found for ID:", authContext.auth_identity_id);
      return res.status(404).json({
        error: "User not found",
        message: "Unable to find authentication identity"
      });
    }

    // Try to get email from multiple sources as fallback
    let customerEmail = authIdentity.entity_id;
    
    // Fallback 1: Try actor_id from auth context (older auth method)
    if (!customerEmail && authContext.actor_id) {
      console.log("Using actor_id as fallback email:", authContext.actor_id);
      customerEmail = authContext.actor_id;
    }
    
    // Fallback 2: Try to get from app_metadata
    if (!customerEmail && authIdentity.app_metadata?.customer_id) {
      console.log("Attempting to retrieve email from customer record:", authIdentity.app_metadata.customer_id);
      try {
        const customerRecord = await customerModuleService.retrieveCustomer(authIdentity.app_metadata.customer_id);
        if (customerRecord?.email) {
          console.log("Retrieved email from customer record:", customerRecord.email);
          customerEmail = customerRecord.email;
        }
      } catch (error) {
        console.error("Failed to retrieve customer record:", error);
      }
    }
    
    console.log("Final customer email determined:", customerEmail);
    
    if (!customerEmail) {
      console.error("Unable to determine email from any source:", {
        authIdentity: {
          id: authIdentity.id,
          entity_id: authIdentity.entity_id,
          app_metadata: authIdentity.app_metadata
        },
        authContext: {
          actor_id: authContext.actor_id,
          auth_identity_id: authContext.auth_identity_id
        }
      });
      return res.status(400).json({
        error: "Invalid authentication",
        message: "Unable to determine customer email from authentication context. Please log out and log in again.",
      });
    }

    // Try to find existing customer by email
    let customer;
    const customers = await customerModuleService.listCustomers({
      email: customerEmail,
    });

    if (customers && customers.length > 0) {
      customer = customers[0];
    } else {
      // User is authenticated but no customer record exists
      // Create customer record automatically
      try {
        customer = await customerModuleService.createCustomers({
          email: customerEmail,
        });

        console.log("Created customer record for authenticated user:", customer.email);
      } catch (error) {
        console.error("Failed to create customer record:", error);
        return res.status(500).json({
          error: "Customer creation failed",
          message: "Unable to create customer profile. Please try again or contact support.",
        });
      }
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
    // Use cart.total if available and > 0, otherwise calculate from items
    let cartTotal = cart.total || 0;
    
    if (cartTotal <= 0) {
      // Fallback: Calculate from items (backward compatibility)
      cartTotal = cart.items.reduce((total: number, item: any) => {
        return total + (item.unit_price * item.quantity);
      }, 0);
    }

    if (cartTotal <= 0) {
      return res.status(400).json({
        error: "Invalid cart total",
        message: "Cart total must be greater than zero",
      });
    }

    // TEMPORARY FIX: Check if prices in database are in cedis format
    // If cart total seems suspiciously low (< 1000), multiply by 100
    // This handles the case where database has cedis instead of pesewas
    let flutterwaveAmount = cartTotal;
    const likelyInCedis = cartTotal > 0 && cartTotal < 10000 && cart.currency_code?.toLowerCase() === 'ghs';
    
    if (likelyInCedis) {
      console.warn("⚠️ Cart total appears to be in cedis format, converting to pesewas for Flutterwave");
      flutterwaveAmount = cartTotal * 100;
    }

    console.log("Flutterwave payment amount:", {
      cart_id: cartId,
      original_amount: cartTotal,
      flutterwave_amount: flutterwaveAmount,
      amount_in_cedis: (flutterwaveAmount / 100).toFixed(2),
      currency: cart.currency_code,
      items_count: cart.items.length,
      converted: likelyInCedis,
    });

    // Get request data
    const {
      callback_url,
      payment_options = "card,mobilemoneyghana,ussd,banktransfer,account",
      metadata = {},
    } = req.body as InitializePaymentRequest;

    // Determine frontend URL for callback
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";
    const finalCallbackUrl = callback_url || `${frontendUrl}/checkout/verify`;

    // Generate unique transaction reference
    const txRef = `FLW-${Date.now()}-${cart.id.substring(0, 8)}`;

    // Prepare Flutterwave initialization data
    const flutterwaveData = {
      tx_ref: txRef,
      amount: flutterwaveAmount / 100, // Flutterwave expects amount in major currency unit (cedis not pesewas)
      currency: cart.currency_code?.toUpperCase() || "GHS",
      redirect_url: `${process.env.BACKEND_URL || 'http://localhost:9000'}/store/payments/flutterwave/callback`,
      payment_options,
      customer: {
        email: customer.email,
        name: customer.first_name && customer.last_name 
          ? `${customer.first_name} ${customer.last_name}` 
          : customer.email,
      },
      customizations: {
        title: "Kentean & Bobs",
        description: `Payment for order ${cart.id}`,
        logo: ""
      },
      meta: {
        cart_id: cart.id,
        customer_id: customer.id,
        customer_email: customer.email,
        ...metadata,
      },
    };

    // Initialize payment with Flutterwave API
    const flutterwaveResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(flutterwaveData),
    });

    const flutterwaveResult = await flutterwaveResponse.json();

    if (!flutterwaveResponse.ok || flutterwaveResult.status !== "success") {
      console.error("Flutterwave initialization error:", flutterwaveResult);
      return res.status(400).json({
        error: "Payment initialization failed",
        message: flutterwaveResult.message || "Failed to initialize payment with Flutterwave",
        details: flutterwaveResult,
      });
    }

    // Store payment reference in session for verification
    if (req.session) {
      req.session.flutterwave_reference = txRef;
    }

    res.status(200).json({
      success: true,
      message: "Payment initialized successfully",
      data: {
        payment_link: flutterwaveResult.data.link,
        tx_ref: txRef,
        amount: flutterwaveAmount,
        original_cart_amount: cartTotal,
        currency: cart.currency_code?.toLowerCase() || "ghs",
        converted_for_payment: likelyInCedis,
      },
    });
  } catch (error) {
    console.error("Error initializing Flutterwave payment:", error);
    res.status(500).json({
      error: "Payment initialization failed",
      message: error.message || "An unexpected error occurred",
    });
  }
}

