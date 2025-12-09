import {
  createWorkflow,
  WorkflowResponse,
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk";
import type { WorkflowTypes } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Input for creating Paystack payment collection
 */
interface CreatePaystackPaymentInput {
  order_id: string;
  amount: number;
  currency_code: string;
  region_id?: string;
  payment_data: {
    reference: string;
    transaction_id: number;
    channel: string;
    paid_at: string;
    gateway_response: string;
    authorization?: any;
  };
}

/**
 * Step: Create Payment Collection
 */
const createPaymentCollectionStep = createStep(
  "create-payment-collection-step",
  async (
    input: CreatePaystackPaymentInput,
    { container }
  ) => {
    const paymentModule = container.resolve(Modules.PAYMENT);

    // Create payment collection
    const paymentCollection = await paymentModule.createPaymentCollections({
      currency_code: input.currency_code,
      amount: input.amount,
    });

    return new StepResponse(paymentCollection, paymentCollection.id);
  },
  async (paymentCollectionId, { container }) => {
    // Compensation: Delete payment collection if workflow fails
    const paymentModule = container.resolve(Modules.PAYMENT);
    await paymentModule.deletePaymentCollections([paymentCollectionId]);
  }
);

/**
 * Step: Create Payment Session
 */
const createPaymentSessionStep = createStep(
  "create-payment-session-step",
  async (
    input: {
      payment_collection_id: string;
      payment_data: CreatePaystackPaymentInput["payment_data"];
      amount: number;
      currency_code: string;
    },
    { container }
  ) => {
    const paymentModule = container.resolve(Modules.PAYMENT);

    try {
      // Create payment session for Paystack
      const paymentSession = await paymentModule.createPaymentSession(
        input.payment_collection_id,
        {
          provider_id: "paystack",
          amount: input.amount,
          currency_code: input.currency_code,
          data: input.payment_data,
          context: {},
        }
      );

      // Immediately mark as authorized since payment is already completed
      const authorizedSession = await paymentModule.authorizePaymentSession(
        paymentSession.id,
        {}
      );

      return new StepResponse(authorizedSession, paymentSession.id);
    } catch (error) {
      console.error("Error in createPaymentSessionStep:", error);
      throw error;
    }
  },
  async (paymentSessionId, { container }) => {
    try {
      // Compensation: Delete payment session if workflow fails
      const paymentModule = container.resolve(Modules.PAYMENT);
      await paymentModule.deletePaymentSession(paymentSessionId);
    } catch (error) {
      console.error("Error in createPaymentSessionStep compensation:", error);
    }
  }
);

/**
 * Step: Link Payment Collection to Order
 */
const linkPaymentCollectionToOrderStep = createStep(
  "link-payment-collection-to-order-step",
  async (
    input: {
      order_id: string;
      payment_collection_id: string;
    },
    { container }
  ) => {
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    await remoteLink.create({
      [Modules.ORDER]: {
        order_id: input.order_id,
      },
      [Modules.PAYMENT]: {
        payment_collection_id: input.payment_collection_id,
      },
    });

    return new StepResponse(
      { linked: true },
      { order_id: input.order_id, payment_collection_id: input.payment_collection_id }
    );
  },
  async (linkData, { container }) => {
    // Compensation: Remove link if workflow fails
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    await remoteLink.dismiss({
      [Modules.ORDER]: {
        order_id: linkData.order_id,
      },
      [Modules.PAYMENT]: {
        payment_collection_id: linkData.payment_collection_id,
      },
    });
  }
);

/**
 * Workflow: Create Paystack Payment Collection
 * 
 * This workflow:
 * 1. Creates a payment collection
 * 2. Creates a payment session with Paystack data
 * 3. Authorizes the session (payment already completed)
 * 4. Links the payment collection to the order
 * 
 * Includes rollback logic for each step.
 */
export const createPaystackPaymentCollectionWorkflow = createWorkflow(
  "create-paystack-payment-collection",
  function (input: CreatePaystackPaymentInput) {
    // Step 1: Create payment collection
    const paymentCollection = createPaymentCollectionStep(input);

    // Step 2: Create and authorize payment session
    const paymentSession = createPaymentSessionStep({
      payment_collection_id: paymentCollection.id,
      payment_data: input.payment_data,
      amount: input.amount,
      currency_code: input.currency_code,
    });

    // Step 3: Link to order
    const link = linkPaymentCollectionToOrderStep({
      order_id: input.order_id,
      payment_collection_id: paymentCollection.id,
    });

    return new WorkflowResponse({
      payment_collection: paymentCollection,
      payment_session: paymentSession,
      link,
    });
  }
) as WorkflowTypes.ReturnWorkflow<CreatePaystackPaymentInput, any, any>;

