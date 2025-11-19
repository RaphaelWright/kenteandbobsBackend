import { MedusaService } from "@medusajs/framework/utils";
import Wishlist from "./models/wishlist";

export default class WishlistModuleService extends MedusaService({
  Wishlist,
}) {}

