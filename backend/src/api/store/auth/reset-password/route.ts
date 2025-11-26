import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

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

    // Validate token
    const storedToken = metadata.password_reset_token as string | undefined;
    const tokenExpiry = metadata.password_reset_expiry as string | undefined;

    if (!storedToken || !tokenExpiry) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    // Check if token matches
    if (storedToken !== token) {
      console.log(`Invalid token attempt for ${email}`);
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
    const authIdentities = await authModuleService.listAuthIdentities({
      entity_id: email,
    });

    if (!authIdentities || authIdentities.length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid or expired reset token",
      });
    }

    const authIdentity = authIdentities[0];

    // Update password
    await authModuleService.updateAuthIdentities(authIdentity.id, {
      provider_metadata: {
        password: new_password,
      },
    } as any);

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

    // Success response
    res.status(200).json({
      message: "Password has been reset successfully. You can now log in with your new password",
      success: true,
    });

    // Note: In production, you should:
    // 1. Send confirmation email that password was changed
    // 2. Invalidate all existing sessions for this user
    // 3. Log this event in security audit table
    // 4. Consider requiring re-verification if suspicious activity detected
  } catch (error) {
    console.error("Reset password error:", error);

    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to reset password. Please try again or request a new reset link",
    });
  }
}

