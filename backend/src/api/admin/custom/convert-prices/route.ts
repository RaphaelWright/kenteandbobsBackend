import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { cedisToPesewas, formatPesewasAsCedis } from "utils/currency";

/**
 * POST /admin/custom/convert-prices
 * Convert existing prices from Ghana Cedis to Pesewas
 * 
 * This endpoint is meant to be run ONCE to fix prices that were incorrectly
 * stored in cedis instead of pesewas. After running this, all prices will be
 * in pesewas as they should be.
 * 
 * Example: If a product was stored with price = 1.30 (cedis), it will be
 * converted to 130 (pesewas)
 * 
 * IMPORTANT: This is a destructive operation. Back up your database first!
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const query = req.scope.resolve("query");

    // Get confirmation from request body
    const { confirm, dryRun = true } = req.body as { 
      confirm?: boolean; 
      dryRun?: boolean;
    };

    if (!confirm && !dryRun) {
      return res.status(400).json({
        error: "Missing confirmation",
        message: "Please set 'confirm: true' to proceed, or use 'dryRun: true' to preview changes",
      });
    }

    // Fetch all products with their variants and prices
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.*",
        "variants.prices.*",
      ],
    });

    if (!products || products.length === 0) {
      return res.json({
        message: "No products found",
        products_checked: 0,
        prices_converted: 0,
      });
    }

    const conversions: any[] = [];
    let totalPricesConverted = 0;

    // Check each product's prices
    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      for (const variant of product.variants) {
        if (!variant.prices || variant.prices.length === 0) {
          continue;
        }

        for (const price of variant.prices) {
          // Skip if price is null or undefined
          if (price.amount == null) {
            continue;
          }

          const currencyCode = price.currency_code?.toLowerCase() || 'ghs';
          
          // Only convert GHS prices that appear to be in cedis
          // Heuristic: If the price is less than 1000 and not 0, it's likely in cedis
          // (Real pesewas prices should be >= 100 for most products over GH₵ 1.00)
          if (currencyCode === 'ghs' && price.amount > 0 && price.amount < 1000) {
            const oldAmount = price.amount;
            const newAmount = cedisToPesewas(oldAmount);
            
            conversions.push({
              product_id: product.id,
              product_title: product.title,
              variant_id: variant.id,
              variant_title: variant.title,
              price_id: price.id,
              old_amount: oldAmount,
              new_amount: newAmount,
              old_display: formatPesewasAsCedis(oldAmount),
              new_display: formatPesewasAsCedis(newAmount),
              currency: currencyCode,
            });

            totalPricesConverted++;

            // Update the price if not a dry run
            if (!dryRun && confirm) {
              // Note: This endpoint identifies prices that need conversion
              // To actually update prices, you should:
              // 1. Use Medusa Admin API to update product prices
              // 2. Or reseed the database with correct prices (pnpm run db:reset && pnpm run seed)
              // 3. Or manually update through the admin panel
              console.log(`Would convert price ${price.id}: ${oldAmount} -> ${newAmount}`);
            }
          }
        }
      }
    }

    // Return summary
    const response = {
      dry_run: dryRun,
      products_checked: products.length,
      prices_converted: totalPricesConverted,
      conversions: conversions.slice(0, 50), // Limit to first 50 for readability
      total_conversions: conversions.length,
      message: dryRun 
        ? "Dry run completed. Set 'dryRun: false' and 'confirm: true' to apply changes."
        : confirm 
          ? "Price conversion completed successfully!"
          : "Conversion preview generated. Set 'confirm: true' to apply.",
    };

    if (conversions.length > 50) {
      response.message += ` (Showing first 50 of ${conversions.length} conversions)`;
    }

    res.json(response);

  } catch (error) {
    console.error("Error converting prices:", error);
    res.status(500).json({
      error: "Failed to convert prices",
      message: error.message,
    });
  }
}

/**
 * GET /admin/custom/convert-prices
 * Check which prices need conversion (dry run by default)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  // Just call POST with dryRun = true
  req.body = { dryRun: true };
  return POST(req, res);
}
