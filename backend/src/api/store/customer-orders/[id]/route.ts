import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

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
 * GET /store/customer-orders/:id
 * Fetch a specific order by ID
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const orderId = req.params.id;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const query = req.scope.resolve("query");

    // Fetch the order
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
        "items.product.handle",
        "items.product.thumbnail",
        "items.product.images.*",
        "items.variant.id",
        "items.variant.title",
        "items.variant.sku",
        "shipping_address.*",
        "billing_address.*",
        "shipping_methods.*",
        "payment_collections.*",
        "payment_collections.payments.*",
        "fulfillments.*",
        "fulfillments.items.*",
      ],
      filters: { id: orderId },
    });

    if (!orders?.length) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orders[0];

    // Format order response (raw database values)
    const formattedOrder = {
      id: order.id,
      display_id: order.display_id,
      status: order.status,
      email: order.email,
      customer_id: order.customer_id,
      currency_code: order.currency_code,
      total: order.total,
      subtotal: order.subtotal,
      tax_total: order.tax_total,
      shipping_total: order.shipping_total,
      discount_total: order.discount_total,
      metadata: order.metadata || {},
      payment_status: getPaymentStatus(order),
      fulfillment_status: order.fulfillments?.length > 0 ? "fulfilled" : "not_fulfilled",
      items: order.items?.map((item: any) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product: item.product ? {
          id: item.product.id,
          title: item.product.title,
          handle: item.product.handle,
          thumbnail: item.product.thumbnail,
          images: item.product.images?.map((img: any) => ({
            id: img.id,
            url: img.url,
          })) || [],
        } : null,
        variant: item.variant ? {
          id: item.variant.id,
          title: item.variant.title,
          sku: item.variant.sku,
        } : null,
      })) || [],
      shipping_address: order.shipping_address || null,
      billing_address: order.billing_address || null,
      shipping_methods: order.shipping_methods?.map((m: any) => ({
        id: m.id,
        name: m.name,
        amount: m.amount,
      })) || [],
      payment_collections: order.payment_collections?.map((pc: any) => ({
        id: pc.id,
        status: pc.status,
        amount: pc.amount,
        payments: pc.payments?.map((p: any) => ({
          id: p.id,
          amount: p.amount,
          currency_code: p.currency_code,
          provider_id: p.provider_id,
        })) || [],
      })) || [],
      fulfillments: order.fulfillments?.map((f: any) => ({
        id: f.id,
        created_at: f.created_at,
        items: f.items?.map((i: any) => ({
          id: i.id,
          quantity: i.quantity,
          line_item_id: i.line_item_id,
        })) || [],
      })) || [],
      created_at: order.created_at,
      updated_at: order.updated_at,
      canceled_at: order.canceled_at,
    };

    res.status(200).json({ order: formattedOrder });

  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({
      error: "Failed to fetch order",
      message: error.message,
    });
  }
}
