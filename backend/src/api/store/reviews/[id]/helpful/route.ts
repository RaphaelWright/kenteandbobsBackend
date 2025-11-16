import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../../modules/review/service";

/**
 * POST /store/reviews/:id/helpful
 * Mark a review as helpful
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params;

  try {
    const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");

    const [review] = await reviewModuleService.listReviews({ id });

    if (!review) {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    const updatedReview = await reviewModuleService.updateReviews({
      id,
      helpful_count: review.helpful_count + 1,
    });

    res.json({
      review: updatedReview,
      message: "Review marked as helpful",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({
      error: "Failed to update review",
      message: error.message,
    });
  }
}

