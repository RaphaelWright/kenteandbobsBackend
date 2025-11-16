import { MedusaService } from "@medusajs/framework/utils";
import Review from "./models/review";

export default class ReviewModuleService extends MedusaService({
  Review,
}) {}

