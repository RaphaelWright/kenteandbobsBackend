import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/orders/diagnose-payment
 * Diagnose and optionally fix orders that have payment captured but not showing as paid
 * 
 * This is useful for orders created before the payment_captured flag was properly set.
 * 
 * Usage:
 * - POST {} : Just diagnose (show which orders need fixing)
 * - POST { fix: true } : Fix all orders with issues
 * - POST { order_id: "xxx" } : Diagnose/fix specific order
 * - POST { order_id: "xxx", fix: true } : Fix specific order
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const { fix = false, order_id = null } = req.body as { 
      fix?: boolean; 
      order_id?: string;
    } || {};

    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // Build filters
    const filters: any = {};
    if (order_id) {
      filters.id = order_id;
    }

    // Fetch orders
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "total",
        "metadata",
        "created_at",
        "payment_collections.*",
      ],
      filters,
      pagination: {
        take: 1000, // Check up to 1000 orders
      },
    });

    const issues: any[] = [];
    const fixed: any[] = [];

    for (const order of orders) {
      // Parse metadata safely
      let metadata: any = {};
      try {
        metadata = typeof order.metadata === "string" 
          ? JSON.parse(order.metadata || "{}") 
          : (order.metadata || {});
      } catch {
        metadata = {};
      }

      // Check if order has payment info indicating it should be paid
      const hasPaymentReference = !!metadata.payment_reference;
      const isPaystack = metadata.payment_provider === "paystack";
      const hasPaidAt = !!metadata.payment_paid_at;
      const hasSuccessStatus = metadata.payment_status === "success";
      const hasCapturedFlag = metadata.payment_captured === true;
      const hasCapturedAt = !!metadata.payment_captured_at;
      const hasTransactionId = !!metadata.payment_transaction_id;

      // Determine if this order should be marked as paid
      const shouldBePaid = (
        (isPaystack && hasSuccessStatus) ||
        (isPaystack && hasPaidAt) ||
        (isPaystack && hasTransactionId && hasPaymentReference) ||
        (hasPaymentReference && hasSuccessStatus)
      );

      // Check if it's missing the captured flag
      const needsFix = shouldBePaid && !hasCapturedFlag;

      if (needsFix) {
        const issue = {
          order_id: order.id,
          display_id: order.display_id,
          email: order.email,
          total: order.total,
          created_at: order.created_at,
          payment_provider: metadata.payment_provider,
          payment_reference: metadata.payment_reference,
          payment_status: metadata.payment_status,
          payment_captured: metadata.payment_captured,
          payment_captured_at: metadata.payment_captured_at,
          payment_paid_at: metadata.payment_paid_at,
          has_transaction_id: hasTransactionId,
          should_be_paid: shouldBePaid,
          needs_fix: true,
        };

        issues.push(issue);

        // Fix if requested
        if (fix) {
          try {
            const updatedMetadata = {
              ...metadata,
              payment_captured: true,
              payment_captured_at: metadata.payment_captured_at || metadata.payment_paid_at || new Date().toISOString(),
              payment_status: "success",
            };

            await orderModuleService.updateOrders([{
              id: order.id,
              metadata: updatedMetadata,
            }]);

            fixed.push({
              order_id: order.id,
              display_id: order.display_id,
              status: "fixed",
            });
          } catch (error) {
            fixed.push({
              order_id: order.id,
              display_id: order.display_id,
              status: "error",
              error: error.message,
            });
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      orders_checked: orders.length,
      orders_with_issues: issues.length,
      fixed_mode: fix,
      orders_fixed: fix ? fixed.length : 0,
      issues: issues.length > 0 ? issues : undefined,
      fixed: fix && fixed.length > 0 ? fixed : undefined,
      message: fix 
        ? `Fixed ${fixed.length} orders out of ${issues.length} with payment issues`
        : issues.length > 0
          ? `Found ${issues.length} orders that need fixing. Call with { fix: true } to fix them.`
          : "No orders need fixing - all payment statuses are correct!",
    });
  } catch (error) {
    console.error("Error diagnosing payment status:", error);
    res.status(500).json({
      error: "Failed to diagnose payment status",
      message: error.message,
    });
  }
}

