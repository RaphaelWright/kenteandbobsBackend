import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IOrderModuleService, ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/orders
 * Fetch all orders for the authenticated customer
 * Includes order details, items, shipping address, and totals
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Auth context is already validated by middleware and attached to req.auth
    // Fallback to session if middleware didn't set it (shouldn't happen with current setup)
    const authContext = (req as any).auth || req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      return res.status(401).json({
        error: "Not authenticated"
      });
    }

    // Resolve services
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);
    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const query = req.scope.resolve("query");

    // Retrieve auth identity to get customer information
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    if (!authIdentity) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Get customer_id from app_metadata or try to find by email
    const customerId = authIdentity.app_metadata?.customer_id;
    const customerEmail = authIdentity.entity_id;

    let customer;

    if (customerId) {
      // Try to retrieve customer by ID first
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch (error) {
        // If customer not found by ID, try by email
        console.warn("Customer not found by ID, trying by email:", error.message);
      }
    }

    // If customer not found by ID, try to find by email
    if (!customer && customerEmail) {
      const customers = await customerModuleService.listCustomers({
        email: customerEmail
      });

      if (customers && customers.length > 0) {
        customer = customers[0];
      }
    }

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found"
      });
    }

    // Query parameters for pagination and filtering
    const {
      limit = 20,
      offset = 0,
      status,
      order_by = "created_at",
      order_direction = "desc"
    } = req.query;

    // Build filters
    const filters: any = {
      customer_id: customer.id
    };

    if (status) {
      filters.status = status;
    }

    // Fetch orders using the query service for better field resolution
    const { data: orders, metadata: queryMetadata } = await query.graph({
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

    // Format the orders for response
    const formattedOrders = orders.map((order: any) => {
      // Determine payment status from multiple sources
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
      
      // First check payment_collections
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

      // Get customer name if available
      const customerName = customer 
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() || customer.email || order.email
        : order.email;

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
      total: queryMetadata?.count || formattedOrders.length,
    });

  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({
      error: "Failed to fetch orders",
      message: error.message,
    });
  }
}

