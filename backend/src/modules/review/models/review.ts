import { model } from "@medusajs/framework/utils";

/**
 * Review Model
 * Stores customer reviews for products
 */
const Review = model.define("review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text().nullable(),
  customer_name: model.text(),
  customer_email: model.text().nullable(),
  rating: model.number(), // 1-5 stars
  title: model.text().nullable(),
  comment: model.text(),
  verified_purchase: model.boolean().default(false),
  status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  helpful_count: model.number().default(0),
  created_at: model.dateTime(),
  updated_at: model.dateTime(),
});

export default Review;

