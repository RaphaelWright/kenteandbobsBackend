import { model } from "@medusajs/framework/utils";

/**
 * Wishlist Model
 * Stores customer favorite/wishlist products
 */
const Wishlist = model.define("wishlist", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  product_id: model.text(),
  variant_id: model.text().nullable(), // Optional: specific variant
  added_at: model.dateTime(),
});

export default Wishlist;

