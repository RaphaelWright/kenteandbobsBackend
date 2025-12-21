import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import { IOrderModuleService } from "@medusajs/framework/types";

/**
 * GET /store/debug/db-test
 * Test database connectivity and show recent orders
 * REMOVE THIS IN PRODUCTION!
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER);
    const query = req.scope.resolve("query");

    // Get database connection info
    const databaseUrl = process.env.DATABASE_URL;
    const databaseHost = databaseUrl ? new URL(databaseUrl).host : "unknown";
    const databaseName = databaseUrl ? new URL(databaseUrl).pathname.slice(1) : "unknown";

    console.log("🔍 Database Debug Info:", {
      host: databaseHost,
      database: databaseName,
      environment: process.env.NODE_ENV,
    });

    // Get recent orders
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "email",
        "created_at",
        "updated_at",
        "shipping_address.*",
      ],
      pagination: {
        order: {
          created_at: "DESC"
        },
        skip: 0,
        take: 5,
      },
    });

    // Get order count
    const allOrders = await orderModuleService.listOrders({}, { take: 1000 });
    const orderCount = allOrders.length;

    res.json({
      success: true,
      database: {
        host: databaseHost,
        name: databaseName,
        environment: process.env.NODE_ENV,
        backend_url: process.env.BACKEND_PUBLIC_URL,
      },
      stats: {
        total_orders: orderCount,
        recent_orders_shown: orders.length,
      },
      recent_orders: orders.map((order: any) => ({
        id: order.id,
        display_id: order.display_id,
        email: order.email,
        status: order.status,
        created_at: order.created_at,
        shipping_address: order.shipping_address ? {
          id: order.shipping_address.id,
          first_name: order.shipping_address.first_name,
          last_name: order.shipping_address.last_name,
          address_1: order.shipping_address.address_1,
          city: order.shipping_address.city,
          phone: order.shipping_address.phone,
        } : null,
      })),
      instructions: [
        "This endpoint shows which database you're connected to",
        "Check if the database host matches your expectations",
        "Recent orders show the last 5 orders created",
        "If you don't see your test orders, you might be connected to the wrong database",
        "⚠️ REMOVE THIS ENDPOINT IN PRODUCTION!"
      ]
    });
  } catch (error) {
    console.error("Database test error:", error);
    res.status(500).json({
      error: "Database test failed",
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

