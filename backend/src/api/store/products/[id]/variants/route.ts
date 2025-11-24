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
    // Fetch product with variants using Medusa's standard approach
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.*",
        "variants.prices.*",
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

    // Fetch inventory items for all variants
    const variantIds = product.variants?.map((v: any) => v.id) || [];
    const variantSkus = product.variants?.map((v: any) => v.sku).filter(Boolean) || [];
    let inventoryMap: Record<string, number> = {};

    if (variantIds.length > 0) {
      try {
        // Query inventory items - try by variant_id first, then by SKU
        let inventoryItems: any[] = [];
        
        try {
          const result = await query.graph({
            entity: "inventory_item",
            fields: [
              "id",
              "sku",
              "inventory_levels.*",
            ],
          });
          inventoryItems = result.data || [];
        } catch (error) {
          console.error("Error fetching inventory items:", error);
        }

        // Match inventory items to variants by SKU or variant_id
        for (const variant of product.variants || []) {
          const matchingItem = inventoryItems.find((item: any) => 
            item.sku === variant.sku || item.variant_id === variant.id
          );
          
          if (matchingItem) {
            const availableQuantity = matchingItem.inventory_levels?.reduce(
              (sum: number, level: any) => sum + (level.available_quantity || 0),
              0
            ) || 0;
            inventoryMap[variant.id] = availableQuantity;
          } else {
            inventoryMap[variant.id] = 0;
          }
        }
      } catch (error) {
        console.error("Error fetching inventory:", error);
        // Set all to 0 if there's an error
        variantIds.forEach((vid: string) => {
          inventoryMap[vid] = 0;
        });
      }
    }

    // Format variants response
    const variants = product.variants?.map((variant: any) => {
      const variantPrice = variant.prices?.[0];
      const availableQuantity = inventoryMap[variant.id] ?? 0;
      
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

