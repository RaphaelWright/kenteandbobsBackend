import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/debug/check-user?email=test@example.com
 * Debug endpoint to check if a user exists (NO AUTH REQUIRED)
 * (For development/debugging only - remove in production!)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        error: "Email query parameter is required",
        usage: "GET /store/debug/check-user?email=test@example.com"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Check for auth identities with this email
    const authIdentities = await (authModuleService as any).listAuthIdentities({
      entity_id: email
    });

    // Check for customers with this email
    const customers = await customerModuleService.listCustomers({
      email
    });

    res.status(200).json({
      email,
      user_exists: authIdentities.length > 0,
      customer_exists: customers.length > 0,
      debug_info: {
        auth_identities_found: authIdentities.length,
        customers_found: customers.length,
        auth_providers: authIdentities.map((ai: any) => ai.provider),
        has_emailpass_provider: authIdentities.some((ai: any) => ai.provider === 'emailpass')
      },
      recommendation: authIdentities.length === 0 
        ? "User does not exist. Please sign up first at POST /store/auth/signup"
        : "User exists. Try logging in at POST /store/auth/login"
    });
  } catch (error) {
    console.error("Check user error:", error);
    res.status(500).json({
      error: error.message || "Failed to check user",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}






