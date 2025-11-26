import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import PaystackService from "../../../../../modules/paystack/service";

/**
 * POST /store/payments/paystack/webhook
 * Handle Paystack webhook events
 * 
 * Common events:
 * - charge.success: Payment successful
 * - charge.failed: Payment failed
 * - transfer.success: Transfer successful
 * - transfer.failed: Transfer failed
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const paystackService: PaystackService = req.scope.resolve("paystackService");
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);

    // Get Paystack signature from header
    const signature = req.headers["x-paystack-signature"] as string;
    
    if (!signature) {
      return res.status(400).json({
        error: "Missing signature",
        message: "x-paystack-signature header is required",
      });
    }

    // Get raw body (need to preserve it for signature verification)
    const rawBody = JSON.stringify(req.body);

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(rawBody, signature);
    
    if (!isValid) {
      console.error("Invalid Paystack webhook signature");
      return res.status(401).json({
        error: "Invalid signature",
        message: "Webhook signature verification failed",
      });
    }

    // Parse event
    const event = req.body;
    const eventType = event.event;
    const eventData = event.data;

    console.log(`Paystack webhook received: ${eventType}`, {
      reference: eventData?.reference,
      status: eventData?.status,
    });

    // Handle different event types
    switch (eventType) {
      case "charge.success":
        await handleChargeSuccess(eventData, orderModuleService);
        break;

      case "charge.failed":
        await handleChargeFailed(eventData, orderModuleService);
        break;

      case "transfer.success":
        console.log("Transfer successful:", eventData.reference);
        // Handle successful transfer (e.g., for refunds or payouts)
        break;

      case "transfer.failed":
        console.log("Transfer failed:", eventData.reference);
        // Handle failed transfer
        break;

      case "refund.processed":
        console.log("Refund processed:", eventData.reference);
        // Handle refund
        break;

      default:
        console.log(`Unhandled Paystack event type: ${eventType}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    
    // Still return 200 to prevent Paystack from retrying
    // Log the error for manual investigation
    res.status(200).json({
      success: false,
      message: "Webhook received but processing failed",
      error: error.message,
    });
  }
}

/**
 * Handle successful charge
 */
async function handleChargeSuccess(
  data: any,
  orderModuleService: IOrderModuleService
) {
  try {
    const reference = data.reference;
    const cartId = data.metadata?.cart_id;

    if (!cartId) {
      console.log("No cart_id in payment metadata, skipping order creation");
      return;
    }

    // Check if order already exists for this payment
    // (This webhook might be called multiple times or after verification)
    console.log("Payment successful via webhook:", {
      reference,
      amount: data.amount,
      status: data.status,
      cart_id: cartId,
    });

    // Note: Order creation is typically handled in the verify endpoint
    // This webhook is mainly for logging and redundancy
    // You can add additional logic here if needed
  } catch (error) {
    console.error("Error handling charge.success webhook:", error);
    throw error;
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(
  data: any,
  orderModuleService: IOrderModuleService
) {
  try {
    console.log("Payment failed via webhook:", {
      reference: data.reference,
      message: data.gateway_response,
    });

    // Log failed payment for analytics
    // You might want to notify the customer or take other actions
  } catch (error) {
    console.error("Error handling charge.failed webhook:", error);
    throw error;
  }
}

