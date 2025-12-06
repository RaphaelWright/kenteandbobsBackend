import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/debug/test-auth
 * Debug endpoint to test current authentication (AUTH REQUIRED)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authContext = req.session?.auth_context;
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "Please login first"
      });
    }

    // Get the auth identity
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    // List all auth identities for this email
    const allIdentities = await authModuleService.listAuthIdentities();
    const matchingIdentities = allIdentities.filter(
      (identity: any) => identity.entity_id === authIdentity.entity_id
    );

    res.status(200).json({
      session: {
        auth_identity_id: authContext.auth_identity_id,
        actor_id: authContext.actor_id,
        actor_type: authContext.actor_type
      },
      current_auth_identity: {
        id: authIdentity.id,
        provider: authIdentity.provider,
        entity_id: authIdentity.entity_id,
        provider_metadata: authIdentity.provider_metadata,
        app_metadata: authIdentity.app_metadata
      },
      all_matching_identities: matchingIdentities.map((identity: any) => ({
        id: identity.id,
        provider: identity.provider,
        entity_id: identity.entity_id
      }))
    });
  } catch (error) {
    console.error("Test auth error:", error);
    res.status(500).json({
      error: error.message || "Failed to test auth"
    });
  }
}

/**
 * POST /store/debug/test-auth
 * Test password verification
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password required"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Try to authenticate
    try {
      const authResult = await authModuleService.authenticate("emailpass", {
        body: {
          email,
          password
        }
      } as any) as any;

      res.status(200).json({
        success: authResult?.success || false,
        has_auth_identity: !!authResult?.authIdentity,
        auth_result: authResult
      });
    } catch (authError) {
      res.status(200).json({
        success: false,
        error: authError.message,
        stack: authError.stack
      });
    }
  } catch (error) {
    console.error("Test auth POST error:", error);
    res.status(500).json({
      error: error.message || "Failed to test auth"
    });
  }
}

