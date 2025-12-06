/**
 * Shared helper functions for cart endpoints
 */

import { enrichPrice } from "../../../utils/currency";

/**
 * Format cart response with product details
 */
export async function formatCartResponse(cart: any, query: any) {
  // Fetch product details for cart items
  const itemIds = cart.items?.map((item: any) => item.variant_id).filter(Boolean) || [];
  
  let productsMap: Record<string, any> = {};
  
  if (itemIds.length > 0) {
    try {
      const { data: products } = await query.graph({
        entity: "product",
        fields: [
          "id",
          "title",
          "handle",
          "thumbnail",
          "variants.id",
          "variants.title",
          "variants.sku",
          "variants.prices.*",
        ],
        filters: {
          variants: {
            id: itemIds,
          },
        },
      });

      // Build map of variant_id -> product
      products.forEach((product: any) => {
        product.variants?.forEach((variant: any) => {
          productsMap[variant.id] = {
            product: {
              id: product.id,
              title: product.title,
              handle: product.handle,
              thumbnail: product.thumbnail,
            },
            variant: {
              id: variant.id,
              title: variant.title,
              sku: variant.sku,
              price: variant.prices?.[0]?.amount || null,
              currency: variant.prices?.[0]?.currency_code || "ghs",
            },
          };
        });
      });
    } catch (error) {
      console.error("Error fetching product details:", error);
    }
  }

  const currencyCode = cart.currency_code || "ghs";
  
  // Enrich cart totals with display values
  const enrichedSubtotal = enrichPrice(cart.subtotal || 0, currencyCode);
  const enrichedTaxTotal = enrichPrice(cart.tax_total || 0, currencyCode);
  const enrichedShippingTotal = enrichPrice(cart.shipping_total || 0, currencyCode);
  const enrichedDiscountTotal = enrichPrice(cart.discount_total || 0, currencyCode);
  const enrichedTotal = enrichPrice(cart.total || 0, currencyCode);

  return {
    id: cart.id,
    customer_id: cart.customer_id,
    email: cart.email,
    currency_code: currencyCode,
    region_id: cart.region_id,
    items: cart.items?.map((item: any) => {
      const productInfo = productsMap[item.variant_id] || {};
      const enrichedUnitPrice = enrichPrice(item.unit_price || 0, currencyCode);
      const enrichedItemTotal = enrichPrice(item.total || 0, currencyCode);
      
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_price_display: enrichedUnitPrice.display_amount,
        unit_price_formatted: enrichedUnitPrice.formatted,
        total: item.total,
        total_display: enrichedItemTotal.display_amount,
        total_formatted: enrichedItemTotal.formatted,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product: productInfo.product || null,
        variant: productInfo.variant || null,
      };
    }) || [],
    subtotal: cart.subtotal || 0,
    subtotal_display: enrichedSubtotal.display_amount,
    subtotal_formatted: enrichedSubtotal.formatted,
    tax_total: cart.tax_total || 0,
    tax_total_display: enrichedTaxTotal.display_amount,
    tax_total_formatted: enrichedTaxTotal.formatted,
    shipping_total: cart.shipping_total || 0,
    shipping_total_display: enrichedShippingTotal.display_amount,
    shipping_total_formatted: enrichedShippingTotal.formatted,
    discount_total: cart.discount_total || 0,
    discount_total_display: enrichedDiscountTotal.display_amount,
    discount_total_formatted: enrichedDiscountTotal.formatted,
    total: cart.total || 0,
    total_display: enrichedTotal.display_amount,
    total_formatted: enrichedTotal.formatted,
    shipping_address: cart.shipping_address || null,
    billing_address: cart.billing_address || null,
    created_at: cart.created_at,
    updated_at: cart.updated_at,
  };
}

/**
 * Get cart ID from request (body, query, or session)
 */
export function getCartId(req: any): string | null {
  return (req.body?.cart_id as string) || 
         (req.query?.cart_id as string) || 
         (req.session?.cart_id as string) || 
         null;
}

/**
 * Get customer ID from auth context
 * Now with fallback mechanisms and auto-create capability
 */
export async function getCustomerFromAuth(
  authContext: any,
  customerModuleService: any,
  authModuleService?: any
): Promise<{ id: string; email: string } | null> {
  if (!authContext?.auth_identity_id) {
    return null;
  }

  let customerEmail: string | null = null;

  // If authModuleService is provided, use enhanced email retrieval with fallbacks
  if (authModuleService) {
    try {
      const authIdentity = await authModuleService.retrieveAuthIdentity(
        authContext.auth_identity_id
      );

      // Primary: Get from entity_id
      customerEmail = authIdentity?.entity_id;

      // Fallback 1: Try actor_id from auth context
      if (!customerEmail && authContext.actor_id) {
        console.log("Using actor_id as fallback email:", authContext.actor_id);
        customerEmail = authContext.actor_id;
      }

      // Fallback 2: Try to get from customer record via app_metadata
      if (!customerEmail && authIdentity?.app_metadata?.customer_id) {
        console.log("Attempting to retrieve email from customer record:", authIdentity.app_metadata.customer_id);
        try {
          const customerRecord = await customerModuleService.retrieveCustomer(
            authIdentity.app_metadata.customer_id
          );
          if (customerRecord?.email) {
            console.log("Retrieved email from customer record:", customerRecord.email);
            customerEmail = customerRecord.email;
          }
        } catch (error) {
          console.error("Failed to retrieve customer record:", error);
        }
      }
    } catch (error) {
      console.error("Error retrieving auth identity:", error);
    }
  } else {
    // Legacy behavior: use actor_id directly (for backward compatibility)
    customerEmail = authContext.actor_id;
  }

  if (!customerEmail) {
    console.error("Unable to determine customer email from auth context");
    return null;
  }

  // Try to find existing customer by email
  const customers = await customerModuleService.listCustomers({
    email: customerEmail,
  });

  if (customers && customers.length > 0) {
    return {
      id: customers[0].id,
      email: customers[0].email,
    };
  }

  // Auto-create customer if authenticated but no customer record exists
  if (authModuleService) {
    try {
      console.log("Auto-creating customer record for:", customerEmail);
      const newCustomer = await customerModuleService.createCustomers({
        email: customerEmail,
      });

      return {
        id: newCustomer.id,
        email: newCustomer.email,
      };
    } catch (error) {
      console.error("Failed to auto-create customer:", error);
      return null;
    }
  }

  return null;
}

/**
 * Calculate cart totals from items
 * Medusa v2 carts often have totals at 0 until explicitly calculated
 */
export async function calculateAndUpdateCartTotals(
  cartId: string,
  cartModuleService: any
): Promise<void> {
  try {
    // Retrieve cart with items
    const cart = await cartModuleService.retrieveCart(cartId, {
      relations: ["items"],
    });

    if (!cart.items || cart.items.length === 0) {
      // Empty cart - set all totals to 0
      await cartModuleService.updateCarts(cartId, {
        subtotal: 0,
        total: 0,
        tax_total: 0,
        shipping_total: 0,
        discount_total: 0,
      });
      return;
    }

    // Calculate subtotal from items
    const subtotal = cart.items.reduce((sum: number, item: any) => {
      return sum + (item.unit_price || 0) * (item.quantity || 0);
    }, 0);

    // For now, tax and shipping are 0 (can be enhanced later)
    const tax_total = 0;
    const shipping_total = 0;
    const discount_total = 0;
    const total = subtotal + tax_total + shipping_total - discount_total;

    // Update cart totals
    await cartModuleService.updateCarts(cartId, {
      subtotal,
      total,
      tax_total,
      shipping_total,
      discount_total,
    });

    console.log(`Cart ${cartId} totals calculated:`, {
      subtotal,
      total,
      items_count: cart.items.length,
    });
  } catch (error) {
    console.error("Error calculating cart totals:", error);
    // Don't throw - allow operation to continue
  }
}

