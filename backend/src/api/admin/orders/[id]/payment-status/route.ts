import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /admin/orders/:id/payment-status
 * Get the correct payment status for an order
 * Checks both payment_collections (Medusa standard) and metadata (Paystack)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const query = req.scope.resolve("query");

    // Fetch just the order's payment-related data
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "metadata",
        "payment_collections.*",
        "payment_collections.payments.*",
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
    } catch {
      metadata = {};
    }

    // Determine payment status
    let paymentStatus = "not_paid";
    let paymentDetails: any = {};

    // Check payment_collections first (Medusa standard)
    if (order.payment_collections?.[0]?.status) {
      paymentStatus = order.payment_collections[0].status;
      paymentDetails = {
        source: "payment_collections",
        collection_status: order.payment_collections[0].status,
      };
    }
    // Then check metadata for Paystack payments
    else if (
      metadata.payment_status === "success" ||
      metadata.payment_captured === true ||
      metadata.payment_captured === "true" ||
      metadata.payment_captured_at ||
      metadata.payment_paid_at
    ) {
      paymentStatus = "captured";
      paymentDetails = {
        source: "metadata",
        provider: metadata.payment_provider || "unknown",
        reference: metadata.payment_reference,
        captured_at: metadata.payment_captured_at || metadata.payment_paid_at,
        transaction_id: metadata.payment_transaction_id,
        channel: metadata.payment_channel,
      };
    }
    else if (metadata.payment_status === "pending" || metadata.payment_reference) {
      paymentStatus = "awaiting";
      paymentDetails = {
        source: "metadata",
        provider: metadata.payment_provider || "unknown",
        reference: metadata.payment_reference,
      };
    }
    else if (metadata.payment_status === "failed") {
      paymentStatus = "failed";
      paymentDetails = {
        source: "metadata",
        provider: metadata.payment_provider || "unknown",
        reference: metadata.payment_reference,
      };
    }

    res.status(200).json({
      order_id: orderId,
      payment_status: paymentStatus,
      details: paymentDetails,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      error: "Failed to fetch payment status",
      message: error.message,
    });
  }
}

