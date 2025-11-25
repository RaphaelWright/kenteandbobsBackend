import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../modules/review/service";
import WishlistModuleService from "../../../modules/wishlist/service";

/**
 * GET /store/search
 * Comprehensive search endpoint that searches across products, categories, and tags
 * 
 * Query Parameters:
 * - q: Search query (required)
 * - type: Filter by type (optional: 'products', 'categories', 'all' - default: 'all')
 * - category_id: Filter products by category (optional)
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
      q,
      type = 'all',
      category_id,
    } = req.query;

    // Validate search query
    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Search query 'q' is required and must be a non-empty string",
      });
    }

    const searchQuery = q.trim();
    const searchPattern = `%${searchQuery}%`;
    
    const results: any = {
      query: searchQuery,
      products: [],
      categories: [],
      total: {
        products: 0,
        categories: 0,
      },
    };

    // Get customer ID if logged in
    const authContext = req.session?.auth_context;
    const customerId = authContext?.actor_id;

    // Search Products
    if (type === 'all' || type === 'products') {
      try {
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
            "categories.*",
            "tags.*",
          ],
          filters: {
            $or: [
              {
                title: {
                  $ilike: searchPattern,
                },
              },
              {
                description: {
                  $ilike: searchPattern,
                },
              },
              {
                subtitle: {
                  $ilike: searchPattern,
                },
              },
            ],
            ...(category_id && {
              categories: {
                id: category_id,
              },
            }),
            status: "published",
          },
        });

        // Get product IDs for reviews and wishlist
        const productIds = products.map((p: any) => p.id);
        
        // Fetch reviews
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
        if (customerId && productIds.length > 0) {
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

        // Format products
        results.products = products.map((product: any) => {
          const totalQuantity = product.variants?.length || 0;

          const prices = product.variants
            ?.flatMap((v: any) => v.prices?.map((p: any) => p.amount) || [])
            .filter((p: any) => p != null);
          
          const minPrice = prices?.length ? Math.min(...prices) : null;
          const maxPrice = prices?.length ? Math.max(...prices) : null;
          const currency = product.variants?.[0]?.prices?.[0]?.currency_code || "ghs";

          // Calculate relevance score based on where the match was found
          let relevanceScore = 0;
          const lowerQuery = searchQuery.toLowerCase();
          const lowerTitle = (product.title || '').toLowerCase();
          const lowerDescription = (product.description || '').toLowerCase();
          const lowerSubtitle = (product.subtitle || '').toLowerCase();

          if (lowerTitle.includes(lowerQuery)) {
            relevanceScore += 3;
            if (lowerTitle.startsWith(lowerQuery)) {
              relevanceScore += 2; // Bonus for title starting with query
            }
          }
          if (lowerSubtitle.includes(lowerQuery)) relevanceScore += 2;
          if (lowerDescription.includes(lowerQuery)) relevanceScore += 1;

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
                quantity: 1,
              };
            }) || [],
            reviews: {
              total: reviewsByProduct[product.id]?.total || 0,
              average_rating: reviewsByProduct[product.id]?.average || 0,
              recent: reviewsByProduct[product.id]?.reviews.slice(0, 3) || [],
            },
            is_in_wishlist: wishlistProductIds.has(product.id),
            relevance_score: relevanceScore,
            created_at: product.created_at,
            updated_at: product.updated_at,
          };
        });

        // Sort by relevance score
        results.products.sort((a: any, b: any) => b.relevance_score - a.relevance_score);

        results.total.products = results.products.length;
      } catch (error) {
        console.error("Error searching products:", error);
      }
    }

    // Search Categories
    if (type === 'all' || type === 'categories') {
      try {
        const { data: categories } = await query.graph({
          entity: "product_category",
          fields: [
            "id",
            "name",
            "handle",
            "description",
            "parent_category_id",
            "parent_category.*",
            "category_children.*",
            "products.id",
          ],
          filters: {
            $or: [
              {
                name: {
                  $ilike: searchPattern,
                },
              },
              {
                description: {
                  $ilike: searchPattern,
                },
              },
            ],
            is_active: true,
          },
        });

        results.categories = categories.map((category: any) => {
          // Calculate relevance score
          let relevanceScore = 0;
          const lowerQuery = searchQuery.toLowerCase();
          const lowerName = (category.name || '').toLowerCase();
          const lowerDescription = (category.description || '').toLowerCase();

          if (lowerName.includes(lowerQuery)) {
            relevanceScore += 3;
            if (lowerName.startsWith(lowerQuery)) {
              relevanceScore += 2;
            }
          }
          if (lowerDescription.includes(lowerQuery)) relevanceScore += 1;

          return {
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
            subcategories: category.category_children?.map((child: any) => ({
              id: child.id,
              name: child.name,
              handle: child.handle,
            })) || [],
            product_count: category.products?.length || 0,
            relevance_score: relevanceScore,
          };
        });

        // Sort by relevance score
        results.categories.sort((a: any, b: any) => b.relevance_score - a.relevance_score);

        results.total.categories = results.categories.length;
      } catch (error) {
        console.error("Error searching categories:", error);
      }
    }

    // Calculate overall total
    results.total.all = results.total.products + results.total.categories;

    res.json(results);
  } catch (error) {
    console.error("Error performing search:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to perform search",
      details: error.message,
    });
  }
}

