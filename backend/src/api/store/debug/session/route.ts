import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/debug/session
 * Debug endpoint to check session status
 * REMOVE THIS IN PRODUCTION
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const sessionInfo = {
      hasSession: !!req.session,
      sessionData: req.session ? {
        hasAuthContext: !!req.session.auth_context,
        authContext: req.session.auth_context ? {
          actor_id: req.session.auth_context.actor_id,
          actor_type: req.session.auth_context.actor_type,
          auth_identity_id: req.session.auth_context.auth_identity_id,
          app_metadata: req.session.auth_context.app_metadata
        } : null,
        cart_id: req.session.cart_id || null
      } : null,
      cookies: req.headers.cookie || "No cookies",
      sessionId: (req.session as any)?.id || "No session ID"
    };

    res.status(200).json({
      message: "Session debug info",
      data: sessionInfo
    });
  } catch (error) {
    res.status(500).json({
      error: error.message || "Failed to get session debug info"
    });
  }
}

