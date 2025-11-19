import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../modules/review/service";

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
  const { id } = req.params;

  try {
    // Fetch product using Medusa's standard approach
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
        "variants.inventory_items.inventory.*",
        "categories.*",
        "tags.*",
        "options.*",
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

    // Calculate total quantity
    const totalQuantity = product.variants?.reduce((sum: number, variant: any) => {
      const inventoryQuantity = variant.inventory_items?.reduce(
        (invSum: number, item: any) => invSum + (item.inventory?.stocked_quantity || 0),
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
        min: minPrice,
        max: maxPrice,
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
      options: product.options?.map((opt: any) => ({
        id: opt.id,
        title: opt.title,
        values: opt.values,
      })) || [],
      quantity: totalQuantity,
      variants: product.variants?.map((variant: any) => {
        const variantPrice = variant.prices?.[0];
        return {
          id: variant.id,
          title: variant.title,
          sku: variant.sku,
          barcode: variant.barcode,
          price: variantPrice?.amount || null,
          currency: variantPrice?.currency_code || "ghs",
          inventory_quantity: variant.inventory_items?.reduce(
            (sum: number, item: any) => sum + (item.inventory?.stocked_quantity || 0),
            0
          ) || 0,
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
