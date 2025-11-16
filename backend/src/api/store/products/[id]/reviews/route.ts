import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../../modules/review/service";

/**
 * GET /store/products/:id/reviews
 * Fetch all approved reviews for a product
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params;
  const { limit = 20, offset = 0, sort = "created_at:desc" } = req.query;

  try {
    const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");

    const [reviews, count] = await reviewModuleService.listAndCountReviews(
      {
        product_id: id,
        status: "approved",
      },
      {
        skip: Number(offset),
        take: Number(limit),
        order: {
          created_at: "DESC",
        },
      }
    );

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = reviews.length > 0 ? totalRating / reviews.length : 0;

    // Calculate rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    res.json({
      reviews,
      count,
      average_rating: Math.round(averageRating * 10) / 10,
      rating_distribution: ratingDistribution,
      offset: Number(offset),
      limit: Number(limit),
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({
      error: "Failed to fetch reviews",
      message: error.message,
    });
  }
}

/**
 * POST /store/products/:id/reviews
 * Create a new review for a product
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { id } = req.params;
  const { rating, title, comment, customer_name, customer_email } = req.body;

  // Validation
  if (!rating || !comment || !customer_name) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["rating", "comment", "customer_name"],
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      error: "Rating must be between 1 and 5",
    });
  }

  try {
    const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
    
    // Check if customer is authenticated
    const customer_id = req.auth?.actor_id || null;

    const review = await reviewModuleService.createReviews({
      product_id: id,
      customer_id,
      customer_name,
      customer_email: customer_email || null,
      rating: Number(rating),
      title: title || null,
      comment,
      verified_purchase: !!customer_id, // Mark as verified if authenticated
      status: "pending", // Reviews need approval by default
      helpful_count: 0,
    });

    res.status(201).json({
      review,
      message: "Review submitted successfully. It will be visible after approval.",
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({
      error: "Failed to create review",
      message: error.message,
    });
  }
}

