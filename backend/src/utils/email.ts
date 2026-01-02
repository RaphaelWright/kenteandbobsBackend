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

    // Create fallback address if none exists
    if (!shippingAddress || !shippingAddress.first_name) {
      console.warn("⚠️ Sending order email with fallback address (no shipping address found)", {
        order_id: order.id,
        has_shipping_address: !!order.shipping_address,
        has_metadata_address: !!order.metadata?.delivery_address,
      });
      
      // Use a fallback address structure
      shippingAddress = {
        first_name: order.customer_id || "Valued",
        last_name: "Customer",
        address_1: "Address not provided",
        city: "",
        province: "",
        postal_code: "",
        country_code: "GH",
      };
    }

    console.log(`📧 Preparing order completion email for order ${order.display_id || order.id}`);

    // Convert amounts from pesewas to cedis (divide by 100)
    const convertToCedis = (amount: any): number => {
      if (typeof amount === 'object' && amount !== null && 'toNumber' in amount) {
        return (amount as any).toNumber() / 100;
      }
      return (Number(amount) || 0) / 100;
    };

    // Prepare email data with safe defaults and convert currency
    const emailData = {
      order: {
        id: order.id,
        display_id: order.display_id || order.id,
        created_at: order.created_at || new Date().toISOString(),
        email: order.email,
        currency_code: order.currency_code || 'GHS',
        items: Array.isArray(order.items) 
          ? order.items.map((item: any) => ({
              id: item.id,
              title: item.title || item.product_title || 'Item',
              subtitle: item.subtitle || '',
              quantity: item.quantity || 1,
              unit_price: convertToCedis(item.unit_price),
              total: convertToCedis(item.total),
            }))
          : [],
        total: convertToCedis(order.total),
        summary: {
          raw_current_order_total: {
            value: convertToCedis(order.total),
          },
        },
      },
      shippingAddress: shippingAddress,
      emailOptions: {
        subject: `Order Confirmation #${order.display_id || order.id} - Kentenbobs`,
      },
    };

    console.log(`📧 Email data prepared:`, {
      to: order.email,
      order_id: emailData.order.id,
      display_id: emailData.order.display_id,
      items_count: emailData.order.items.length,
      has_shipping_address: !!shippingAddress?.first_name,
      shippingAddress_keys: Object.keys(shippingAddress || {}),
    });

    // Validate email data before sending
    if (!emailData.order || !emailData.shippingAddress) {
      throw new Error("Email data validation failed: missing order or shipping address");
    }

    await notificationModuleService.createNotifications({
      to: order.email,
      channel: "email",
      template: "order-placed",
      data: emailData,
    });

    console.log(`✅ Order completion email sent to ${order.email} for order ${order.display_id || order.id}`);
  } catch (error) {
    console.error("❌ Failed to send order completion email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      order_id: order?.id,
    });
    // Don't throw - email failure shouldn't break order completion
  }
}

/**
 * Send vendor order notification email
 */
export async function sendVendorOrderNotificationEmail(
  notificationModuleService: INotificationModuleService,
  order: any,
  vendorEmail: string = 'kentenbobs@gmail.com'
): Promise<void> {
  try {
    // Validate required fields
    if (!order || !order.email) {
      console.warn("⚠️ Cannot send vendor notification: missing order or order email");
      return;
    }

    if (!vendorEmail) {
      console.warn("⚠️ Cannot send vendor notification: missing vendor email");
      return;
    }

    console.log(`📧 Preparing vendor order notification for order ${order.display_id || order.id}`);

    // Extract customer information
    const customerName = order.customer?.first_name 
      ? `${order.customer.first_name}${order.customer.last_name ? ' ' + order.customer.last_name : ''}`
      : order.billing_address?.first_name
      ? `${order.billing_address.first_name}${order.billing_address.last_name ? ' ' + order.billing_address.last_name : ''}`
      : 'Customer';

    const customerEmail = order.email || 'N/A';
    const itemsCount = Array.isArray(order.items) ? order.items.length : 0;

    // Prepare email data for vendor
    const vendorEmailData = {
      order: {
        id: order.id,
        display_id: order.display_id || order.id,
        created_at: order.created_at || new Date().toISOString(),
        email: order.email,
        currency_code: order.currency_code || 'GHS',
        items: Array.isArray(order.items)
          ? order.items.map((item: any) => ({
              id: item.id,
              title: item.title || item.product_title || 'Item',
              subtitle: item.subtitle || '',
              quantity: item.quantity || 1,
              unit_price: typeof item.unit_price === 'number' ? item.unit_price : Number(item.unit_price) || 0,
              total: typeof item.total === 'number' ? item.total : Number(item.total) || 0,
            }))
          : [],
        total: typeof order.total === 'number' ? order.total : Number(order.total) || 0,
        summary: order.summary || { raw_current_order_total: { value: order.total || 0 } },
      },
      customerName,
      customerEmail,
      itemsCount,
      emailOptions: {
        subject: `New Order Alert - Order #${order.display_id || order.id}`,
      },
    };

    console.log(`📧 Vendor email data prepared:`, {
      vendor_to: vendorEmail,
      order_id: vendorEmailData.order.id,
      display_id: vendorEmailData.order.display_id,
      customer_name: customerName,
      items_count: itemsCount,
    });

    await notificationModuleService.createNotifications({
      to: vendorEmail,
      channel: "email",
      template: "vendor-order-notification",
      data: vendorEmailData,
    });

    console.log(`✅ Vendor notification email sent to ${vendorEmail} for order ${order.display_id || order.id}`);
  } catch (error) {
    console.error("❌ Failed to send vendor notification email:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      order_id: order?.id,
    });
    // Don't throw - vendor email failure shouldn't break order completion
  }
}
