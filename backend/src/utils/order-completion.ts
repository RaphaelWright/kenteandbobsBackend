/**
 * Order completion utilities
 * 
 * These utilities help the backend understand that orders can be completed
 * in two ways:
 * 1. Via cart/complete endpoint (traditional checkout flow)
 * 2. Via payment verification (payment-first flow)
 * 
 * Both flows are valid and result in a complete order.
 */

/**
 * Check if an order has been completed (cart converted to order)
 * 
 * An order is considered completed if:
 * - It was created via cart/complete endpoint
 * - It was created via payment verification
 * - It has the cart_completed flag in metadata
 * 
 * @param order - The order object
 * @returns boolean indicating if the order is complete
 */
export function isOrderCompleted(order: any): boolean {
  if (!order) return false;

  let metadata: any = {};
  try {
    metadata = typeof order.metadata === "string" 
      ? JSON.parse(order.metadata || "{}") 
      : (order.metadata || {});
  } catch {
    metadata = {};
  }

  // Check explicit completion flag
  if (metadata.cart_completed === true) {
    return true;
  }

  // Check if order was completed via payment verification
  // Payment verification always creates a complete order
  if (metadata.order_completed_via === "payment_verification") {
    return true;
  }

  // Check if order was completed via cart/complete
  if (metadata.order_completed_via === "cart_complete") {
    return true;
  }

  // Check if order has payment captured (indicates completion)
  if (metadata.payment_captured === true || metadata.payment_captured_at) {
    return true;
  }

  // If order exists and has items, it's likely completed
  // (Orders can only be created through completion endpoints)
  if (order.items && order.items.length > 0) {
    return true;
  }

  return false;
}

/**
 * Get the method used to complete the order
 * 
 * @param order - The order object
 * @returns "payment_verification" | "cart_complete" | "unknown"
 */
export function getOrderCompletionMethod(order: any): "payment_verification" | "cart_complete" | "unknown" {
  if (!order) return "unknown";

  let metadata: any = {};
  try {
    metadata = typeof order.metadata === "string" 
      ? JSON.parse(order.metadata || "{}") 
      : (order.metadata || {});
  } catch {
    metadata = {};
  }

  if (metadata.order_completed_via === "payment_verification") {
    return "payment_verification";
  }

  if (metadata.order_completed_via === "cart_complete") {
    return "cart_complete";
  }

  // Try to infer from other metadata
  if (metadata.payment_captured === true && metadata.payment_provider === "paystack") {
    // Likely completed via payment verification
    return "payment_verification";
  }

  return "unknown";
}

/**
 * Check if payment has been captured for an order
 * 
 * @param order - The order object
 * @returns boolean indicating if payment is captured
 */
export function isPaymentCaptured(order: any): boolean {
  if (!order) return false;

  let metadata: any = {};
  try {
    metadata = typeof order.metadata === "string" 
      ? JSON.parse(order.metadata || "{}") 
      : (order.metadata || {});
  } catch {
    metadata = {};
  }

  // Check payment_collections (Medusa's standard)
  if (order.payment_collections?.[0]?.status === "captured") {
    return true;
  }

  // Check metadata for Paystack payments
  if (
    metadata.payment_status === "success" ||
    metadata.payment_captured === true ||
    metadata.payment_captured === "true" ||
    metadata.payment_captured_at ||
    metadata.payment_paid_at
  ) {
    return true;
  }

  return false;
}

/**
 * Get a human-readable description of how the order was completed
 * 
 * @param order - The order object
 * @returns string description
 */
export function getOrderCompletionDescription(order: any): string {
  const method = getOrderCompletionMethod(order);
  const paymentCaptured = isPaymentCaptured(order);

  if (method === "payment_verification") {
    return "Order completed via payment verification (payment-first flow)";
  }

  if (method === "cart_complete") {
    if (paymentCaptured) {
      return "Order completed via checkout (payment captured)";
    }
    return "Order completed via checkout (payment pending)";
  }

  return "Order completion method unknown";
}

