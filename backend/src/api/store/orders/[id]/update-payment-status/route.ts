import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { PAYSTACK_SECRET_KEY } from "../../../../../lib/constants";

interface UpdatePaymentStatusRequest {
  payment_reference?: string;
  payment_status?: "pending" | "success" | "failed";
  payment_method?: string;
}

/**
 * POST /store/orders/:id/update-payment-status
 * Update payment status for an order
 * Can be called after payment is completed via Paystack or other methods
 * Requires authentication and order ownership verification
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Check authentication
    const authContext = req.session?.auth_context;
    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to update payment status",
      });
    }

    // Get order ID from params
    const orderId = req.params.id;
    if (!orderId) {
      return res.status(400).json({
        error: "Order ID is required",
      });
    }

    // Get request body
    const {
      payment_reference,
      payment_status,
      payment_method,
    } = req.body as UpdatePaymentStatusRequest;

    // Validate that at least payment_reference or payment_status is provided
    if (!payment_reference && !payment_status) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Either payment_reference or payment_status must be provided",
      });
    }

    // Resolve services
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    // Get customer email from auth
    const customerEmail = authContext.actor_id;
    if (!customerEmail) {
      return res.status(400).json({
        error: "Customer email not found",
      });
    }

    // Find customer
    const customers = await customerModuleService.listCustomers({
      email: customerEmail,
    });

    if (!customers || customers.length === 0) {
      return res.status(404).json({
        error: "Customer not found",
      });
    }

    const customer = customers[0];

    // Fetch the order
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "metadata",
        "status",
        "total",
      ],
      filters: {
        id: orderId,
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    const order = orders[0];

    // Verify order belongs to customer
    if (order.customer_id !== customer.id) {
      return res.status(403).json({
        error: "Unauthorized",
        message: "This order does not belong to you",
      });
    }

    // Prepare updated metadata
    const updatedMetadata: any = {
      ...order.metadata,
    };

    // If payment_reference is provided, verify with Paystack
    if (payment_reference) {
      if (!PAYSTACK_SECRET_KEY) {
        return res.status(503).json({
          error: "Payment system not configured",
          message: "Paystack is not configured. Please contact support.",
        });
      }

      try {
        // Verify payment with Paystack
        const paystackResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${payment_reference}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${PAYSTACK_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );

        const paystackResult = await paystackResponse.json();

        if (!paystackResponse.ok || !paystackResult.status) {
          console.error("Paystack verification error:", paystackResult);
          return res.status(400).json({
            error: "Payment verification failed",
            message: paystackResult.message || "Failed to verify payment with Paystack",
            details: paystackResult,
          });
        }

        const paymentData = paystackResult.data;

        // Check if payment was successful
        if (paymentData.status !== "success") {
          return res.status(400).json({
            error: "Payment not successful",
            message: `Payment status: ${paymentData.status}`,
            data: {
              status: paymentData.status,
              reference: paymentData.reference,
              gateway_response: paymentData.gateway_response,
            },
          });
        }

        // Verify amount matches (if order has total)
        if (order.total && paymentData.amount !== order.total) {
          console.warn("Amount mismatch:", {
            paystack_amount: paymentData.amount,
            order_total: order.total,
          });
          // Don't fail on amount mismatch, just log warning
        }

        // Update metadata with payment information
        updatedMetadata.payment_provider = "paystack";
        updatedMetadata.payment_reference = paymentData.reference;
        updatedMetadata.payment_status = "success";
        updatedMetadata.payment_captured = true;
        updatedMetadata.payment_channel = paymentData.channel;
        updatedMetadata.payment_paid_at = paymentData.paid_at;
        updatedMetadata.payment_transaction_id = paymentData.id;
        updatedMetadata.payment_gateway_response = paymentData.gateway_response;
        updatedMetadata.payment_updated_at = new Date().toISOString();

        if (paymentData.authorization) {
          updatedMetadata.payment_authorization_code = paymentData.authorization.authorization_code;
          updatedMetadata.payment_card_type = paymentData.authorization.card_type;
          updatedMetadata.payment_last4 = paymentData.authorization.last4;
          updatedMetadata.payment_bank = paymentData.authorization.bank;
        }

        console.log("Payment verified and order updated:", {
          order_id: orderId,
          reference: payment_reference,
          amount: paymentData.amount,
          status: paymentData.status,
        });
      } catch (error) {
        console.error("Error verifying payment with Paystack:", error);
        return res.status(500).json({
          error: "Payment verification failed",
          message: error.message || "Failed to verify payment",
        });
      }
    } 
    // If payment_status is provided directly (without verification)
    else if (payment_status) {
      updatedMetadata.payment_status = payment_status;
      updatedMetadata.payment_captured = payment_status === "success";
      updatedMetadata.payment_updated_at = new Date().toISOString();
      
      if (payment_method) {
        updatedMetadata.payment_method = payment_method;
      }

      if (payment_status === "success") {
        updatedMetadata.payment_captured_at = new Date().toISOString();
      } else if (payment_status === "failed") {
        updatedMetadata.payment_failed_at = new Date().toISOString();
      }
    }

    // Update the order
    await orderModuleService.updateOrders([{
      id: orderId,
      metadata: updatedMetadata,
    }]);

    // Fetch updated order
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
      filters: {
        id: orderId,
      },
    });

    const updatedOrder = updatedOrders[0];

    // Determine payment status for response
    let paymentStatus = "not_paid";
    if (updatedOrder.metadata?.payment_status === "success" || updatedOrder.metadata?.payment_captured === true) {
      paymentStatus = "captured";
    } else if (updatedOrder.metadata?.payment_status === "pending") {
      paymentStatus = "awaiting";
    } else if (updatedOrder.metadata?.payment_status === "failed") {
      paymentStatus = "failed";
    }

    res.status(200).json({
      success: true,
      message: "Payment status updated successfully",
      order: {
        id: updatedOrder.id,
        display_id: updatedOrder.display_id,
        status: updatedOrder.status,
        payment_status: paymentStatus,
        metadata: updatedOrder.metadata,
        total: updatedOrder.total,
        updated_at: updatedOrder.updated_at,
      },
    });

  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      error: "Failed to update payment status",
      message: error.message,
    });
  }
}
