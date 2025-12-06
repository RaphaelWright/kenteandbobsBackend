import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * Validate password strength
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter (optional but recommended)
 * - At least one lowercase letter
 * - At least one number (optional but recommended)
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters long" };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password must not exceed 128 characters" };
  }

  // Check for at least one letter
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter" };
  }

  // Check for at least one number (recommended)
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password", "12345678", "password123", "qwerty123", "abc12345",
    "password1", "welcome123", "letmein123", "admin123", "user12345"
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: "Password is too common. Please choose a stronger password" };
  }

  return { valid: true };
}

/**
 * POST /store/auth/change-password
 * Change password for authenticated user
 * 
 * Request Body:
 * - current_password: string (required) - User's current password for verification
 * - new_password: string (required) - New password (min 8 chars, must contain letter and number)
 * - confirm_password: string (optional but recommended) - Confirmation of new password
 * 
 * Security Features:
 * - Requires authentication
 * - Verifies current password
 * - Validates password strength
 * - Prevents password reuse
 * - Rate limiting recommended (implement in middleware)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Check authentication
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to change your password"
      });
    }

    const { current_password, new_password, confirm_password } = req.body as {
      current_password?: string;
      new_password?: string;
      confirm_password?: string;
    };

    // Validate required fields
    if (!current_password || !new_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Current password and new password are required",
        fields: {
          current_password: !current_password ? "Required" : undefined,
          new_password: !new_password ? "Required" : undefined
        }
      });
    }

    // Validate password confirmation if provided
    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "New password and confirmation do not match",
        field: "confirm_password"
      });
    }

    // Validate new password strength
    const strengthValidation = validatePasswordStrength(new_password);
    if (!strengthValidation.valid) {
      return res.status(400).json({
        error: "Bad Request",
        message: strengthValidation.error,
        field: "new_password"
      });
    }

    // Prevent using the same password
    if (current_password === new_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "New password must be different from your current password",
        field: "new_password"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Get current auth identity
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    if (!authIdentity) {
      return res.status(404).json({
        error: "Not Found",
        message: "Authentication identity not found"
      });
    }

    // Verify current password by attempting authentication
    try {
      console.log(`Verifying password for user: ${authIdentity.entity_id}`);
      
      const authResult = await authModuleService.authenticate("emailpass", {
        body: {
          email: authIdentity.entity_id,
          password: current_password
        }
      } as any) as any;

      console.log("Password verification result:", {
        success: authResult?.success,
        hasAuthIdentity: !!authResult?.authIdentity
      });

      if (!authResult?.success) {
        console.log("Password verification failed: incorrect password");
        return res.status(401).json({
          error: "Unauthorized",
          message: "Current password is incorrect",
          field: "current_password"
        });
      }
    } catch (authError) {
      console.error("Authentication verification failed:", authError);
      console.error("Error details:", {
        message: authError?.message,
        stack: authError?.stack
      });
      return res.status(401).json({
        error: "Unauthorized",
        message: "Current password is incorrect",
        field: "current_password"
      });
    }

    // Update password
    // Note: We need to delete and recreate the auth identity because updateAuthIdentities
    // does not properly hash the password. The register method does hash it correctly.
    
    // Save app_metadata before deletion (contains customer_id linkage)
    const savedAppMetadata = authIdentity.app_metadata || {};
    
    console.log(`Deleting old auth identity for: ${authIdentity.entity_id}`);
    await authModuleService.deleteAuthIdentities([authContext.auth_identity_id]);
    
    console.log(`Creating new auth identity with updated password for: ${authIdentity.entity_id}`);
    const newAuthResult = await authModuleService.register("emailpass", {
      body: {
        email: authIdentity.entity_id,
        password: new_password
      }
    } as any) as any;

    if (!newAuthResult?.success || !newAuthResult?.authIdentity) {
      console.error("Failed to create new auth identity after password change");
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to update password. Please try again."
      });
    }

    // Restore app_metadata (including customer_id) to maintain linkage
    if (Object.keys(savedAppMetadata).length > 0) {
      console.log(`Restoring app_metadata for: ${authIdentity.entity_id}`, savedAppMetadata);
      await authModuleService.updateAuthIdentities({
        id: newAuthResult.authIdentity.id,
        app_metadata: savedAppMetadata
      } as any);
    }

    // Update session with new auth identity ID
    req.session.auth_context = {
      ...authContext,
      auth_identity_id: newAuthResult.authIdentity.id,
      actor_id: newAuthResult.authIdentity.entity_id,
      app_metadata: savedAppMetadata
    };

    // Log password change for security audit
    console.log(`Password changed successfully for user: ${authIdentity.entity_id} at ${new Date().toISOString()}`);

    // Success response
    res.status(200).json({
      message: "Password changed successfully",
      success: true
    });

    // Note: In a production environment, you might want to:
    // 1. Send an email notification about the password change
    // 2. Invalidate other sessions (force re-login on other devices)
    // 3. Log this event in a security audit table
  } catch (error) {
    console.error("Password change error:", error);
    
    // Handle specific errors
    if (error.message?.includes("not found")) {
      return res.status(404).json({
        error: "Not Found",
        message: "User account not found"
      });
    }

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to change password. Please try again later."
    });
  }
}
