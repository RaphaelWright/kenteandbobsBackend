import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICustomerModuleService, IAuthModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * DELETE /store/addresses/[id]
 * Delete a specific address for the authenticated customer
 */
export async function DELETE(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
  try {
    console.log("=== DELETE /store/addresses/[id] called ===");
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated",
        message: "You must be logged in to delete an address"
      });
    }

    const addressId = req.params.id;

    if (!addressId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Address ID is required"
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

    // Verify the address belongs to this customer
    const addresses = await customerModuleService.listCustomerAddresses({
      id: addressId
    });

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({
        error: "Address not found",
        message: "The specified address does not exist"
      });
    }

    const address = addresses[0];

    if (address.customer_id !== customer.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this address"
      });
    }

    // Delete the address
    await customerModuleService.deleteCustomerAddresses(addressId);

    console.log("✅ Address deleted successfully:", addressId);

    res.status(200).json({
      id: addressId,
      deleted: true,
      message: "Address deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete address error:", error);
    res.status(500).json({
      error: error.message || "Failed to delete address"
    });
  }
}

/**
 * GET /store/addresses/[id]
 * Get a specific address for the authenticated customer
 */
export async function GET(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
  try {
    console.log("=== GET /store/addresses/[id] called ===");
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated",
        message: "You must be logged in to view an address"
      });
    }

    const addressId = req.params.id;

    if (!addressId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Address ID is required"
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

    // Retrieve the address
    const addresses = await customerModuleService.listCustomerAddresses({
      id: addressId
    });

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({
        error: "Address not found",
        message: "The specified address does not exist"
      });
    }

    const address = addresses[0];

    // Verify the address belongs to this customer
    if (address.customer_id !== customer.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to view this address"
      });
    }

    res.status(200).json({
      address
    });
  } catch (error: any) {
    console.error("Get address error:", error);
    res.status(500).json({
      error: error.message || "Failed to get address"
    });
  }
}

/**
 * PATCH /store/addresses/[id]
 * Update a specific address for the authenticated customer
 */
export async function PATCH(
  req: MedusaRequest<{ id: string }>,
  res: MedusaResponse
) {
  try {
    console.log("=== PATCH /store/addresses/[id] called ===");
    
    const authContext = req.session?.auth_context;

    if (!authContext || !authContext.auth_identity_id) {
      console.log("❌ Authentication failed - no auth context");
      return res.status(401).json({
        error: "Not authenticated",
        message: "You must be logged in to update an address"
      });
    }

    const addressId = req.params.id;

    if (!addressId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Address ID is required"
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

    // Verify the address belongs to this customer
    const addresses = await customerModuleService.listCustomerAddresses({
      id: addressId
    });

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({
        error: "Address not found",
        message: "The specified address does not exist"
      });
    }

    const address = addresses[0];

    if (address.customer_id !== customer.id) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this address"
      });
    }

    // Get update data from request body
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

    // Validate phone number format if provided (Ghana format)
    if (phone && !phone.match(/^\+233\d{9}$/)) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Phone number must be in format: +233XXXXXXXXX"
      });
    }

    // Build update object
    const updateData: any = {};

    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (address_1 !== undefined) updateData.address_1 = address_1;
    if (address_2 !== undefined) updateData.address_2 = address_2;
    if (city !== undefined) updateData.city = city;
    if (province !== undefined) updateData.province = province;
    if (postal_code !== undefined) updateData.postal_code = postal_code;
    if (country_code !== undefined) updateData.country_code = country_code.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (is_default_shipping !== undefined) updateData.is_default_shipping = is_default_shipping;
    if (is_default_billing !== undefined) updateData.is_default_billing = is_default_billing;

    // Update the address - updateCustomerAddresses expects (addressId, data)
    const updatedAddress = await customerModuleService.updateCustomerAddresses(addressId, updateData);

    console.log("✅ Address updated successfully:", addressId);

    res.status(200).json({
      address: updatedAddress
    });
  } catch (error: any) {
    console.error("Update address error:", error);
    res.status(500).json({
      error: error.message || "Failed to update address"
    });
  }
}
