import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/variants/:id
 * Fetch a single variant by variant ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const { id } = req.params;

  try {
    // Fetch variant by querying products and filtering by variant ID, including inventory data
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "status",
        "variants.*",
        "variants.prices.*",
        "variants.inventory_items.*",
        "variants.inventory_items.inventory.location_levels.*",
      ],
      filters: {
        status: "published",
        variants: {
          id,
        },
      },
    });

    // Find the variant in the products
    let variant = null;
    let product = null;

    for (const p of products) {
      if (p.variants) {
        const foundVariant = p.variants.find((v: any) => v.id === id);
        if (foundVariant) {
          variant = foundVariant;
          product = p;
          break;
        }
      }
    }

    if (!variant || !product) {
      return res.status(404).json({
        error: "Variant not found",
        message: `Variant with ID ${id} was not found or belongs to an unpublished product`,
      });
    }

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

    // Format variant response
    const variantPrice = variant.prices?.[0];
    const formattedVariant = {
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
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        thumbnail: product.thumbnail,
      },
    };

    res.json({
      variant: formattedVariant,
    });
  } catch (error) {
    console.error("Error fetching variant:", error);
    res.status(500).json({
      error: "Failed to fetch variant",
      message: error.message,
    });
  }
}

