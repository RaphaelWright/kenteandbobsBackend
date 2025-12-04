import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/payments/paystack/callback
 * Handle Paystack payment callback redirect
 * Redirects to frontend verification page
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Get payment reference from query params
    // Paystack can send either 'reference' or 'trxref'
    const reference = (req.query.reference || req.query.trxref) as string;
    const status = req.query.status as string;

    console.log("Paystack callback received:", {
      reference,
      status,
      query: req.query,
    });

    // Determine frontend URL
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";

    // Determine redirect URL based on status
    let redirectUrl: string;

    if (status === "success" && reference) {
      // Redirect to verification page
      redirectUrl = `${frontendUrl}/checkout/verify?reference=${reference}`;
    } else if (status === "cancelled") {
      // Redirect to checkout with cancelled message
      redirectUrl = `${frontendUrl}/checkout?status=cancelled`;
    } else {
      // Redirect to checkout with failed message
      redirectUrl = `${frontendUrl}/checkout/failed${reference ? `?reference=${reference}` : ""}`;
    }

    // Redirect to frontend
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error handling Paystack callback:", error);

    // Fallback redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000";
    res.redirect(`${frontendUrl}/checkout?error=callback_error`);
  }
}

