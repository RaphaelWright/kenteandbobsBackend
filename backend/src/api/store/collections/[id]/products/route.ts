import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../../modules/review/service";
import WishlistModuleService from "../../../../../modules/wishlist/service";
import { enrichPrice } from "../../../../../utils/currency";

/**
 * GET /store/collections/:id/products
 * Fetch all products under a particular collection
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve("query");
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlistModuleService");
  
  try {
    // Get collection ID from URL parameters
    const { id: collectionId } = req.params;

    if (!collectionId) {
      return res.status(400).json({
        error: "Collection ID is required",
      });
    }

    // Query parameters
    const {
      limit = 50,
      offset = 0,
      search,
    } = req.query;

    // First, verify that the collection exists
    const { data: collections } = await query.graph({
      entity: "product_collection",
      filters: {
        id: collectionId,
      },
    });

    if (!collections || collections.length === 0) {
      return res.status(404).json({
        error: "Collection not found",
      });
    }

    // Fetch products in the collection using Medusa's standard approach
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
        "variants.prices.*",
        "variants.inventory_items.*",
        "variants.inventory_items.inventory.location_levels.*",
        "categories.*",
        "tags.*",
        "collection.*",
      ],
      filters: {
        collection: {
          id: collectionId,
        },
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
      } catch (reviewError) {
        console.warn("Could not fetch reviews:", reviewError);
      }
    }

    // Fetch wishlist items if customer is logged in
    let wishlistItems: string[] = [];
    if (customerId) {
      try {
        const wishlists = await wishlistModuleService.listWishlistItems({
          customer_id: customerId,
          product_id: productIds,
        });
        wishlistItems = wishlists.map((item: any) => item.product_id);
      } catch (wishlistError) {
        console.warn("Could not fetch wishlist:", wishlistError);
      }
    }

    // Format response with enriched pricing
    const formattedProducts = products.map((product: any) => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      subtitle: product.subtitle,
      thumbnail: product.thumbnail,
      status: product.status,
      images: product.images || [],
      variants: (product.variants || []).map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        sku: variant.sku,
        barcode: variant.barcode,
        prices: (variant.prices || []).map((price: any) => 
          enrichPrice(price)
        ),
        inventory_items: variant.inventory_items || [],
      })),
      categories: product.categories || [],
      tags: product.tags || [],
      collection: product.collection ? {
        id: product.collection.id,
        title: product.collection.title,
        handle: product.collection.handle,
      } : null,
      reviews: reviewsByProduct[product.id] || {
        reviews: [],
        total: 0,
        average: 0,
      },
      is_wishlisted: wishlistItems.includes(product.id),
      created_at: product.created_at,
      updated_at: product.updated_at,
    }));

    res.json({
      collection: collections[0],
      products: formattedProducts,
      count: formattedProducts.length,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching collection products:", error);
    res.status(500).json({
      error: "Failed to fetch collection products",
      message: error.message,
    });
  }
}
