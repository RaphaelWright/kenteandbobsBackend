import { MedusaRequest, MedusaResponse } from "@medusajs/framework";

/**
 * POST /store/auth/logout
 * Logout the current customer
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    // Clear the session
    req.session.auth_context = undefined;
    
    res.status(200).json({
      message: "Logout successful"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      error: error.message || "Logout failed"
    });
  }
}

