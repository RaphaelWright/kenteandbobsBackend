import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService, IAuthModuleService, IRegionModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /store/customers/me
 * Get current authenticated customer details
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== /store/customers/me called ===");
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

/**
 * POST /store/customers/me
 * Update current authenticated customer details and addresses
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    console.log("=== POST /store/customers/me called ===");
    
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
    const regionModuleService: IRegionModuleService = req.scope.resolve(Modules.REGION);

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

    // Extract update data from request body
    const { customer: customerData } = req.body as any;

    if (!customerData) {
      return res.status(400).json({
        error: "Customer data is required"
      });
    }

    // Prepare customer update data
    const updateData: any = {};
    
    if (customerData.email !== undefined) updateData.email = customerData.email;
    if (customerData.first_name !== undefined) updateData.first_name = customerData.first_name;
    if (customerData.last_name !== undefined) updateData.last_name = customerData.last_name;
    if (customerData.company_name !== undefined) updateData.company_name = customerData.company_name;
    if (customerData.phone !== undefined) updateData.phone = customerData.phone;
    if (customerData.metadata !== undefined) updateData.metadata = customerData.metadata;
    if (customerData.default_billing_address_id !== undefined) {
      updateData.default_billing_address_id = customerData.default_billing_address_id;
    }
    if (customerData.default_shipping_address_id !== undefined) {
      updateData.default_shipping_address_id = customerData.default_shipping_address_id;
    }

    // Update customer basic information
    if (Object.keys(updateData).length > 0) {
      customer = await customerModuleService.updateCustomers(customer.id, updateData);
      console.log("✅ Customer updated:", customer.id);
    }

    // Handle addresses if provided
    if (customerData.addresses && Array.isArray(customerData.addresses)) {
      console.log("Processing addresses...");
      
      for (const addressData of customerData.addresses) {
        if (addressData.id) {
          // Update existing address
          try {
            const updateAddressData: any = {};
            
            if (addressData.address_name !== undefined) updateAddressData.address_name = addressData.address_name;
            if (addressData.is_default_shipping !== undefined) updateAddressData.is_default_shipping = addressData.is_default_shipping;
            if (addressData.is_default_billing !== undefined) updateAddressData.is_default_billing = addressData.is_default_billing;
            if (addressData.company !== undefined) updateAddressData.company = addressData.company;
            if (addressData.first_name !== undefined) updateAddressData.first_name = addressData.first_name;
            if (addressData.last_name !== undefined) updateAddressData.last_name = addressData.last_name;
            if (addressData.address_1 !== undefined) updateAddressData.address_1 = addressData.address_1;
            if (addressData.address_2 !== undefined) updateAddressData.address_2 = addressData.address_2;
            if (addressData.city !== undefined) updateAddressData.city = addressData.city;
            if (addressData.country_code !== undefined) updateAddressData.country_code = addressData.country_code;
            if (addressData.province !== undefined) updateAddressData.province = addressData.province;
            if (addressData.postal_code !== undefined) updateAddressData.postal_code = addressData.postal_code;
            if (addressData.phone !== undefined) updateAddressData.phone = addressData.phone;
            if (addressData.metadata !== undefined) updateAddressData.metadata = addressData.metadata;

            await customerModuleService.updateCustomerAddresses(addressData.id, updateAddressData);
            console.log("✅ Address updated:", addressData.id);
          } catch (error) {
            console.error("Error updating address:", error);
          }
        } else {
          // Create new address
          try {
            const newAddressData: any = {
              customer_id: customer.id,
              address_name: addressData.address_name || '',
              is_default_shipping: addressData.is_default_shipping || false,
              is_default_billing: addressData.is_default_billing || false,
              company: addressData.company || '',
              first_name: addressData.first_name || '',
              last_name: addressData.last_name || '',
              address_1: addressData.address_1 || '',
              address_2: addressData.address_2 || '',
              city: addressData.city || '',
              country_code: addressData.country_code || '',
              province: addressData.province || '',
              postal_code: addressData.postal_code || '',
              phone: addressData.phone || '',
              metadata: addressData.metadata || {}
            };

            const newAddress = await customerModuleService.createCustomerAddresses(newAddressData);
            console.log("✅ Address created:", newAddress.id);
          } catch (error) {
            console.error("Error creating address:", error);
          }
        }
      }
    }

    // Retrieve updated customer with addresses
    const updatedCustomer = await customerModuleService.retrieveCustomer(customer.id, {
      relations: ["addresses"]
    });

    // Return updated customer details
    res.status(200).json({
      customer: {
        id: updatedCustomer.id,
        email: updatedCustomer.email,
        default_billing_address_id: updatedCustomer.default_billing_address_id,
        default_shipping_address_id: updatedCustomer.default_shipping_address_id,
        company_name: updatedCustomer.company_name,
        first_name: updatedCustomer.first_name,
        last_name: updatedCustomer.last_name,
        phone: updatedCustomer.phone,
        created_at: updatedCustomer.created_at,
        updated_at: updatedCustomer.updated_at,
        metadata: updatedCustomer.metadata,
        addresses: updatedCustomer.addresses || []
      }
    });
  } catch (error) {
    console.error("Update customer details error:", error);
    res.status(500).json({
      error: error.message || "Failed to update customer details"
    });
  }
}

