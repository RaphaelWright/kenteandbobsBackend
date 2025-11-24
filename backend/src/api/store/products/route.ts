import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../modules/review/service";
import WishlistModuleService from "../../../modules/wishlist/service";

/**
 * GET /store/products
 * Fetch all products with their details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlistModuleService");
  
  try {
    // Query parameters
    const {
      limit = 50,
      offset = 0,
      category_id,
      search,
    } = req.query;

    // Fetch products using Medusa's standard approach
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
        "variants.prices.*",
        "variants.inventory_items.*",
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
    });

    // Get customer ID if logged in
    const authContext = req.session?.auth_context;
    const customerId = authContext?.actor_id;

    // Fetch reviews
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

    // Fetch wishlist items for logged-in customer
    let wishlistProductIds: Set<string> = new Set();
    
    if (customerId) {
      try {
        const wishlistItems = await wishlistModuleService.listWishlists({
          customer_id: customerId,
          product_id: productIds,
        });

        wishlistProductIds = new Set(wishlistItems.map((item: any) => item.product_id));
      } catch (error) {
        console.error("Wishlist module error:", error.message);
      }
    }

    // Fetch inventory levels separately
    const inventoryItemIds = products.flatMap((p: any) => 
      p.variants?.flatMap((v: any) => v.inventory_items?.map((item: any) => item.id) || []) || []
    ).filter(Boolean);
    
    let inventoryLevelsByItemId: Record<string, any[]> = {};
    if (inventoryItemIds.length > 0) {
      try {
        const { data: inventoryLevels } = await query.graph({
          entity: "inventory_level",
          fields: [
            "id",
            "inventory_item_id",
            "available_quantity",
            "stocked_quantity",
          ],
          filters: {
            inventory_item_id: inventoryItemIds,
          },
        });

        // Group inventory levels by inventory_item_id
        inventoryLevelsByItemId = inventoryLevels.reduce((acc: Record<string, any[]>, level: any) => {
          if (!acc[level.inventory_item_id]) {
            acc[level.inventory_item_id] = [];
          }
          acc[level.inventory_item_id].push(level);
          return acc;
        }, {});
      } catch (error) {
        console.error("Error fetching inventory levels:", error.message);
      }
    }

    // Format response
    const formattedProducts = products.map((product: any) => {
      // Calculate total quantity
      const totalQuantity = product.variants?.reduce((sum: number, variant: any) => {
        const inventoryQuantity = variant.inventory_items?.reduce(
          (invSum: number, item: any) => {
            // Get inventory levels for this inventory item
            const levels = inventoryLevelsByItemId[item.id] || [];
            const levelSum = levels.reduce(
              (levelSum: number, level: any) => levelSum + (level.available_quantity || level.stocked_quantity || 0),
              0
            );
            return invSum + levelSum;
          },
          0
        );
        return sum + (inventoryQuantity || 0);
      }, 0) || 0;

      // Get price range from variant prices
      const prices = product.variants
        ?.flatMap((v: any) => v.prices?.map((p: any) => p.amount) || [])
        .filter((p: any) => p != null);
      
      const minPrice = prices?.length ? Math.min(...prices) : null;
      const maxPrice = prices?.length ? Math.max(...prices) : null;
      const currency = product.variants?.[0]?.prices?.[0]?.currency_code || "ghs";

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
          currency: currency,
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
          const variantPrice = variant.prices?.[0];
          return {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            price: variantPrice?.amount || null,
            currency: variantPrice?.currency_code || "ghs",
            inventory_quantity: variant.inventory_items?.reduce(
              (sum: number, item: any) => {
                // Get inventory levels for this inventory item
                const levels = inventoryLevelsByItemId[item.id] || [];
                const levelSum = levels.reduce(
                  (levelSum: number, level: any) => levelSum + (level.available_quantity || level.stocked_quantity || 0),
                  0
                );
                return sum + levelSum;
              },
              0
            ) || 0,
          };
        }) || [],
        reviews: {
          total: reviewsByProduct[product.id]?.total || 0,
          average_rating: reviewsByProduct[product.id]?.average || 0,
          recent: reviewsByProduct[product.id]?.reviews.slice(0, 3) || [],
        },
        is_in_wishlist: wishlistProductIds.has(product.id),
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
