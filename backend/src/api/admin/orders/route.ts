import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /admin/orders
 * Fetch all orders for admin panel
 * Includes order details, items, shipping address, and totals
 * Properly checks metadata for payment status
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Resolve services
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const query = req.scope.resolve("query");

    // Query parameters for pagination and filtering
    const {
      limit = 50,
      offset = 0,
      status,
      email,
      order_by = "created_at",
      order_direction = "desc"
    } = req.query;

    // Build filters
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (email) {
      filters.email = email;
    }

    // Fetch orders using the query service for better field resolution
    const { data: orders, metadata } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "status",
        "display_id",
        "version",
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
        "items.product.*",
        "items.variant.*",
        "shipping_address.*",
        "billing_address.*",
        "shipping_methods.*",
        "payment_collections.*",
        "fulfillments.*",
      ],
      filters,
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    });

    // Fetch customer information for all orders
    const customerIds = [...new Set(orders
      .map((order: any) => order.customer_id)
      .filter((id: string | null | undefined) => id != null))];
    
    const customersMap = new Map();
    if (customerIds.length > 0) {
      try {
        // Fetch customers in parallel
        const customerPromises = customerIds.map(async (customerId: string) => {
          try {
            const customer = await customerModuleService.retrieveCustomer(customerId);
            return { id: customerId, customer };
          } catch (error) {
            // Customer might not exist, return null
            return { id: customerId, customer: null };
          }
        });
        
        const customerResults = await Promise.all(customerPromises);
        customerResults.forEach(({ id, customer }) => {
          if (customer) {
            customersMap.set(id, customer);
          }
        });
      } catch (error) {
        console.warn("Error fetching customers for orders:", error);
      }
    }

    // Format the orders for response
    const formattedOrders = orders.map((order: any) => {
      // Determine payment status from multiple sources
      // This is the key fix - properly check metadata for Paystack payments
      let paymentStatus = "not_paid";
      
      // Get metadata (handle both object and parsed JSON string)
      let metadata: any = {};
      try {
        if (typeof order.metadata === 'string') {
          metadata = JSON.parse(order.metadata || '{}');
        } else if (order.metadata) {
          metadata = order.metadata;
        }
      } catch (error) {
        console.warn(`Failed to parse metadata for order ${order.id}:`, error);
        metadata = {};
      }
      
      // Debug log for troubleshooting
      if (metadata.payment_provider === "paystack") {
        console.log(`Payment metadata for order ${order.id}:`, {
          payment_status: metadata.payment_status,
          payment_captured: metadata.payment_captured,
          payment_captured_type: typeof metadata.payment_captured,
          payment_captured_at: metadata.payment_captured_at,
          payment_reference: metadata.payment_reference,
        });
      }
      
      // First check payment_collections (Medusa's standard payment system)
      if (order.payment_collections?.[0]?.status) {
        paymentStatus = order.payment_collections[0].status;
      }
      // Then check metadata for Paystack payments - comprehensive check
      // Handle all possible truthy variations of payment_captured
      else if (
        metadata.payment_status === "success" || 
        metadata.payment_captured === true ||
        metadata.payment_captured === "true" ||
        metadata.payment_captured === 1 ||
        metadata.payment_captured === "1" ||
        (metadata.payment_provider === "paystack" && metadata.payment_captured_at) ||
        (metadata.payment_provider === "paystack" && metadata.payment_paid_at)
      ) {
        paymentStatus = "captured";
      }
      // Check if payment is pending/awaiting
      else if (
        metadata.payment_provider === "paystack" && 
        (metadata.payment_reference || metadata.payment_status === "pending")
      ) {
        paymentStatus = "awaiting";
      }
      // Check if payment failed
      else if (metadata.payment_status === "failed") {
        paymentStatus = "failed";
      }

      // Get customer information
      const customer = order.customer_id ? customersMap.get(order.customer_id) : null;
      const customerName = customer 
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email || "Unknown"
        : order.email || "Unknown";

      return {
        id: order.id,
        display_id: order.display_id,
        status: order.status,
        email: order.email,
        customer_id: order.customer_id,
        customer_name: customerName,
        customer_first_name: customer?.first_name || null,
        customer_last_name: customer?.last_name || null,
        currency_code: order.currency_code,
        total: order.total,
        subtotal: order.subtotal,
        tax_total: order.tax_total,
        shipping_total: order.shipping_total,
        discount_total: order.discount_total,
        metadata: metadata,
        items: order.items?.map((item: any) => ({
          id: item.id,
          title: item.title,
          subtitle: item.subtitle,
          thumbnail: item.thumbnail,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          product_id: item.product_id,
          variant_id: item.variant_id,
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
        })) || [],
        shipping_address: order.shipping_address ? {
          id: order.shipping_address.id,
          first_name: order.shipping_address.first_name,
          last_name: order.shipping_address.last_name,
          address_1: order.shipping_address.address_1,
          address_2: order.shipping_address.address_2,
          city: order.shipping_address.city,
          province: order.shipping_address.province,
          postal_code: order.shipping_address.postal_code,
          country_code: order.shipping_address.country_code,
          phone: order.shipping_address.phone,
        } : null,
        billing_address: order.billing_address ? {
          id: order.billing_address.id,
          first_name: order.billing_address.first_name,
          last_name: order.billing_address.last_name,
          address_1: order.billing_address.address_1,
          address_2: order.billing_address.address_2,
          city: order.billing_address.city,
          province: order.billing_address.province,
          postal_code: order.billing_address.postal_code,
          country_code: order.billing_address.country_code,
          phone: order.billing_address.phone,
        } : null,
        shipping_methods: order.shipping_methods?.map((method: any) => ({
          id: method.id,
          name: method.name,
          amount: method.amount,
        })) || [],
        payment_status: paymentStatus,
        fulfillment_status: order.fulfillments?.length > 0 ? "fulfilled" : "not_fulfilled",
        created_at: order.created_at,
        updated_at: order.updated_at,
        canceled_at: order.canceled_at,
      };
    });

    res.status(200).json({
      orders: formattedOrders,
      count: formattedOrders.length,
      offset: Number(offset),
      limit: Number(limit),
      total: metadata?.count || formattedOrders.length,
    });

  } catch (error) {
    console.error("Error fetching admin orders:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message,
    });
  }
}
