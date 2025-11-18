import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import ReviewModuleService from "../../../modules/review/service";

/**
 * GET /store/products
 * Fetch all products with their details including:
 * - images
 * - name (title)
 * - price (from variants)
 * - description
 * - category
 * - quantity (inventory)
 * - reviews
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const pricingModuleService = req.scope.resolve(Modules.PRICING);
  
  try {
    // Query parameters for filtering, pagination, and search
    const {
      limit = 50,
      offset = 0,
      category_id,
      search,
      order = "created_at",
      currency_code,
    } = req.query;

    // Ensure currency_code is a string (handle array or undefined)
    const currencyCode = Array.isArray(currency_code) 
      ? currency_code[0] || "ghs" 
      : currency_code || "ghs";

    // Build the query for products with variants and their price-related data
    const { data: products, metadata } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "description",
        "subtitle",
        "thumbnail",
        "status",
        "created_at",
        "updated_at",
        "images.*",
        "variants.*",
        "variants.calculated_price.*",
        "variants.inventory_items.*",
        "variants.inventory_items.inventory.*",
        "categories.*",
        "tags.*",
      ],
      filters: {
        ...(category_id && {
          categories: {
            id: category_id,
          },
        }),
        ...(search && {
          title: {
            $ilike: `%${search}%`,
          },
        }),
        status: "published", // Only show published products
      },
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    });

    // Collect all variant IDs for batch price calculation
    const allVariantIds: string[] = [];
    for (const product of products) {
      if (product.variants && product.variants.length > 0) {
        allVariantIds.push(...product.variants.map((v: any) => v.id));
      }
    }

    // Batch calculate prices for all variants at once (more efficient)
    const variantPriceMap: Record<string, any> = {};
    
    if (allVariantIds.length > 0) {
      try {
        const calculatedPrices = await pricingModuleService.calculatePrices(
          { id: allVariantIds },
          {
            context: {
              currency_code: currencyCode,
            },
          }
        );
        
        // Store calculated prices in map
        Object.entries(calculatedPrices).forEach(([variantId, priceData]) => {
          variantPriceMap[variantId] = priceData;
        });
      } catch (error) {
        console.error("Error calculating prices for variants:", error.message || error);
        // Continue without prices
      }
    }

    // Fetch reviews for all products (optional - if review table doesn't exist, skip)
    const productIds = products.map((p: any) => p.id);
    let reviewsByProduct: Record<string, any> = {};
    
    if (productIds.length > 0) {
      try {
        const allReviews = await reviewModuleService.listReviews({
          product_id: productIds,
          status: "approved",
        });

        // Group reviews by product_id and calculate stats
        reviewsByProduct = allReviews.reduce((acc: any, review: any) => {
          if (!acc[review.product_id]) {
            acc[review.product_id] = {
              reviews: [],
              total: 0,
              average: 0,
            };
          }
          acc[review.product_id].reviews.push(review);
          return acc;
        }, {});

        // Calculate averages
        Object.keys(reviewsByProduct).forEach((productId) => {
          const reviews = reviewsByProduct[productId].reviews;
          const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
          reviewsByProduct[productId].total = reviews.length;
          reviewsByProduct[productId].average = reviews.length > 0 
            ? Math.round((totalRating / reviews.length) * 10) / 10 
            : 0;
        });
      } catch (error) {
        console.error("Review module error (table may not exist yet):", error.message);
        // Continue without reviews - this is non-critical
      }
    }

    // Format the response to include all requested features
    const formattedProducts = products.map((product: any) => {
      // Calculate total quantity from all variants
      const totalQuantity = product.variants?.reduce((sum: number, variant: any) => {
        const inventoryQuantity = variant.inventory_items?.reduce(
          (invSum: number, item: any) => {
            return invSum + (item.inventory?.stocked_quantity || 0);
          },
          0
        );
        return sum + (inventoryQuantity || 0);
      }, 0) || 0;

      // Get price range from variants using manually calculated prices
      const prices = product.variants
        ?.map((v: any) => variantPriceMap[v.id]?.calculated_amount)
        .filter((p: any) => p != null);
      
      const minPrice = prices?.length ? Math.min(...prices) : null;
      const maxPrice = prices?.length ? Math.max(...prices) : null;

      return {
        id: product.id,
        name: product.title,
        handle: product.handle,
        description: product.description,
        subtitle: product.subtitle,
        thumbnail: product.thumbnail,
        status: product.status,
        images: product.images?.map((img: any) => ({
          id: img.id,
          url: img.url,
        })) || [],
        price: {
          min: minPrice,
          max: maxPrice,
          currency: currencyCode,
        },
        categories: product.categories?.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          handle: cat.handle,
        })) || [],
        tags: product.tags?.map((tag: any) => ({
          id: tag.id,
          value: tag.value,
        })) || [],
        quantity: totalQuantity,
        variants: product.variants?.map((variant: any) => {
          const priceData = variantPriceMap[variant.id];
          return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            // Include all price information from Medusa pricing module
            price: priceData?.calculated_amount || null,
            original_price: priceData?.original_amount || null,
            currency: currencyCode,
            price_type: priceData?.is_calculated_price_price_list ? "sale" : "default",
            inventory_quantity: variant.inventory_items?.reduce(
              (sum: number, item: any) => sum + (item.inventory?.stocked_quantity || 0),
              0
            ) || 0,
          };
        }) || [],
        reviews: {
          total: reviewsByProduct[product.id]?.total || 0,
          average_rating: reviewsByProduct[product.id]?.average || 0,
          recent: reviewsByProduct[product.id]?.reviews.slice(0, 3) || [],
        },
        created_at: product.created_at,
        updated_at: product.updated_at,
      };
    });

    res.json({
      products: formattedProducts,
      count: formattedProducts.length,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      error: "Failed to fetch products",
      message: error.message,
    });
  }
}

