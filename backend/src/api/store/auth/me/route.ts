import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/auth/me
 * Get current authenticated user information
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Not authenticated"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Retrieve auth identity
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    );

    if (!authIdentity) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.status(200).json({
      user: {
        id: authIdentity.id,
        email: authIdentity.entity_id,
        provider: authIdentity.provider,
        app_metadata: authIdentity.app_metadata
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({
      error: error.message || "Failed to get user information"
    });
  }
}

