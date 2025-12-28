import { INotificationModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * Send password reset email using Resend
 */
export async function sendPasswordResetEmail(
  notificationModuleService: INotificationModuleService,
  to: string,
  customerName: string,
  resetToken: string,
  frontendUrl: string
): Promise<void> {
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(to)}`;

  await notificationModuleService.createNotifications({
    to,
    channel: "email",
    template: "customer.password_reset",
    data: {
      customer_first_name: customerName,
      reset_token: resetToken,
      reset_url: resetUrl,
      emailOptions: {
        subject: "Reset Your Password - Kentenbobs",
      },
    },
  });
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmationEmail(
  notificationModuleService: INotificationModuleService,
  to: string,
  customerName: string
): Promise<void> {
  const timestamp = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  await notificationModuleService.createNotifications({
    to,
    channel: "email",
    template: "customer.password_reset_confirmation",
    data: {
      customer_first_name: customerName,
      reset_timestamp: timestamp,
      emailOptions: {
        subject: "Password Reset Successful - Kentenbobs",
      },
    },
  });
}

