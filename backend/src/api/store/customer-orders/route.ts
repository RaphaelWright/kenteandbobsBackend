import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { enrichPrice } from "../../../utils/currency";

/**
 * Helper to determine payment status from order data
 */
function getPaymentStatus(order: any): string {
  let metadata: any = {};
  try {
    metadata = typeof order.metadata === "string" 
      ? JSON.parse(order.metadata || "{}") 
      : (order.metadata || {});
  } catch {
    metadata = {};
  }

  if (order.payment_collections?.[0]?.status) {
    return order.payment_collections[0].status;
  }

  if (
    metadata.payment_status === "success" ||
    metadata.payment_captured === true ||
    metadata.payment_captured === "true" ||
    metadata.payment_captured_at ||
    metadata.payment_paid_at
  ) {
    return "captured";
  }

  if (metadata.payment_status === "pending" || metadata.payment_reference) {
    return "awaiting";
  }

  if (metadata.payment_status === "failed") {
    return "failed";
  }

  return "not_paid";
}

/**
 * GET /store/customer-orders
 * Fetch all orders for a customer by customer_id or email
 * 
 * Query params:
 *   - customer_id: Customer ID
 *   - email: Customer email (alternative to customer_id)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve("query");
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Get customer identifier from query params
    const customerId = req.query.customer_id as string | undefined;
    const email = req.query.email as string | undefined;

    if (!customerId && !email) {
      return res.status(400).json({ 
        error: "customer_id or email is required" 
      });
    }

    // Find customer
    let customer: any = null;

    if (customerId) {
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch {
        // Customer not found by ID
      }
    }

    if (!customer && email) {
      const customers = await customerModuleService.listCustomers({ email });
      if (customers?.length > 0) {
        customer = customers[0];
      }
    }

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    // Fetch orders for customer
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "display_id",
        "email",
        "customer_id",
        "currency_code",
        "total",
        "subtotal",
        "tax_total",
        "shipping_total",
        "discount_total",
        "metadata",
        "created_at",
        "updated_at",
        "canceled_at",
        "items.*",
        "items.product.id",
        "items.product.title",
        "items.product.thumbnail",
        "items.variant.id",
        "items.variant.title",
        "items.variant.sku",
        "shipping_address.*",
        "billing_address.*",
        "shipping_methods.*",
        "payment_collections.status",
        "fulfillments.*",
      ],
      filters: { customer_id: customer.id },
    });

    // Format orders with enriched pricing
    const formattedOrders = orders.map((order: any) => {
      const currencyCode = order.currency_code || 'ghs';
      
      // Enrich order totals
      const enrichedTotal = enrichPrice(order.total || 0, currencyCode);
      const enrichedSubtotal = enrichPrice(order.subtotal || 0, currencyCode);
      const enrichedTaxTotal = enrichPrice(order.tax_total || 0, currencyCode);
      const enrichedShippingTotal = enrichPrice(order.shipping_total || 0, currencyCode);
      const enrichedDiscountTotal = enrichPrice(order.discount_total || 0, currencyCode);
      
      return {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        email: order.email,
        customer_id: order.customer_id,
        currency_code: currencyCode,
        total: order.total,
        total_display: enrichedTotal.display_amount,
        total_formatted: enrichedTotal.formatted,
        subtotal: order.subtotal,
        subtotal_display: enrichedSubtotal.display_amount,
        subtotal_formatted: enrichedSubtotal.formatted,
        tax_total: order.tax_total,
        tax_total_display: enrichedTaxTotal.display_amount,
        tax_total_formatted: enrichedTaxTotal.formatted,
        shipping_total: order.shipping_total,
        shipping_total_display: enrichedShippingTotal.display_amount,
        shipping_total_formatted: enrichedShippingTotal.formatted,
        discount_total: order.discount_total,
        discount_total_display: enrichedDiscountTotal.display_amount,
        discount_total_formatted: enrichedDiscountTotal.formatted,
        payment_status: getPaymentStatus(order),
        fulfillment_status: order.fulfillments?.length > 0 ? "fulfilled" : "not_fulfilled",
        items: order.items?.map((item: any) => {
          const enrichedUnitPrice = enrichPrice(item.unit_price || 0, currencyCode);
          const enrichedItemTotal = enrichPrice(item.total || 0, currencyCode);
          
          return {
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_price_display: enrichedUnitPrice.display_amount,
            unit_price_formatted: enrichedUnitPrice.formatted,
            total: item.total,
            total_display: enrichedItemTotal.display_amount,
            total_formatted: enrichedItemTotal.formatted,
            product: item.product ? {
              id: item.product.id,
              title: item.product.title,
              thumbnail: item.product.thumbnail,
            } : null,
            variant: item.variant ? {
              id: item.variant.id,
              title: item.variant.title,
              sku: item.variant.sku,
            } : null,
          };
        }) || [],
        shipping_address: order.shipping_address || null,
        billing_address: order.billing_address || null,
        shipping_methods: order.shipping_methods?.map((m: any) => {
          const enrichedAmount = enrichPrice(m.amount || 0, currencyCode);
          return {
            id: m.id,
            name: m.name,
            amount: m.amount,
            amount_display: enrichedAmount.display_amount,
            amount_formatted: enrichedAmount.formatted,
          };
        }) || [],
        created_at: order.created_at,
        updated_at: order.updated_at,
        canceled_at: order.canceled_at,
      };
    });

    res.status(200).json({
      orders: formattedOrders,
      count: formattedOrders.length,
    });

  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message,
    });
  }
}
