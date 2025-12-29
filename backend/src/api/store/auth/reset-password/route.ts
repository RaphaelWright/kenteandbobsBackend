import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService, INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { sendPasswordResetConfirmationEmail } from "../../../../utils/email";

/**
 * Validate password strength
 * Same validation as change-password endpoint
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

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one number" };
  }

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
 * POST /store/auth/reset-password
 * Complete password reset with token
 * 
 * This endpoint validates the reset token and updates the password.
 * 
 * Request Body:
 * - email: string (required) - User's email address
 * - token: string (required) - Reset token from email
 * - new_password: string (required) - New password
 * - confirm_password: string (optional but recommended) - Password confirmation
 * 
 * Security Features:
 * - Token validation and expiry check
 * - Single-use tokens (deleted after use)
 * - Password strength validation
 * - Rate limiting recommended
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, token, new_password, confirm_password } = req.body as {
      email?: string;
      token?: string;
      new_password?: string;
      confirm_password?: string;
    };

    // Validate required fields
    if (!email || !token || !new_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email, token, and new password are required",
        fields: {
          email: !email ? "Required" : undefined,
          token: !token ? "Required" : undefined,
          new_password: !new_password ? "Required" : undefined,
        },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid email format",
        field: "email",
      });
    }

    // Validate password confirmation if provided
    if (confirm_password && new_password !== confirm_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Passwords do not match",
        field: "confirm_password",
      });
    }

    // Validate password strength
    const strengthValidation = validatePasswordStrength(new_password);
    if (!strengthValidation.valid) {
      return res.status(400).json({
        error: "Bad Request",
        message: strengthValidation.error,
        field: "new_password",
      });
    }

    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const notificationModuleService: INotificationModuleService = req.scope.resolve(Modules.NOTIFICATION);

    // Find customer by email
    const customers = await customerModuleService.listCustomers({ email });

    if (!customers || customers.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    const customer = customers[0];
    const metadata = customer.metadata || {};

    console.log(`🔍 Password reset attempt for: ${email}`);
    console.log(`📋 Available metadata keys:`, Object.keys(metadata));

    // Validate token
    const storedToken = metadata.password_reset_token as string | undefined;
    const tokenExpiry = metadata.password_reset_expiry as string | undefined;

    console.log(`🔑 Received token: ${token}`);
    console.log(`🔑 Received token length: ${token.length}`);
    console.log(`💾 Stored token: ${storedToken || 'NOT FOUND'}`);
    console.log(`💾 Stored token length: ${storedToken?.length || 0}`);
    console.log(`⏰ Token expiry: ${tokenExpiry || 'NOT FOUND'}`);

    if (!storedToken || !tokenExpiry) {
      console.log(`❌ Token or expiry missing in metadata`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    // Check if token matches
    console.log(`🔍 Comparing tokens:`);
    console.log(`   Stored:   "${storedToken}"`);
    console.log(`   Received: "${token}"`);
    console.log(`   Match: ${storedToken === token}`);
    
    if (storedToken !== token) {
      console.log(`❌ Token mismatch for ${email}`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    // Check if token is expired
    const expiryDate = new Date(tokenExpiry);
    const now = new Date();

    if (now > expiryDate) {
      console.log(`Expired token used for ${email}`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Reset token has expired. Please request a new one",
      });
    }

    // Find auth identity by email
    // Note: Medusa's listAuthIdentities has limited filter support
    // We need to list all and filter manually
    console.log(`🔍 Looking for auth identity with email: ${email}`);
    const allAuthIdentities = await authModuleService.listAuthIdentities();
    console.log(`📋 Total auth identities found: ${allAuthIdentities.length}`);

    // Filter for emailpass provider and matching email
    const authIdentity = allAuthIdentities.find(
      (identity: any) => {
        console.log(`  Checking identity: provider=${identity.provider}, entity_id=${identity.entity_id}`);
        return identity.provider === "emailpass" && identity.entity_id === email;
      }
    );

    if (!authIdentity) {
      console.log(`❌ No auth identity found for email: ${email}`);
      console.log(`   Searched for: provider=emailpass, entity_id=${email}`);
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    console.log(`✅ Auth identity found for ${email}`);

    // Update password
    // Note: We need to delete and recreate the auth identity because updateAuthIdentities
    // does not properly hash the password. The register method does hash it correctly.
    
    // Save app_metadata before deletion (contains customer_id linkage)
    const savedAppMetadata = authIdentity.app_metadata || {};
    
    console.log(`Deleting old auth identity for: ${email}`);
    await authModuleService.deleteAuthIdentities([authIdentity.id]);
    
    console.log(`Creating new auth identity with updated password for: ${email}`);
    const newAuthResult = await authModuleService.register("emailpass", {
      body: {
        email,
        password: new_password
      }
    } as any) as any;

    if (!newAuthResult?.success || !newAuthResult?.authIdentity) {
      console.error("Failed to create new auth identity after password reset");
      throw new Error("Failed to update password");
    }

    // Restore app_metadata (including customer_id) to maintain linkage
    if (Object.keys(savedAppMetadata).length > 0) {
      console.log(`Restoring app_metadata for: ${email}`, savedAppMetadata);
      await authModuleService.updateAuthIdentities({
        id: newAuthResult.authIdentity.id,
        app_metadata: savedAppMetadata
      } as any);
    }

    // Clear reset token from customer metadata (single-use token)
    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...metadata,
        password_reset_token: null,
        password_reset_expiry: null,
        password_reset_completed_at: new Date().toISOString(),
      },
    });

    // Log successful password reset
    console.log(`Password reset completed for: ${email} at ${new Date().toISOString()}`);

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(
        notificationModuleService,
        email,
        customer.first_name || "there"
      );
      console.log(`✅ Password reset confirmation email sent to ${email}`);
    } catch (emailError) {
      console.error("❌ Failed to send confirmation email:", emailError);
      // Don't fail the request if email fails - password was already reset
    }

    // Success response
    res.status(200).json({
      message: "Password has been reset successfully. You can now log in with your new password",
      success: true,
    });

    // Note: In production, you should:
    // 1. Invalidate all existing sessions for this user
    // 2. Log this event in security audit table
    // 3. Consider requiring re-verification if suspicious activity detected
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to reset password. Please try again or request a new reset link",
    });
  }
}

