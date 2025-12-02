import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * GET /store/test-route
 * Simple test to verify routes are loading
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  console.log("✅ TEST ROUTE HIT - Routes are loading correctly!");
  
  res.status(200).json({
    message: "Test route working!",
    session_exists: !!req.session,
    has_auth_context: !!req.session?.auth_context
  });
}

