import { Module } from "@medusajs/framework/utils";
import ReviewModuleService from "./service";
import "./models/review"; // Import model for migration detection

export const REVIEW_MODULE = "reviewModuleService";

export default Module(REVIEW_MODULE, {
  service: ReviewModuleService,
});

