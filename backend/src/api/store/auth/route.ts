import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/register
 * Register a new customer
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

    // Create auth identity with emailpass provider
    const authIdentity = await authModuleService.createAuthIdentities({
      provider: "emailpass",
      entity_id: email,
      provider_metadata: {
        password: password
      }
    } as any) as any;

    res.status(201).json({
      message: "Registration successful",
      auth_identity: {
        id: authIdentity.id,
        provider: authIdentity.provider,
        entity_id: authIdentity.entity_id
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: error.message || "Registration failed"
    });
  }
}

