import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/login
 * Authenticate a customer
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

    // Authenticate with emailpass provider
    const authResult = await authModuleService.authenticate("emailpass", {
      body: {
        email,
        password
      }
    } as any) as any;

    console.log("Auth result:", { success: authResult?.success, hasIdentity: !!authResult?.authIdentity });

    if (!authResult?.success || !authResult?.authIdentity) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const { authIdentity } = authResult;

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
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    
    // If authentication throws an error, it's likely invalid credentials
    if (error.message?.includes("Invalid") || error.message?.includes("credentials")) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }
    
    res.status(500).json({
      error: error.message || "Login failed"
    });
  }
}

