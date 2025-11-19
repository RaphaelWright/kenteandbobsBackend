import { Module } from "@medusajs/framework/utils";
import WishlistModuleService from "./service";
import "./models/wishlist"; // Import model for migration detection

export const WISHLIST_MODULE = "wishlistModuleService";

export default Module(WISHLIST_MODULE, {
  service: WishlistModuleService,
});

