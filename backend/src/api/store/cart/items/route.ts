import { MedusaRequest, MedusaResponse } from "@medusajs/framework";
import { ICartModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /store/cart/items
 * Add item to cart
 * Supports both authenticated and guest users
 */
export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const cartModuleService: ICartModuleService = req.scope.resolve(Modules.CART);
    const query = req.scope.resolve("query");

    const { variant_id, quantity = 1, cart_id } = req.body as { variant_id?: string; quantity?: number; cart_id?: string };

    // Validation
    if (!variant_id) {
      return res.status(400).json({
        error: "Bad Request",
        message: "variant_id is required",
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        error: "Bad Request",
        message: "quantity must be greater than 0",
      });
    }

    // Get cart_id from request body, query params, or session
    const targetCartId = cart_id || req.query.cart_id || req.session?.cart_id;

    if (!targetCartId) {
      return res.status(400).json({
        error: "Bad Request",
        message: "cart_id is required. Please create a cart first.",
      });
    }

    // Verify cart exists
    let cart;
    try {
      cart = await cartModuleService.retrieveCart(targetCartId);
    } catch (error) {
      return res.status(404).json({
        error: "Cart not found",
        message: "The specified cart does not exist",
      });
    }

    // Check if item already exists in cart
    const existingItem = cart.items?.find(
      (item: any) => item.variant_id === variant_id
    );

    if (existingItem) {
      // Update quantity if item exists
      const newQuantity = existingItem.quantity + quantity;
      await cartModuleService.updateLineItems([
        {
          id: existingItem.id,
          quantity: newQuantity,
        },
      ]);

      // Fetch updated cart with details
      const refreshedCart = await cartModuleService.retrieveCart(targetCartId, {
        relations: ["items", "items.variant", "items.product", "customer", "region"],
      });

      const formattedCart = await formatCartResponse(refreshedCart, query);

      return res.json({
        message: "Item quantity updated in cart",
        cart: formattedCart,
      });
    }

    // Fetch variant details to get title and unit_price for adding to cart
    // Query through product to get variant details
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "variants.id",
        "variants.title",
        "variants.prices.*",
      ],
      filters: {
        variants: {
          id: variant_id,
        },
      },
    });

    let variant: any = null;
    let price: any = null;
    
    // Find the variant from products
    if (products && products.length > 0) {
      for (const product of products) {
        variant = product.variants?.find((v: any) => v.id === variant_id);
        if (variant) {
          price = variant.prices?.[0];
          break;
        }
      }
    }

    if (!variant) {
      return res.status(404).json({
        error: "Variant not found",
        message: "The specified variant does not exist",
      });
    }
    
    if (!price) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Variant does not have a price",
      });
    }

    // Get product title for the cart item
    const product = products?.find((p: any) => p.variants?.some((v: any) => v.id === variant_id));
    const productTitle = product?.title || variant.title || "Product";

    // Add new item to cart
    await cartModuleService.addLineItems(targetCartId, [
      {
        variant_id,
        quantity,
        title: productTitle,
        unit_price: price.amount,
      },
    ]);

    // Fetch updated cart with details
    const updatedCart = await cartModuleService.retrieveCart(targetCartId, {
      relations: ["items", "items.variant", "items.product", "customer", "region"],
    });

    const formattedCart = await formatCartResponse(updatedCart, query);

    res.status(201).json({
      message: "Item added to cart successfully",
      cart: formattedCart,
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    res.status(500).json({
      error: "Failed to add item to cart",
      message: error.message,
    });
  }
}

/**
 * Helper function to format cart response with product details
 */
async function formatCartResponse(cart: any, query: any) {
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
    created_at: cart.created_at,
    updated_at: cart.updated_at,
  };
}

