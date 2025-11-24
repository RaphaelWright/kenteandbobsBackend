import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import WishlistModuleService from "../../../modules/wishlist/service";

/**
 * GET /store/wishlist
 * Fetch customer's wishlist with product details
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlistModuleService");
  const query = req.scope.resolve("query");
  
  try {
    // Get customer from auth context
    const authContext = req.session?.auth_context;
    const customerId = authContext?.actor_id;
    
    if (!customerId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to view your wishlist",
      });
    }

    // Fetch wishlist items for customer
    const wishlistItems = await wishlistModuleService.listWishlists({
      customer_id: customerId,
    });

    if (!wishlistItems || wishlistItems.length === 0) {
      return res.json({
        wishlist: [],
        count: 0,
      });
    }

    // Fetch product details for wishlist items
    const productIds = wishlistItems.map((item: any) => item.product_id);
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
        "images.*",
        "variants.*",
        "variants.prices.*",
      ],
      filters: {
        id: productIds,
        status: "published",
      },
    });

    // Map wishlist items with product details
    const wishlistWithDetails = wishlistItems.map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      
      if (!product) return null;

      // Get variant if specified
      let variant = null;
      if (item.variant_id) {
        variant = product.variants?.find((v: any) => v.id === item.variant_id);
      }

      // Get price information
      const prices = product.variants
        ?.flatMap((v: any) => v.prices?.map((p: any) => p.amount) || [])
        .filter((p: any) => p != null);
      
      const minPrice = prices?.length ? Math.min(...prices) : null;
      const maxPrice = prices?.length ? Math.max(...prices) : null;
      const currency = product.variants?.[0]?.prices?.[0]?.currency_code || "ghs";

      // Calculate total quantity based on variant count
      // Each variant represents one available unit
      const totalQuantity = product.variants?.length || 0;

      return {
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        added_at: item.added_at,
        product: {
          id: product.id,
          name: product.title,
          handle: product.handle,
          description: product.description,
          subtitle: product.subtitle,
          thumbnail: product.thumbnail,
          images: product.images?.map((img: any) => ({
            id: img.id,
            url: img.url,
          })) || [],
          price: {
            min: minPrice,
            max: maxPrice,
            currency: currency,
          },
          quantity: totalQuantity,
          in_stock: totalQuantity > 0,
        },
        variant: variant ? {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          price: variant.prices?.[0]?.amount || null,
          currency: variant.prices?.[0]?.currency_code || "ghs",
          quantity: 1, // Each variant represents one unit
        } : null,
      };
    }).filter((item: any) => item !== null);

    res.json({
      wishlist: wishlistWithDetails,
      count: wishlistWithDetails.length,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({
      error: "Failed to fetch wishlist",
      message: error.message,
    });
  }
}

/**
 * POST /store/wishlist
 * Add a product to wishlist
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const wishlistModuleService: WishlistModuleService = req.scope.resolve("wishlistModuleService");
  
  try {
    // Get customer from auth context
    const authContext = req.session?.auth_context;
    const customerId = authContext?.actor_id;
    
    if (!customerId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "You must be logged in to add items to your wishlist",
      });
    }

    const { product_id, variant_id } = req.body as { product_id?: string; variant_id?: string };

    if (!product_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "product_id is required",
      });
    }

    // Check if item already exists in wishlist
    const existingItems = await wishlistModuleService.listWishlists({
      customer_id: customerId,
      product_id: product_id,
      ...(variant_id && { variant_id }),
    });

    if (existingItems && existingItems.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "Product is already in your wishlist",
        wishlist_item: existingItems[0],
      });
    }

    // Add to wishlist
    const wishlistItem = await wishlistModuleService.createWishlists({
      customer_id: customerId,
      product_id: product_id,
      variant_id: variant_id || null,
      added_at: new Date(),
    });

    res.status(201).json({
      message: "Product added to wishlist",
      wishlist_item: wishlistItem,
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({
      error: "Failed to add to wishlist",
      message: error.message,
    });
  }
}

