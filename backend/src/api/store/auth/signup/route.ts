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

    // Check if customer with this email already exists
    const existingCustomers = await customerModuleService.listCustomers({
      email
    });

    if (existingCustomers.length > 0) {
      return res.status(409).json({
        error: "An account with this email already exists"
      });
    }

    // Register with emailpass provider (this will hash the password)
    const authResult = await authModuleService.register("emailpass", {
      body: {
        email,
        password
      }
    } as any) as any;

    console.log("Registration result:", { 
      success: authResult?.success, 
      hasIdentity: !!authResult?.authIdentity 
    });

    if (!authResult?.success || !authResult?.authIdentity) {
      return res.status(500).json({
        error: "Failed to create authentication identity"
      });
    }

    const authIdentity = authResult.authIdentity;

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

