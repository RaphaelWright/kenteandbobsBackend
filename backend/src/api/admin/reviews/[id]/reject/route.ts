import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../../modules/review/service";

/**
 * POST /admin/reviews/:id/reject
 * Reject a review (admin only)
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
      status: "rejected",
    });

    res.json({
      review: updatedReview,
      message: "Review rejected successfully",
    });
  } catch (error) {
    console.error("Error rejecting review:", error);
    res.status(500).json({
      error: "Failed to reject review",
      message: error.message,
    });
  }
}

