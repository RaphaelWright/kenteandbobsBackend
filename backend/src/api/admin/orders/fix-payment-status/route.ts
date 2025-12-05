import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/orders/fix-payment-status
 * Diagnostic and fix endpoint for orders with payment status issues
 * 
 * Usage:
 * - POST with no body: Diagnose all orders and show which ones have payment issues
 * - POST with { fix: true }: Automatically fix all orders with payment issues
 * - POST with { order_id: "xxx" }: Fix a specific order
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const body = req.body as { fix?: boolean; order_id?: string } | undefined;
    const { fix = false, order_id = null } = body || {};
    
    // Resolve services
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // Fetch orders to check
    const filters: any = order_id ? { id: order_id } : {};
    
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "metadata",
        "created_at",
        "payment_collections.*",
      ],
      filters,
      pagination: {
        take: order_id ? 1 : 100, // Check recent 100 orders if no specific order
      },
    });

    const issues: any[] = [];
    const fixed: any[] = [];

    for (const order of orders) {
      // Get metadata safely
      let metadata: any = {};
      try {
        if (typeof order.metadata === 'string') {
          metadata = JSON.parse(order.metadata || '{}');
        } else if (order.metadata) {
          metadata = order.metadata;
        }
      } catch (error) {
        metadata = {};
      }

      // Check if order has payment data but payment_captured is not properly set
      const hasPaymentReference = metadata.payment_reference;
      const hasPaymentProvider = metadata.payment_provider === "paystack";
      const hasPaidAt = metadata.payment_paid_at;
      const hasSuccessStatus = metadata.payment_status === "success";
      const hasCapturedFlag = metadata.payment_captured === true || metadata.payment_captured === "true";
      const hasCapturedAt = metadata.payment_captured_at;
      const hasPaymentCollection = order.payment_collections?.length > 0;

      // Determine if order likely has been paid
      const likelyPaid = (
        (hasPaymentProvider && hasPaidAt) ||
        (hasPaymentProvider && hasSuccessStatus) ||
        (hasPaymentReference && hasSuccessStatus) ||
        (hasPaymentProvider && hasCapturedAt) ||
        hasPaymentCollection
      );

      // Check if payment_captured flag is missing or incorrect
      const needsFix = likelyPaid && !hasCapturedFlag;

      if (needsFix) {
        const issue: any = {
          order_id: order.id,
          display_id: order.display_id,
          email: order.email,
          created_at: order.created_at,
          current_metadata: {
            payment_status: metadata.payment_status,
            payment_captured: metadata.payment_captured,
            payment_captured_type: typeof metadata.payment_captured,
            payment_reference: metadata.payment_reference,
            payment_provider: metadata.payment_provider,
            payment_paid_at: metadata.payment_paid_at,
            payment_captured_at: metadata.payment_captured_at,
          },
          has_payment_collection: hasPaymentCollection,
          needs_fix: true,
        };

        issues.push(issue);

        // Fix the order if requested
        if (fix) {
          try {
            const updatedMetadata = {
              ...metadata,
              payment_captured: true,
              payment_captured_at: metadata.payment_captured_at || metadata.payment_paid_at || new Date().toISOString(),
            };

            // Only update payment_status if it's not already set
            if (!metadata.payment_status && (hasPaidAt || hasCapturedAt)) {
              updatedMetadata.payment_status = "success";
            }

            await orderModuleService.updateOrders([{
              id: order.id,
              metadata: updatedMetadata,
            }]);

            fixed.push({
              ...issue,
              fixed: true,
              new_metadata: {
                payment_status: updatedMetadata.payment_status,
                payment_captured: updatedMetadata.payment_captured,
                payment_captured_at: updatedMetadata.payment_captured_at,
              },
            });
          } catch (error: any) {
            console.error(`Failed to fix order ${order.id}:`, error);
            issue.fix_error = error.message;
          }
        }
      }
    }

    const response: any = {
      checked_orders: orders.length,
      issues_found: issues.length,
      issues: issues,
    };

    if (fix) {
      response.fixed_count = fixed.length;
      response.fixed_orders = fixed;
      response.message = `Fixed ${fixed.length} orders with payment status issues`;
    } else if (issues.length > 0) {
      response.message = `Found ${issues.length} orders with payment status issues. Send { "fix": true } to automatically fix them.`;
    } else {
      response.message = "No payment status issues found!";
    }

    res.status(200).json(response);

  } catch (error) {
    console.error("Error in fix-payment-status:", error);
    res.status(500).json({
      error: "Failed to check/fix payment status",
      message: error.message,
    });
  }
}
