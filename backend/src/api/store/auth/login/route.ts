import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/login
 * Authenticate a customer
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Authenticate with emailpass provider
    const { success, authIdentity } = await authModuleService.authenticate("emailpass", {
      body: {
        email,
        password
      }
    });

    if (!success || !authIdentity) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    // Set auth session
    req.session.auth_context = {
      actor_id: authIdentity.id,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      app_metadata: {
        customer_id: authIdentity.app_metadata?.customer_id
      }
    };

    res.status(200).json({
      message: "Login successful",
      customer: {
        id: authIdentity.id,
        email: authIdentity.entity_id
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: error.message || "Login failed"
    });
  }
}

