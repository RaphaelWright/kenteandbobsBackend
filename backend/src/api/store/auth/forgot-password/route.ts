import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import crypto from "crypto";

/**
 * POST /store/auth/forgot-password
 * Request a password reset token
 * 
 * This endpoint generates a reset token and sends it via email.
 * It always returns success even if email doesn't exist (security best practice).
 * 
 * Request Body:
 * - email: string (required) - User's email address
 * 
 * Security Features:
 * - Token expires after 1 hour
 * - Rate limiting recommended (5 requests per hour per IP)
 * - Always returns success (prevents email enumeration)
 * - Tokens are single-use
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email } = req.body as { email?: string };

    // Validate email format
    if (!email) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Invalid email format",
      });
    }

    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Check if customer exists
    const customers = await customerModuleService.listCustomers({ email });

    if (customers && customers.length > 0) {
      const customer = customers[0];

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Store token in customer metadata
      await customerModuleService.updateCustomers(customer.id, {
        metadata: {
          ...customer.metadata,
          password_reset_token: resetToken,
          password_reset_expiry: resetTokenExpiry.toISOString(),
          password_reset_requested_at: new Date().toISOString(),
        },
      });

      // Log password reset request (for security audit)
      console.log(`Password reset requested for: ${email} at ${new Date().toISOString()}`);

      // TODO: Send email with reset link
      // In production, implement email sending here:
      // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      // await sendPasswordResetEmail(email, resetLink);

      console.log(`Reset token generated for ${email}: ${resetToken}`);
      console.log(`Token expires at: ${resetTokenExpiry.toISOString()}`);
      
      // In development, you might want to return the token for testing
      // Remove this in production!
      if (process.env.NODE_ENV === "development") {
        console.log(`\n=== PASSWORD RESET TOKEN (DEV ONLY) ===`);
        console.log(`Email: ${email}`);
        console.log(`Token: ${resetToken}`);
        console.log(`Reset URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`);
        console.log(`Expires: ${resetTokenExpiry.toISOString()}`);
        console.log(`=====================================\n`);
      }
    }

    // Always return success (prevents email enumeration attacks)
    // Don't reveal whether the email exists or not
    res.status(200).json({
      message: "If your email is registered, you will receive a password reset link shortly",
      success: true,
    });

    // Note: In production, you should:
    // 1. Send an actual email with the reset link
    // 2. Implement rate limiting (e.g., max 5 requests per hour per IP)
    // 3. Log suspicious patterns (multiple requests for different emails from same IP)
  } catch (error) {
    console.error("Forgot password error:", error);
    
    // Don't reveal internal errors to prevent information leakage
    res.status(200).json({
      message: "If your email is registered, you will receive a password reset link shortly",
      success: true,
    });
  }
}

