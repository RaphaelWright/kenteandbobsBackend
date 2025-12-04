import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
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

    // Note: Order creation is handled in the verify endpoint
    // This webhook is primarily for logging and redundancy
    // You can add additional logic here if needed (e.g., sending confirmation emails)

    // TODO: Add order status update logic if needed
    // const orderModuleService = req.scope.resolve(Modules.ORDER);
    // Check if order exists for this reference and update status if needed

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

    // TODO: Add logic to handle failed payments
    // - Log the failure
    // - Send notification to customer
    // - Update any payment records

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

