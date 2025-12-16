import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { FLUTTERWAVE_SECRET_KEY } from "../../../../../lib/constants";
import crypto from "crypto";

/**
 * POST /store/payments/flutterwave/webhook
 * Handle Flutterwave webhook events
 * Processes real-time payment status updates
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check if Flutterwave is configured
    if (!FLUTTERWAVE_SECRET_KEY) {
      return res.status(503).json({
        error: "Payment system not configured",
        message: "Flutterwave is not configured",
      });
    }

    // Verify webhook signature
    const signature = req.headers["verif-hash"] as string;
    
    if (!signature) {
      console.error("Flutterwave webhook: Missing signature");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Missing webhook signature",
      });
    }

    // Flutterwave uses a secret hash for webhook verification
    // The secret hash should be set in your Flutterwave dashboard
    const secretHash = process.env.FLUTTERWAVE_WEBHOOK_SECRET || FLUTTERWAVE_SECRET_KEY;
    
    if (signature !== secretHash) {
      console.error("Flutterwave webhook: Invalid signature");
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid webhook signature",
      });
    }

    const webhookData = req.body as any;

    console.log("Flutterwave webhook received:", {
      event: webhookData?.event,
      tx_ref: webhookData?.data?.tx_ref,
      transaction_id: webhookData?.data?.id,
      status: webhookData?.data?.status,
    });

    // Handle different webhook events
    const event = webhookData?.event;
    const paymentData = webhookData?.data;

    if (!paymentData) {
      return res.status(400).json({
        error: "Invalid webhook",
        message: "Missing payment data",
      });
    }

    // Only process successful payments
    if (event === "charge.completed" && paymentData.status === "successful") {
      const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

      // Find order by payment reference
      const txRef = paymentData.tx_ref;
      const transactionId = paymentData.id?.toString();

      if (!txRef && !transactionId) {
        console.error("Flutterwave webhook: Missing transaction reference");
        return res.status(400).json({
          error: "Invalid webhook",
          message: "Missing transaction reference",
        });
      }

      // Search for orders with this payment reference
      try {
        const orders = await orderModuleService.listOrders({
          metadata: {
            payment_reference: txRef,
          },
        } as any);

        if (!orders || orders.length === 0) {
          console.log("Flutterwave webhook: Order not found for reference:", txRef);
          // Order might not be created yet, this is not an error
          return res.status(200).json({
            success: true,
            message: "Webhook received, order not found yet",
          });
        }

        const order = orders[0];

        // Update order metadata with confirmed payment status
        const currentMetadata = typeof order.metadata === 'string' 
          ? JSON.parse(order.metadata || '{}') 
          : (order.metadata || {});

        const updatedMetadata = {
          ...currentMetadata,
          payment_status: "success",
          payment_captured: true,
          payment_captured_at: paymentData.created_at,
          payment_transaction_id: transactionId,
          payment_channel: paymentData.payment_type,
          payment_webhook_received: true,
          payment_webhook_received_at: new Date().toISOString(),
        };

        await orderModuleService.updateOrders([{
          id: order.id,
          metadata: updatedMetadata,
        }]);

        console.log("Flutterwave webhook: Order updated successfully:", {
          order_id: order.id,
          tx_ref: txRef,
          transaction_id: transactionId,
        });

        return res.status(200).json({
          success: true,
          message: "Order payment status updated",
        });
      } catch (error) {
        console.error("Flutterwave webhook: Error updating order:", error);
        // Don't fail the webhook if order update fails
        return res.status(200).json({
          success: true,
          message: "Webhook received",
          note: "Order update failed but webhook acknowledged",
        });
      }
    }

    // For other events, just acknowledge receipt
    return res.status(200).json({
      success: true,
      message: "Webhook received",
    });
  } catch (error) {
    console.error("Error processing Flutterwave webhook:", error);
    
    // Always return 200 to Flutterwave to avoid retries for errors we can't handle
    return res.status(200).json({
      success: true,
      message: "Webhook received",
      note: "Processing error occurred but webhook acknowledged",
    });
  }
}

