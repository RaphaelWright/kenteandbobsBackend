import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/change-password
 * Change password for authenticated user
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Not authenticated"
      });
    }

    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({
        error: "Current password and new password are required"
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: "New password must be at least 8 characters long"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Get current auth identity
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    );

    // Verify current password by attempting authentication
    const { success } = await authModuleService.authenticate("emailpass", {
      body: {
        email: authIdentity.entity_id,
        password: current_password
      }
    });

    if (!success) {
      return res.status(401).json({
        error: "Current password is incorrect"
      });
    }

    // Update password
    await authModuleService.updateAuthIdentities(
      authContext.auth_identity_id,
      {
        provider_metadata: {
          password: new_password
        }
      }
    );

    res.status(200).json({
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      error: error.message || "Failed to change password"
    });
  }
}

