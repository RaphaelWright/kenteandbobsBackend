import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * Helper to determine payment status from order data
 * IMPORTANT: This checks metadata for Paystack payments since we don't use payment_collections
 */
function getPaymentStatus(order: any): string {
  let metadata: any = {};
  try {
    metadata = typeof order.metadata === "string" 
      ? JSON.parse(order.metadata || "{}") 
      : (order.metadata || {});
  } catch {
    metadata = {};
  }

  // First check payment_collections (Medusa's standard)
  if (order.payment_collections?.[0]?.status) {
    return order.payment_collections[0].status;
  }

  // Then check metadata for Paystack payments - comprehensive check
  if (
    metadata.payment_status === "success" ||
    metadata.payment_captured === true ||
    metadata.payment_captured === "true" ||
    metadata.payment_captured_at ||
    metadata.payment_paid_at
  ) {
    return "captured";
  }

  if (metadata.payment_status === "pending" || metadata.payment_reference) {
    return "awaiting";
  }

  if (metadata.payment_status === "failed") {
    return "failed";
  }

  return "not_paid";
}

/**
 * GET /admin/orders/:id
 * Fetch a specific order by ID for admin panel
 * 
 * IMPORTANT: This endpoint properly recognizes Paystack payments from metadata.
 * Medusa's default endpoint only checks payment_collections, which we don't use.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const query = req.scope.resolve("query");
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Fetch the order with all details
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "items.*",
        "items.product.*",
        "items.product.images.*",
        "items.variant.*",
        "items.variant.options.*",
        "items.variant.options.option.*",
        "items.variant.inventory_items.*",
        "items.variant.inventory_items.inventory.*",
        "items.detail.*",
        "items.tax_lines.*",
        "items.adjustments.*",
        "shipping_address.*",
        "billing_address.*",
        "shipping_methods.*",
        "shipping_methods.tax_lines.*",
        "shipping_methods.adjustments.*",
        "payment_collections.*",
        "payment_collections.payments.*",
        "fulfillments.*",
        "fulfillments.items.*",
        "region.*",
        "customer.*",
        "promotions.*",
        "credit_lines.*",
      ],
      filters: { id: orderId },
    });

    if (!orders?.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orders[0];

    // Parse metadata safely
    let metadata: any = {};
    try {
      metadata = typeof order.metadata === "string" 
        ? JSON.parse(order.metadata || "{}") 
        : (order.metadata || {});
    } catch (error) {
      console.warn(`Failed to parse metadata for order ${order.id}:`, error);
      metadata = {};
    }

    // Calculate payment status from metadata (Paystack) or payment_collections (Medusa standard)
    const paymentStatus = getPaymentStatus(order);

    // Calculate fulfillment status
    const fulfillmentStatus = order.fulfillments?.length > 0 ? "fulfilled" : "not_fulfilled";

    // Build comprehensive response with corrected payment_status
    const response = {
      order: {
        ...order,
        metadata, // Use parsed metadata
        payment_status: paymentStatus, // Override Medusa's calculation
        fulfillment_status: fulfillmentStatus,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      error: "Failed to fetch order",
      message: error.message,
    });
  }
}

