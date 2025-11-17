import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /oauth/google/callback
 * Handle Google OAuth callback
 * This route is called by Google after user authentication
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Validate the OAuth callback with Google provider
    const { success, authIdentity, error, successRedirectUrl } = await authModuleService.validateCallback("google", {
      body: req.body,
      query: req.query,
      headers: req.headers,
      protocol: req.protocol
    } as any) as any;

    if (!success || error) {
      console.error("Google OAuth validation error:", error);
      // Redirect to frontend error page
      const frontendUrl = process.env.STORE_CORS || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error || 'Authentication failed')}`);
    }

    if (!authIdentity) {
      const frontendUrl = process.env.STORE_CORS || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent('No auth identity returned')}`);
    }

    // Set the authentication in the session
    req.session.auth_identity_id = authIdentity.id;
    req.session.auth_provider = "google";

    console.log("Google OAuth successful:", {
      id: authIdentity.id,
      provider: authIdentity.provider,
      entity_id: authIdentity.entity_id
    });

    // Redirect to frontend success page
    const frontendUrl = process.env.STORE_CORS || 'http://localhost:3000';
    const redirectUrl = successRedirectUrl || `${frontendUrl}/auth/success`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    const frontendUrl = process.env.STORE_CORS || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message || 'Authentication failed')}`);
  }
}

