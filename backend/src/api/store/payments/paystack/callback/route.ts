import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/payments/paystack/callback?reference=xxx&trxref=xxx
 * Handle Paystack redirect callback
 * This is where Paystack redirects users after payment
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const reference = req.query.reference as string || req.query.trxref as string;
    
    if (!reference) {
      // Redirect to checkout failure page
      return res.redirect(`${process.env.FRONTEND_URL}/checkout/failed?error=no_reference`);
    }

    // Get status from query params
    const status = req.query.status as string;

    // Redirect to frontend verification page
    // The frontend will call the verify endpoint
    if (status === "success" || !status) {
      return res.redirect(`${process.env.FRONTEND_URL}/checkout/verify?reference=${reference}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/checkout/failed?reference=${reference}`);
    }
  } catch (error) {
    console.error("Error handling Paystack callback:", error);
    return res.redirect(`${process.env.FRONTEND_URL}/checkout/failed?error=callback_error`);
  }
}

