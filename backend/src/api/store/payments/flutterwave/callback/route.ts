import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/payments/flutterwave/callback
 * Handle Flutterwave payment callback redirect
 * Redirects to frontend verification page
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Get payment reference from query params
    // Flutterwave sends transaction_id and tx_ref
    const txRef = req.query.tx_ref as string;
    const transactionId = req.query.transaction_id as string;
    const status = req.query.status as string;

    console.log("Flutterwave callback received:", {
      tx_ref: txRef,
      transaction_id: transactionId,
      status,
      query: req.query,
    });

    // Determine frontend URL
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";

    // Determine redirect URL based on status
    let redirectUrl: string;

    if (status === "successful" && (txRef || transactionId)) {
      // Redirect to verification page with both references
      const params = new URLSearchParams();
      if (txRef) params.append("tx_ref", txRef);
      if (transactionId) params.append("transaction_id", transactionId);
      params.append("provider", "flutterwave");
      
      redirectUrl = `${frontendUrl}/checkout/verify?${params.toString()}`;
    } else if (status === "cancelled") {
      // Redirect to checkout with cancelled message
      redirectUrl = `${frontendUrl}/checkout?status=cancelled&provider=flutterwave`;
    } else {
      // Redirect to checkout with failed message
      const params = new URLSearchParams();
      params.append("provider", "flutterwave");
      if (txRef) params.append("tx_ref", txRef);
      if (transactionId) params.append("transaction_id", transactionId);
      
      redirectUrl = `${frontendUrl}/checkout/failed?${params.toString()}`;
    }

    // Redirect to frontend
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error handling Flutterwave callback:", error);

    // Fallback redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";
    res.redirect(`${frontendUrl}/checkout?error=callback_error&provider=flutterwave`);
  }
}

