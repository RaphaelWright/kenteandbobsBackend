import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../modules/review/service";

/**
 * GET /store/products
 * Fetch all products with their details using Medusa v2 native approach
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  
  try {
    // Query parameters
    const {
      limit = 50,
      offset = 0,
      category_id,
      search,
      currency_code = "ghs",
    } = req.query;

    // Build the query with Medusa v2's native pricing support
    const { data: products } = await query.graph({
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
        status: "published",
      },
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    },
    {
      context: {
        currency_code: String(currency_code).toLowerCase(),
      },
    });

    // Fetch reviews for all products
    const productIds = products.map((p: any) => p.id);
    let reviewsByProduct: Record<string, any> = {};
    
    if (productIds.length > 0) {
      try {
        const allReviews = await reviewModuleService.listReviews({
          product_id: productIds,
          status: "approved",
        });

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

        Object.keys(reviewsByProduct).forEach((productId) => {
          const reviews = reviewsByProduct[productId].reviews;
          const totalRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0);
          reviewsByProduct[productId].total = reviews.length;
          reviewsByProduct[productId].average = reviews.length > 0 
            ? Math.round((totalRating / reviews.length) * 10) / 10 
            : 0;
        });
      } catch (error) {
        console.error("Review module error:", error.message);
      }
    }

    // Format the response
    const formattedProducts = products.map((product: any) => {
      // Calculate total quantity
      const totalQuantity = product.variants?.reduce((sum: number, variant: any) => {
        const inventoryQuantity = variant.inventory_items?.reduce(
          (invSum: number, item: any) => invSum + (item.inventory?.stocked_quantity || 0),
          0
        );
        return sum + (inventoryQuantity || 0);
      }, 0) || 0;

      // Get price range from variants (using calculated_price from Medusa)
      const prices = product.variants
        ?.map((v: any) => v.calculated_price?.calculated_amount)
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
          currency: String(currency_code).toLowerCase(),
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
        variants: product.variants?.map((variant: any) => ({
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.calculated_price?.calculated_amount || null,
          original_price: variant.calculated_price?.original_amount || null,
          currency: String(currency_code).toLowerCase(),
          price_type: variant.calculated_price?.is_calculated_price_price_list ? "sale" : "default",
          inventory_quantity: variant.inventory_items?.reduce(
            (sum: number, item: any) => sum + (item.inventory?.stocked_quantity || 0),
            0
          ) || 0,
        })) || [],
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
