import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../modules/review/service";
import WishlistModuleService from "../../../../modules/wishlist/service";
import { enrichPrice } from "../../../../utils/currency";

/**
 * GET /store/products/:id
 * Fetch a single product by ID
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlistModuleService");
  const { id } = req.params;

  try {
    // Fetch product using Medusa's standard approach with inventory data
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
        "variants.inventory_items.inventory.location_levels.*",
        "categories.*",
        "tags.*",
        "options.*",
        "collection.*",
      ],
      filters: {
        id,
        status: "published",
      },
    });

    if (!products || products.length === 0) {
      return res.status(404).json({
        error: "Product not found",
      });
    }

    const product = products[0];

    // Get customer ID if logged in
    const authContext = req.session?.auth_context;
    const customerId = authContext?.actor_id;

    // Fetch reviews
    let reviews: any[] = [];
    let averageRating = 0;
    let ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    try {
      reviews = await reviewModuleService.listReviews({
        product_id: id,
        status: "approved",
      });

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

      ratingDistribution = {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      };
    } catch (error) {
      console.error("Review module error:", error.message);
    }

    // Check if product is in wishlist
    let isInWishlist = false;
    
    if (customerId) {
      try {
        const wishlistItems = await wishlistModuleService.listWishlists({
          customer_id: customerId,
          product_id: id,
        });
        
        isInWishlist = wishlistItems && wishlistItems.length > 0;
      } catch (error) {
        console.error("Wishlist module error:", error.message);
      }
    }

    // Calculate total quantity from actual inventory levels
    let totalQuantity = 0;
    
    product.variants?.forEach((variant: any) => {
      if (variant.inventory_items && Array.isArray(variant.inventory_items)) {
        for (const inventoryItem of variant.inventory_items) {
          if (inventoryItem.inventory?.location_levels && Array.isArray(inventoryItem.inventory.location_levels)) {
            const quantity = inventoryItem.inventory.location_levels.reduce(
              (sum: number, level: any) => sum + (level.available_quantity || 0),
              0
            );
            totalQuantity += quantity;
          }
        }
      }
    });

    // Get price range from variant prices
    const prices = product.variants
      ?.flatMap((v: any) => v.prices?.map((p: any) => p.amount) || [])
      .filter((p: any) => p != null);
    
    const minPrice = prices?.length ? Math.min(...prices) : null;
    const maxPrice = prices?.length ? Math.max(...prices) : null;
    const currency = product.variants?.[0]?.prices?.[0]?.currency_code || "ghs";

    // Enrich price with display values
    const enrichedMinPrice = minPrice ? enrichPrice(minPrice, currency) : null;
    const enrichedMaxPrice = maxPrice ? enrichPrice(maxPrice, currency) : null;

    const formattedProduct = {
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
        min: enrichedMinPrice?.amount || minPrice,
        max: enrichedMaxPrice?.amount || maxPrice,
        min_display: enrichedMinPrice?.display_amount || null,
        max_display: enrichedMaxPrice?.display_amount || null,
        min_formatted: enrichedMinPrice?.formatted || null,
        max_formatted: enrichedMaxPrice?.formatted || null,
        currency: currency,
      },
      categories: product.categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        handle: cat.handle,
        description: cat.description,
      })) || [],
      tags: product.tags?.map((tag: any) => ({
        id: tag.id,
        value: tag.value,
      })) || [],
      collection: product.collection ? {
        id: product.collection.id,
        name: product.collection.title,
        handle: product.collection.handle,
      } : null,
      options: product.options?.map((opt: any) => ({
        id: opt.id,
        title: opt.title,
        values: opt.values,
      })) || [],
      quantity: totalQuantity,
      variants: product.variants?.map((variant: any) => {
        const variantPrice = variant.prices?.[0];
        const enrichedVariantPrice = variantPrice?.amount 
          ? enrichPrice(variantPrice.amount, variantPrice.currency_code || "ghs")
          : null;
        
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
          price_display: enrichedVariantPrice?.display_amount || null,
          price_formatted: enrichedVariantPrice?.formatted || null,
          currency: variantPrice?.currency_code || "ghs",
          quantity: availableQuantity,
          options: variant.options,
        };
      }) || [],
      reviews: {
        total: reviews.length,
        average_rating: Math.round(averageRating * 10) / 10,
        rating_distribution: ratingDistribution,
        items: reviews.map((review) => ({
          id: review.id,
          customer_name: review.customer_name,
          rating: review.rating,
          title: review.title,
          comment: review.comment,
          verified_purchase: review.verified_purchase,
          helpful_count: review.helpful_count,
          created_at: review.created_at,
        })),
      },
      is_in_wishlist: isInWishlist,
      created_at: product.created_at,
      updated_at: product.updated_at,
    };

    res.json({
      product: formattedProduct,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      error: "Failed to fetch product",
      message: error.message,
    });
  }
}
