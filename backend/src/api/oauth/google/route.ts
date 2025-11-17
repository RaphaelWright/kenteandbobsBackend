import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /oauth/google
 * Initiate Google OAuth flow
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Generate the Google OAuth URL
    const { location } = await authModuleService.authenticate("google", {
      body: req.body,
      query: req.query,
      headers: req.headers,
      protocol: req.protocol
    } as any) as any;

    if (!location) {
      return res.status(500).json({
        error: "Failed to generate Google OAuth URL"
      });
    }

    // Redirect to Google OAuth URL
    res.redirect(location);
  } catch (error) {
    console.error("Google OAuth initiation error:", error);
    res.status(500).json({
      error: error.message || "Failed to initiate Google OAuth"
    });
  }
}

