import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/categories
 * Fetch all product categories
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

    // Fetch categories using Medusa's standard approach
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id",
        "created_at",
        "updated_at",
        "parent_category.*",
      ],
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    });

    // Format response
    const formattedCategories = categories.map((category: any) => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description,
      parent_category_id: category.parent_category_id,
      parent_category: category.parent_category ? {
        id: category.parent_category.id,
        name: category.parent_category.name,
        handle: category.parent_category.handle,
      } : null,
      created_at: category.created_at,
      updated_at: category.updated_at,
    }));

    res.json({
      product_categories: formattedCategories,
      count: formattedCategories.length,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      error: "Failed to fetch categories",
      message: error.message,
    });
  }
}

