import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/customer-profile
 * Alternative endpoint to get current authenticated customer details
 * Use this as a workaround for /store/customers/me
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== /store/customer-profile called ===");
    console.log("Session exists:", !!req.session);
    console.log("Session data:", req.session ? {
      hasAuthContext: !!req.session.auth_context,
      authIdentityId: req.session.auth_context?.auth_identity_id,
      actorId: req.session.auth_context?.actor_id,
      actorType: req.session.auth_context?.actor_type
    } : 'NO SESSION');
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated"
      });
    }
    
    console.log("✅ Auth context found:", {
      auth_identity_id: authContext.auth_identity_id,
      actor_id: authContext.actor_id
    });

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Retrieve auth identity to get customer_id from app_metadata
    const authIdentity = await authModuleService.retrieveAuthIdentity(
      authContext.auth_identity_id
    ) as any;

    if (!authIdentity) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Get customer_id from app_metadata or try to find by email
    const customerId = authIdentity.app_metadata?.customer_id;
    const customerEmail = authIdentity.entity_id;

    let customer;

    if (customerId) {
      // Try to retrieve customer by ID first
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch (error) {
        // If customer not found by ID, try by email
        console.warn("Customer not found by ID, trying by email:", error.message);
      }
    }

    // If customer not found by ID, try to find by email
    if (!customer && customerEmail) {
      const customers = await customerModuleService.listCustomers({
        email: customerEmail
      });

      if (customers && customers.length > 0) {
        customer = customers[0];
      }
    }

    if (!customer) {
      return res.status(404).json({
        error: "Customer not found"
      });
    }

    // Return customer details
    res.status(200).json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        metadata: customer.metadata
      }
    });
  } catch (error) {
    console.error("Get customer details error:", error);
    res.status(500).json({
      error: error.message || "Failed to get customer details"
    });
  }
}

