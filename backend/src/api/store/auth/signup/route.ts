import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/auth/signup
 * Register a new customer
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, password, first_name, last_name } = req.body as {
      email?: string;
      password?: string;
      first_name?: string;
      last_name?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Check if auth identity with this email already exists
    try {
      const { success } = await authModuleService.authenticate("emailpass", {
        body: {
          email,
          password: "test" // Just checking existence
        }
      } as any) as any;
      
      if (success) {
        return res.status(409).json({
          error: "An account with this email already exists"
        });
      }
    } catch (err) {
      // If authentication fails, user doesn't exist - continue with signup
    }

    // Create auth identity with emailpass provider
    const authIdentity = await (authModuleService as any).createAuthIdentities({
      provider: "emailpass",
      entity_id: email,
      provider_metadata: {
        password: password
      }
    });

    // Create customer record and link to auth identity
    const customer = await customerModuleService.createCustomers({
      email,
      first_name,
      last_name
    });

    // Update auth identity with customer reference
    await (authModuleService as any).updateAuthIdentities({
      id: authIdentity.id,
      app_metadata: {
        customer_id: customer.id
      }
    });

    // Set auth session
    req.session.auth_context = {
      actor_id: authIdentity.id,
      actor_type: "customer",
      auth_identity_id: authIdentity.id,
      app_metadata: {
        customer_id: customer.id
      }
    };

    res.status(201).json({
      message: "Signup successful",
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    
    // Handle duplicate email error from auth service
    if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
      return res.status(409).json({
        error: "An account with this email already exists"
      });
    }

    res.status(500).json({
      error: error.message || "Signup failed"
    });
  }
}

