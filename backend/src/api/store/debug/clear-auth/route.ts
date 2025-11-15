import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * DELETE /store/debug/clear-auth?email=test@example.com
 * Debug endpoint to clear auth identities for a specific email
 * (For development/debugging only - remove in production!)
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({
        error: "Email query parameter is required",
        usage: "DELETE /store/debug/clear-auth?email=test@example.com"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Find auth identities with this email
    const authIdentities = await (authModuleService as any).listAuthIdentities({
      entity_id: email
    });

    // Find customers with this email
    const customers = await customerModuleService.listCustomers({
      email
    });

    // Delete auth identities
    for (const identity of authIdentities) {
      await (authModuleService as any).deleteAuthIdentities(identity.id);
    }

    // Delete customers
    for (const customer of customers) {
      await customerModuleService.deleteCustomers(customer.id);
    }

    res.status(200).json({
      message: "Successfully cleared user data",
      email,
      deleted: {
        auth_identities: authIdentities.length,
        customers: customers.length
      },
      note: "You can now sign up again with this email"
    });
  } catch (error) {
    console.error("Clear auth error:", error);
    res.status(500).json({
      error: error.message || "Failed to clear auth data",
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

