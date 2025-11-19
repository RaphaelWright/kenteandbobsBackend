import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import WishlistModuleService from "../../../../modules/wishlist/service";

/**
 * DELETE /store/wishlist/:id
 * Remove a product from wishlist
 */
export async function DELETE(
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
        message: "You must be logged in to remove items from your wishlist",
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Wishlist item ID is required",
      });
    }

    // Verify the wishlist item belongs to this customer
    const wishlistItem = await wishlistModuleService.retrieveWishlist(id);

    if (!wishlistItem) {
      return res.status(404).json({
        error: "Not Found",
        message: "Wishlist item not found",
      });
    }

    if (wishlistItem.customer_id !== customerId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only remove items from your own wishlist",
      });
    }

    // Delete the wishlist item
    await wishlistModuleService.deleteWishlists(id);

    res.json({
      message: "Product removed from wishlist",
      id: id,
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({
      error: "Failed to remove from wishlist",
      message: error.message,
    });
  }
}

/**
 * GET /store/wishlist/:id
 * Get a specific wishlist item
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
        message: "You must be logged in to view wishlist items",
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Wishlist item ID is required",
      });
    }

    // Retrieve the wishlist item
    const wishlistItem = await wishlistModuleService.retrieveWishlist(id);

    if (!wishlistItem) {
      return res.status(404).json({
        error: "Not Found",
        message: "Wishlist item not found",
      });
    }

    if (wishlistItem.customer_id !== customerId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only view your own wishlist items",
      });
    }

    // Fetch product details
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
        id: wishlistItem.product_id,
      },
    });

    const product = products[0];

    res.json({
      wishlist_item: {
        id: wishlistItem.id,
        product_id: wishlistItem.product_id,
        variant_id: wishlistItem.variant_id,
        added_at: wishlistItem.added_at,
        product: product ? {
          id: product.id,
          name: product.title,
          handle: product.handle,
          thumbnail: product.thumbnail,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching wishlist item:", error);
    res.status(500).json({
      error: "Failed to fetch wishlist item",
      message: error.message,
    });
  }
}

