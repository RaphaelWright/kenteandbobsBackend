import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/protected/profile
 * Example protected route - requires authentication
 * This route is automatically protected by the middleware defined in middlewares.ts
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Auth context is available from middleware
    const authContext = (req as any).auth || req.session?.auth_context;

    if (!authContext) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Get user details
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    res.status(200).json({
      message: "This is a protected route - you are authenticated!",
      profile: {
        id: authIdentity.id,
        email: authIdentity.entity_id,
        provider: authIdentity.provider,
        authenticated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Protected route error:", error);
    res.status(500).json({
      error: error.message || "Failed to access protected resource"
    });
  }
}

/**
 * PUT /store/protected/profile
 * Update user profile - example of protected mutation
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authContext = (req as any).auth || req.session?.auth_context;

    if (!authContext) {
      return res.status(401).json({
        error: "Unauthorized"
      });
    }

    const { name, metadata } = req.body as { name?: string; metadata?: any };

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Update auth identity metadata
    const updatedIdentity = await authModuleService.updateAuthIdentities(
      authContext.auth_identity_id,
      {
        app_metadata: {
          ...metadata,
          name
        }
      } as any
    ) as any;

    res.status(200).json({
      message: "Profile updated successfully",
      profile: {
        id: updatedIdentity.id,
        email: updatedIdentity.entity_id,
        app_metadata: updatedIdentity.app_metadata
      }
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      error: error.message || "Failed to update profile"
    });
  }
}

