import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import ReviewModuleService from "../../../modules/review/service";

/**
 * GET /admin/reviews
 * List all reviews (admin only)
 */
export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const reviewModuleService: ReviewModuleService = req.scope.resolve("reviewModuleService");
  
  try {
    const {
      limit = 50,
      offset = 0,
      status,
      product_id,
    } = req.query;

    const filters: any = {};
    if (status) filters.status = status;
    if (product_id) filters.product_id = product_id;

    const [reviews, count] = await reviewModuleService.listAndCountReviews(
      filters,
      {
        skip: Number(offset),
        take: Number(limit),
        order: {
          created_at: "DESC",
        },
      }
    );

    res.json({
      reviews,
      count,
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

