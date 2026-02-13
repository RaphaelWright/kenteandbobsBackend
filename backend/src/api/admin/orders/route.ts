import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import {
  IOrderModuleService,
  ICustomerModuleService,
} from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

/**
 * GET /admin/orders
 * Fetch all orders for admin panel
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    // Resolve services
    const orderModuleService: IOrderModuleService =
      req.scope.resolve(Modules.ORDER)
    const customerModuleService: ICustomerModuleService =
      req.scope.resolve(Modules.CUSTOMER)
    const query = req.scope.resolve("query")

    // Query params
    const {
      limit = 50,
      offset = 0,
      page,
      status,
      email,
      order_by = "created_at",
      order_direction = "desc",
    } = req.query

    const parsedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100)
    const calculatedOffset = page
      ? (Number(page) - 1) * parsedLimit
      : Math.max(Number(offset) || 0, 0)

    const filters: any = {}

    if (status) filters.status = status
    if (email) filters.email = email

    console.log("📊 Admin Orders Query:", {
      limit: parsedLimit,
      offset: calculatedOffset,
      page: page ? Number(page) : undefined,
      filters,
      order_by,
      order_direction,
    })

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
      ],
      filters,
      pagination: {
        skip: calculatedOffset,
        take: parsedLimit,
        order: {
          [order_by as string]: String(order_direction).toUpperCase(),
        },
      },
    })

    console.log("📊 Orders fetched:", {
      returned_count: orders?.length || 0,
      metadata_count: metadata?.count,
      has_metadata: !!metadata,
    })

    // Fetch customers
    const customerIds = [
      ...new Set(
        orders
          .map((order: any) => order.customer_id)
          .filter((id: string | null | undefined) => id != null)
      ),
    ]

    const customersMap = new Map()

    if (customerIds.length > 0) {
      const customerPromises = customerIds.map(async (customerId: string) => {
        try {
          const customer =
            await customerModuleService.retrieveCustomer(customerId)
          return { id: customerId, customer }
        } catch {
          return { id: customerId, customer: null }
        }
      })

      const customerResults = await Promise.all(customerPromises)

      customerResults.forEach(({ id, customer }) => {
        if (customer) {
          customersMap.set(id, customer)
        }
      })
    }

    const formattedOrders = orders.map((order: any) => {
      let paymentStatus = "not_paid"

      // Safe metadata parsing
      let metadata: any = {}
      try {
        if (typeof order.metadata === "string") {
          metadata = JSON.parse(order.metadata || "{}")
        } else if (order.metadata) {
          metadata = order.metadata
        }
      } catch {
        metadata = {}
      }

      // Determine payment status
      if (order.payment_collections?.[0]?.status) {
        paymentStatus = order.payment_collections[0].status
      } else if (
        metadata.payment_status === "success" ||
        metadata.payment_captured === true ||
        metadata.payment_captured === "true" ||
        metadata.payment_captured === 1 ||
        metadata.payment_captured === "1" ||
        (metadata.payment_provider === "paystack" &&
          (metadata.payment_captured_at || metadata.payment_paid_at))
      ) {
        paymentStatus = "captured"
      } else if (
        metadata.payment_provider === "paystack" &&
        (metadata.payment_reference ||
          metadata.payment_status === "pending")
      ) {
        paymentStatus = "awaiting"
      } else if (metadata.payment_status === "failed") {
        paymentStatus = "failed"
      }

      const customer = order.customer_id
        ? customersMap.get(order.customer_id)
        : null

      const customerName = customer
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
          customer.email ||
          "Unknown"
        : order.email || "Unknown"

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
        metadata,
        items:
          order.items?.map((item: any) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle,
            thumbnail: item.thumbnail,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.total,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product: item.product
              ? {
                  id: item.product.id,
                  title: item.product.title,
                  thumbnail: item.product.thumbnail,
                }
              : null,
            variant: item.variant
              ? {
                  id: item.variant.id,
                  title: item.variant.title,
                  sku: item.variant.sku,
                }
              : null,
          })) || [],
        shipping_address: order.shipping_address || null,
        billing_address: order.billing_address || null,
        shipping_methods:
          order.shipping_methods?.map((method: any) => ({
            id: method.id,
            name: method.name,
            amount: method.amount,
          })) || [],
        payment_status: paymentStatus,
        created_at: order.created_at,
        updated_at: order.updated_at,
        canceled_at: order.canceled_at,
      }
    })

    const totalOrders = metadata?.count || formattedOrders.length
    const currentPage = page
      ? Number(page)
      : Math.floor(calculatedOffset / parsedLimit) + 1
    const totalPages = Math.ceil(totalOrders / parsedLimit)

    res.status(200).json({
      orders: formattedOrders,
      pagination: {
        count: formattedOrders.length,
        total: totalOrders,
        offset: calculatedOffset,
        limit: parsedLimit,
        page: currentPage,
        total_pages: totalPages,
        has_next_page:
          calculatedOffset + formattedOrders.length < totalOrders,
        has_previous_page: calculatedOffset > 0,
        next_page:
          calculatedOffset + formattedOrders.length < totalOrders
            ? currentPage + 1
            : null,
        previous_page: calculatedOffset > 0
          ? currentPage - 1
          : null,
      },
      count: formattedOrders.length,
      offset: calculatedOffset,
      limit: parsedLimit,
      total: totalOrders,
    })
  } catch (err: unknown) {
    console.error("Error fetching admin orders:", err)

    const message =
      err instanceof Error ? err.message : "An unknown error occurred"

    return res.status(500).json({
      error: "Failed to fetch orders",
      message,
    })
  }
}
