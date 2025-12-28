import { INotificationModuleService } from "@medusajs/framework/types";

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

/**
 * Send order completion email
 */
export async function sendOrderCompletionEmail(
  notificationModuleService: INotificationModuleService,
  order: any
): Promise<void> {
  try {
    // Validate required fields
    if (!order || !order.email) {
      console.warn("⚠️ Cannot send order email: missing order or email");
      return;
    }

    // Get shipping address (prefer populated address, fallback to metadata)
    let shippingAddress = order.shipping_address;
    
    // If shipping address is not populated, try to get from metadata
    if (!shippingAddress?.first_name && order.metadata?.delivery_address) {
      shippingAddress = order.metadata.delivery_address;
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.first_name) {
      console.warn("⚠️ Cannot send order email: missing shipping address", {
        order_id: order.id,
        has_shipping_address: !!order.shipping_address,
        has_metadata_address: !!order.metadata?.delivery_address,
      });
      return;
    }

    console.log(`📧 Preparing order completion email for order ${order.display_id || order.id}`);

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: {
        order: {
          ...order,
          display_id: order.display_id || order.id,
          summary: {
            raw_current_order_total: {
              value: order.total || 0,
            },
          },
        },
        shippingAddress: shippingAddress,
        emailOptions: {
          subject: `Order Confirmation #${order.display_id || order.id} - Kentenbobs`,
        },
      },
    });

    console.log(`✅ Order completion email sent to ${order.email} for order ${order.display_id || order.id}`);
  } catch (error) {
    console.error("❌ Failed to send order completion email:", error);
    // Don't throw - email failure shouldn't break order completion
  }
}
