import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/orders/:id/fulfill
 * Mark an order as fulfilled/completed
 * 
 * Updates the order metadata to mark it as fulfilled and records
 * the fulfillment timestamp and admin user who fulfilled it.
 * 
 * This endpoint:
 * 1. Verifies the order exists
 * 2. Retrieves current metadata
 * 3. Updates metadata with fulfillment information
 * 4. Returns the updated order information
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Order ID is required",
      });
    }

    // Resolve services
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // First, verify the order exists and get current metadata
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "metadata",
      ],
      filters: { id: orderId },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: `Order with ID ${orderId} not found`,
      });
    }

    const order = orders[0];

    // Parse existing metadata safely
    let existingMetadata: any = {};
    try {
      if (typeof order.metadata === "string") {
        existingMetadata = JSON.parse(order.metadata || "{}");
      } else if (order.metadata) {
        existingMetadata = order.metadata;
      }
    } catch (error) {
      console.warn(`Failed to parse metadata for order ${orderId}, using empty object:`, error);
      existingMetadata = {};
    }

    // Get admin user info from auth context (if available)
    const authContext = req.session?.auth_context;
    const fulfilledBy = authContext?.actor_id || authContext?.auth_identity_id || "admin";

    // Prepare updated metadata with fulfillment information
    // Preserve all existing metadata and add fulfillment fields
    const updatedMetadata = {
      ...existingMetadata,
      fulfillment_status: "fulfilled",
      fulfilled_at: new Date().toISOString(),
      fulfilled_by: fulfilledBy,
    };

    // Update the order
    await orderModuleService.updateOrders([
      {
        id: orderId,
        metadata: updatedMetadata,
      },
    ]);

    // Fetch the updated order to return in response
    const { data: updatedOrders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "metadata",
        "total",
        "created_at",
        "updated_at",
      ],
      filters: { id: orderId },
    });

    const updatedOrder = updatedOrders[0];

    // Parse updated metadata for response
    let responseMetadata: any = {};
    try {
      if (typeof updatedOrder.metadata === "string") {
        responseMetadata = JSON.parse(updatedOrder.metadata || "{}");
      } else if (updatedOrder.metadata) {
        responseMetadata = updatedOrder.metadata;
      }
    } catch {
      responseMetadata = updatedMetadata;
    }

    res.status(200).json({
      success: true,
      message: "Order marked as fulfilled successfully",
      order: {
        id: updatedOrder.id,
        display_id: updatedOrder.display_id,
        status: updatedOrder.status,
        metadata: responseMetadata,
        fulfillment_status: "fulfilled",
        fulfilled_at: responseMetadata.fulfilled_at,
        fulfilled_by: responseMetadata.fulfilled_by,
      },
    });
  } catch (error: any) {
    console.error("Error fulfilling order:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to fulfill order",
      details: error.message,
    });
  }
}

