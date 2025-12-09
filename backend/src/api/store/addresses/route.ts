import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/addresses
 * Get all addresses for the authenticated customer
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== GET /store/addresses called ===");
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated",
        message: "You must be logged in to view addresses"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Retrieve auth identity to get customer_id
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
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch (error: any) {
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

    // Fetch customer addresses
    const addresses = await customerModuleService.listCustomerAddresses({
      customer_id: customer.id
    });

    // Return customer addresses
    res.status(200).json({
      addresses: addresses || []
    });
  } catch (error: any) {
    console.error("Get addresses error:", error);
    res.status(500).json({
      error: error.message || "Failed to get addresses"
    });
  }
}

/**
 * POST /store/addresses
 * Create a new address for the authenticated customer
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== POST /store/addresses called ===");
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated",
        message: "You must be logged in to create an address"
      });
    }

    const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);
    const customerModuleService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER);

    // Retrieve auth identity to get customer_id
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
      try {
        customer = await customerModuleService.retrieveCustomer(customerId);
      } catch (error: any) {
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

    // Validate address data
    const {
      first_name,
      last_name,
      address_1,
      address_2,
      city,
      province,
      postal_code,
      country_code,
      phone,
      company,
      metadata,
      is_default_shipping,
      is_default_billing
    } = req.body as any;

    // Required fields validation
    if (!first_name || !last_name || !address_1 || !city || !country_code || !phone) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Missing required fields: first_name, last_name, address_1, city, country_code, phone are required"
      });
    }

    // Validate phone number format (Ghana format)
    if (phone && !phone.match(/^\+233\d{9}$/)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Phone number must be in format: +233XXXXXXXXX"
      });
    }

    // Create the address
    const addressData = {
      customer_id: customer.id,
      first_name,
      last_name,
      address_1,
      address_2: address_2 || "",
      city,
      province: province || "",
      postal_code: postal_code || "",
      country_code: country_code.toLowerCase(),
      phone,
      company: company || "",
      metadata: metadata || {},
      is_default_shipping: is_default_shipping || false,
      is_default_billing: is_default_billing || false
    };

    const createdAddress = await customerModuleService.createCustomerAddresses(addressData);

    console.log("✅ Address created successfully:", (createdAddress as any).id);

    res.status(201).json({
      address: createdAddress
    });
  } catch (error: any) {
    console.error("Create address error:", error);
    res.status(500).json({
      error: error.message || "Failed to create address"
    });
  }
}
