import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../../modules/review/service";

/**
 * POST /admin/reviews/:id/approve
 * Approve a review (admin only)
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const { id } = req.params;

  try {
    const [review] = await reviewModuleService.listReviews({ id });

    if (!review) {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    const updatedReview = await reviewModuleService.updateReviews({
      id,
      status: "approved",
    });

    res.json({
      review: updatedReview,
      message: "Review approved successfully",
    });
  } catch (error) {
    console.error("Error approving review:", error);
    res.status(500).json({
      error: "Failed to approve review",
      message: error.message,
    });
  }
}

