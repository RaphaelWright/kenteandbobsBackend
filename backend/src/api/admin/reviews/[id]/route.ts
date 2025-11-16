import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../../modules/review/service";

/**
 * GET /admin/reviews/:id
 * Get a single review (admin only)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const { id } = req.params;

  try {
    const [review] = await reviewModuleService.listReviews({ id });

    if (!review) {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    res.json({ review });
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({
      error: "Failed to fetch review",
      message: error.message,
    });
  }
}

/**
 * PUT /admin/reviews/:id
 * Update a review (admin only)
 */
export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const { id } = req.params;
  const { status, rating, title, comment } = req.body;

  try {
    const [existingReview] = await reviewModuleService.listReviews({ id });

    if (!existingReview) {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (rating) updateData.rating = Number(rating);
    if (title !== undefined) updateData.title = title;
    if (comment) updateData.comment = comment;

    const updatedReview = await reviewModuleService.updateReviews(id, updateData);

    res.json({
      review: updatedReview,
      message: "Review updated successfully",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({
      error: "Failed to update review",
      message: error.message,
    });
  }
}

/**
 * DELETE /admin/reviews/:id
 * Delete a review (admin only)
 */
export async function DELETE(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  const { id } = req.params;

  try {
    const [existingReview] = await reviewModuleService.listReviews({ id });

    if (!existingReview) {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    await reviewModuleService.deleteReviews(id);

    res.json({
      id,
      deleted: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({
      error: "Failed to delete review",
      message: error.message,
    });
  }
}

