import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { createHmac } from "crypto";
import { PAYSTACK_SECRET_KEY } from "../../../../../lib/constants";

/**
 * POST /store/payments/paystack/webhook
 * Handle Paystack webhook events
 * Verifies webhook signature and processes events
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check if Paystack is configured
    if (!PAYSTACK_SECRET_KEY) {
      console.error("Paystack webhook: Secret key not configured");
      // Return 200 to prevent Paystack from retrying
      return res.status(200).json({
        message: "Webhook received but Paystack not configured",
      });
    }

    // Get webhook signature from headers
    const signature = req.headers["x-paystack-signature"] as string;
    if (!signature) {
      console.error("Paystack webhook: Missing signature");
      return res.status(400).json({
        error: "Missing signature",
        message: "x-paystack-signature header is required",
      });
    }

    // Get raw body for signature verification
    // Note: In Medusa, req.rawBody should be available
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // Verify webhook signature
    const hash = createHmac("sha512", PAYSTACK_SECRET_KEY)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.error("Paystack webhook: Invalid signature");
      return res.status(400).json({
        error: "Invalid signature",
        message: "Webhook signature verification failed",
      });
    }

    // Parse webhook event
    const event = req.body as {
      event: string;
      data: any;
    };

    console.log("Paystack webhook received:", {
      event: event.event,
      reference: event.data?.reference,
      status: event.data?.status,
    });

    // Process webhook event
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data, req);
        break;

      case "charge.failed":
        await handleChargeFailed(event.data, req);
        break;

      case "transfer.success":
        await handleTransferSuccess(event.data, req);
        break;

      case "transfer.failed":
        await handleTransferFailed(event.data, req);
        break;

      case "refund.processed":
        await handleRefundProcessed(event.data, req);
        break;

      default:
        console.log(`Unhandled webhook event: ${event.event}`);
    }

    // Always return 200 to acknowledge receipt
    res.status(200).json({
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    // Still return 200 to prevent retries
    res.status(200).json({
      message: "Webhook received with errors",
      error: error.message,
    });
  }
}

/**
 * Handle successful charge event
 */
async function handleChargeSuccess(data: any, req: MedusaRequest) {
  try {
    console.log("Processing charge.success:", {
      reference: data.reference,
      amount: data.amount,
      customer: data.customer?.email,
    });

    // Find order by payment reference and update payment status
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // Search for orders with this payment reference in metadata
    // Note: We fetch all orders and filter manually since metadata filtering may not work
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "metadata",
        "status",
        "total",
      ],
      filters: {},
      pagination: {
        take: 100, // Limit to recent 100 orders for performance
      },
    });

    // Find order with matching payment reference
    const matchingOrder = orders.find((order: any) => 
      order.metadata?.payment_reference === data.reference
    );

    if (matchingOrder) {
      // Prepare comprehensive payment metadata
      const updatedMetadata = {
        ...matchingOrder.metadata,
        payment_status: "success",
        payment_captured: true,
        payment_captured_at: data.paid_at || new Date().toISOString(),
        payment_gateway_response: data.gateway_response,
        webhook_received_at: new Date().toISOString(),
        payment_channel: data.channel,
        payment_transaction_id: data.id,
      };

      // Add authorization details if available
      if (data.authorization) {
        updatedMetadata.payment_authorization_code = data.authorization.authorization_code;
        updatedMetadata.payment_card_type = data.authorization.card_type;
        updatedMetadata.payment_last4 = data.authorization.last4;
        updatedMetadata.payment_bank = data.authorization.bank;
      }

      // Update order metadata to mark payment as captured
      await orderModuleService.updateOrders([{
        id: matchingOrder.id,
        metadata: updatedMetadata,
      }]);

      console.log("✓ Order payment status updated via webhook:", {
        order_id: matchingOrder.id,
        reference: data.reference,
        amount: data.amount,
        status: "success",
      });
    } else {
      console.log("⚠ No order found for payment reference:", data.reference);
      console.log("Searched through", orders.length, "orders");
    }

  } catch (error) {
    console.error("Error handling charge.success:", error);
  }
}

/**
 * Handle failed charge event
 */
async function handleChargeFailed(data: any, req: MedusaRequest) {
  try {
    console.log("Processing charge.failed:", {
      reference: data.reference,
      amount: data.amount,
      customer: data.customer?.email,
      gateway_response: data.gateway_response,
    });

    // Find order by payment reference and update payment status
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // Search for orders with this payment reference in metadata
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "metadata",
        "status",
      ],
      filters: {},
      pagination: {
        take: 100, // Limit to recent 100 orders for performance
      },
    });

    // Find order with matching payment reference
    const matchingOrder = orders.find((order: any) => 
      order.metadata?.payment_reference === data.reference
    );

    if (matchingOrder) {
      // Update order metadata to mark payment as failed
      await orderModuleService.updateOrders([{
        id: matchingOrder.id,
        metadata: {
          ...matchingOrder.metadata,
          payment_status: "failed",
          payment_captured: false,
          payment_failed_at: new Date().toISOString(),
          payment_failure_reason: data.gateway_response,
          payment_channel: data.channel,
          payment_transaction_id: data.id,
          webhook_received_at: new Date().toISOString(),
        },
      }]);

      console.log("✗ Order payment marked as failed via webhook:", {
        order_id: matchingOrder.id,
        reference: data.reference,
        reason: data.gateway_response,
      });
    } else {
      console.log("⚠ No order found for payment reference:", data.reference);
      console.log("Searched through", orders.length, "orders");
    }

  } catch (error) {
    console.error("Error handling charge.failed:", error);
  }
}

/**
 * Handle successful transfer event
 */
async function handleTransferSuccess(data: any, req: MedusaRequest) {
  try {
    console.log("Processing transfer.success:", {
      reference: data.reference,
      amount: data.amount,
      recipient: data.recipient,
    });

    // TODO: Add logic for successful transfers if you implement payouts

  } catch (error) {
    console.error("Error handling transfer.success:", error);
  }
}

/**
 * Handle failed transfer event
 */
async function handleTransferFailed(data: any, req: MedusaRequest) {
  try {
    console.log("Processing transfer.failed:", {
      reference: data.reference,
      amount: data.amount,
      recipient: data.recipient,
    });

    // TODO: Add logic for failed transfers if you implement payouts

  } catch (error) {
    console.error("Error handling transfer.failed:", error);
  }
}

/**
 * Handle refund processed event
 */
async function handleRefundProcessed(data: any, req: MedusaRequest) {
  try {
    console.log("Processing refund.processed:", {
      reference: data.reference,
      amount: data.amount,
      status: data.status,
    });

    // TODO: Add logic to handle refunds
    // - Update order status
    // - Send notification to customer
    // - Update payment records

  } catch (error) {
    console.error("Error handling refund.processed:", error);
  }
}

