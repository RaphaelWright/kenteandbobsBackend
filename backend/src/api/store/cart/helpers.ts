/**
 * Shared helper functions for cart endpoints
 */

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

  return {
    id: cart.id,
    customer_id: cart.customer_id,
    email: cart.email,
    currency_code: cart.currency_code,
    region_id: cart.region_id,
    items: cart.items?.map((item: any) => {
      const productInfo = productsMap[item.variant_id] || {};
      return {
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        thumbnail: item.thumbnail,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.total,
        product_id: item.product_id,
        variant_id: item.variant_id,
        product: productInfo.product || null,
        variant: productInfo.variant || null,
      };
    }) || [],
    subtotal: cart.subtotal || 0,
    tax_total: cart.tax_total || 0,
    shipping_total: cart.shipping_total || 0,
    discount_total: cart.discount_total || 0,
    total: cart.total || 0,
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
 */
export async function getCustomerFromAuth(
  authContext: any,
  customerModuleService: any
): Promise<{ id: string; email: string } | null> {
  if (!authContext?.auth_identity_id) {
    return null;
  }

  const customerEmail = authContext.actor_id;
  if (!customerEmail) {
    return null;
  }

  const customers = await customerModuleService.listCustomers({
    email: customerEmail,
  });

  if (!customers || customers.length === 0) {
    return null;
  }

  return {
    id: customers[0].id,
    email: customers[0].email,
  };
}

