import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/collections
 * Fetch all product collections
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");

  try {
    // Query parameters
    const {
      limit = 50,
      offset = 0,
    } = req.query;

    // Fetch collections using Medusa's standard approach
    const { data: collections } = await query.graph({
      entity: "product_collection",
      fields: [
        "id",
        "title",
        "handle",
        "description",
        "created_at",
        "updated_at",
        "products.id",
        "products.title",
        "products.handle",
        "products.thumbnail",
      ],
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    });

    // Format response
    const formattedCollections = collections.map((collection: any) => ({
      id: collection.id,
      title: collection.title,
      handle: collection.handle,
      description: collection.description,
      product_count: collection.products?.length || 0,
      created_at: collection.created_at,
      updated_at: collection.updated_at,
    }));

    res.json({
      collections: formattedCollections,
      count: formattedCollections.length,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({
      error: "Failed to fetch collections",
      message: error.message,
    });
  }
}
