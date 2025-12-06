import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { formatPesewasAsCedis } from "utils/currency";

/**
 * GET /admin/custom/check-prices
 * Check current price format in database
 * Helps diagnose if prices are in cedis or pesewas
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const query = req.scope.resolve("query");

    // Fetch sample products with their prices
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.id",
        "variants.title",
        "variants.prices.*",
      ],
      pagination: {
        take: 10, // Just check first 10 products
      },
    });

    if (!products || products.length === 0) {
      return res.json({
        message: "No products found in database",
        products_checked: 0,
      });
    }

    const priceAnalysis: any[] = [];
    let suspiciousCount = 0;

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) {
        continue;
      }

      for (const variant of product.variants) {
        if (!variant.prices || variant.prices.length === 0) {
          continue;
        }

        for (const price of variant.prices) {
          if (price.amount == null) {
            continue;
          }

          const currencyCode = price.currency_code?.toLowerCase() || 'ghs';
          
          // Check if this looks like cedis instead of pesewas
          const suspiciouslyLow = currencyCode === 'ghs' && price.amount > 0 && price.amount < 1000;
          
          if (suspiciouslyLow) {
            suspiciousCount++;
          }

          priceAnalysis.push({
            product_id: product.id,
            product_title: product.title,
            variant_id: variant.id,
            variant_title: variant.title,
            price_id: price.id,
            amount: price.amount,
            currency: currencyCode,
            likely_format: suspiciouslyLow ? "CEDIS (WRONG!)" : "pesewas (correct)",
            if_pesewas: formatPesewasAsCedis(price.amount),
            if_cedis: formatPesewasAsCedis(price.amount * 100),
          });
        }
      }
    }

    const needsConversion = suspiciousCount > 0;

    return res.json({
      products_checked: products.length,
      prices_analyzed: priceAnalysis.length,
      suspicious_prices: suspiciousCount,
      needs_conversion: needsConversion,
      diagnosis: needsConversion 
        ? "⚠️ PROBLEM DETECTED: Prices appear to be in CEDIS instead of PESEWAS!" 
        : "✅ Prices look correct (in pesewas)",
      recommendation: needsConversion
        ? "Run POST /admin/custom/convert-prices with {\"confirm\": true, \"dryRun\": false} to fix"
        : "No action needed",
      sample_prices: priceAnalysis.slice(0, 5),
      all_prices: priceAnalysis,
    });

  } catch (error) {
    console.error("Error checking prices:", error);
    res.status(500).json({
      error: "Failed to check prices",
      message: error.message,
    });
  }
}
