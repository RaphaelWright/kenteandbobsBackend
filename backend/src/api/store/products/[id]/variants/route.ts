import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/products/:id/variants
 * Fetch all variants for a product by product ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const { id } = req.params;

  try {
    // Fetch product with variants and inventory data using Medusa's standard approach
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.*",
        "variants.prices.*",
        "variants.inventory_items.*",
        "variants.inventory_items.inventory.location_levels.*",
      ],
      filters: {
        id,
        status: "published",
      },
    });

    if (!products || products.length === 0) {
      return res.status(404).json({
        error: "Product not found",
        message: `Product with ID ${id} was not found or is not published`,
      });
    }

    const product = products[0];

    // Format variants response
    const variants = product.variants?.map((variant: any) => {
      const variantPrice = variant.prices?.[0];
      
      // Calculate available quantity from inventory_items -> inventory -> location_levels
      let availableQuantity = 0;
      if (variant.inventory_items && Array.isArray(variant.inventory_items)) {
        for (const inventoryItem of variant.inventory_items) {
          if (inventoryItem.inventory?.location_levels && Array.isArray(inventoryItem.inventory.location_levels)) {
            const quantity = inventoryItem.inventory.location_levels.reduce(
              (sum: number, level: any) => sum + (level.available_quantity || 0),
              0
            );
            availableQuantity += quantity;
          }
        }
      }
      
      return {
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        price: variantPrice?.amount || null,
        currency: variantPrice?.currency_code || "ghs",
        available_quantity: availableQuantity,
        options: variant.options,
        created_at: variant.created_at,
        updated_at: variant.updated_at,
      };
    }) || [];

    res.json({
      product_id: product.id,
      product_title: product.title,
      variants: variants,
      count: variants.length,
    });
  } catch (error) {
    console.error("Error fetching product variants:", error);
    res.status(500).json({
      error: "Failed to fetch product variants",
      message: error.message,
    });
  }
}

