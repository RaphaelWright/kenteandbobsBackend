import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/debug/fix-password
 * Fix corrupted password (for development only - remove in production!)
 * 
 * This endpoint helps recover accounts where the password was corrupted
 * by a broken update method that didn't properly hash passwords.
 * 
 * Request body:
 * - email: string (required)
 * - new_password: string (required)
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const { email, new_password } = req.body as {
      email?: string;
      new_password?: string;
    };

    if (!email || !new_password) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Email and new_password are required"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Check if customer exists
    const customers = await customerModuleService.listCustomers({ email });
    if (customers.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "No customer found with this email"
      });
    }

    // Find all auth identities for this email
    const allAuthIdentities = await authModuleService.listAuthIdentities();
    const userIdentities = allAuthIdentities.filter(
      (identity: any) => identity.entity_id === email && identity.provider === "emailpass"
    );

    if (userIdentities.length === 0) {
      return res.status(404).json({
        error: "Not Found",
        message: "No emailpass auth identity found for this email"
      });
    }

    console.log(`Found ${userIdentities.length} auth identity(ies) for ${email}`);

    // Save app_metadata from the first identity (contains customer_id linkage)
    const savedAppMetadata = userIdentities[0].app_metadata || {};
    console.log(`Saving app_metadata:`, savedAppMetadata);

    // Delete all existing auth identities for this email
    for (const identity of userIdentities) {
      console.log(`Deleting corrupted auth identity: ${identity.id}`);
      await authModuleService.deleteAuthIdentities([identity.id]);
    }

    // Create new auth identity with properly hashed password
    console.log(`Creating new auth identity with properly hashed password for: ${email}`);
    const authResult = await authModuleService.register("emailpass", {
      body: {
        email,
        password: new_password
      }
    } as any) as any;

    if (!authResult?.success || !authResult?.authIdentity) {
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to create new auth identity"
      });
    }

    // Restore app_metadata (including customer_id) to maintain linkage
    if (Object.keys(savedAppMetadata).length > 0) {
      console.log(`Restoring app_metadata for: ${email}`, savedAppMetadata);
      await authModuleService.updateAuthIdentities({
        id: authResult.authIdentity.id,
        app_metadata: savedAppMetadata
      } as any);
    }

    console.log(`Successfully fixed password for: ${email}`);

    res.status(200).json({
      message: "Password has been fixed successfully",
      success: true,
      details: {
        email,
        new_auth_identity_id: authResult.authIdentity.id,
        deleted_identities: userIdentities.length
      }
    });
  } catch (error) {
    console.error("Fix password error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Failed to fix password"
    });
  }
}

