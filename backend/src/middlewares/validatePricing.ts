/**
 * Middleware to validate and ensure pricing consistency
 * Ensures all prices in requests are valid numbers in cedis
 */

import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework";
import { toSmallestCurrencyUnit } from "../utils/currency";

interface PriceData {
  amount?: number;
  currency_code?: string;
  prices?: Array<{
    amount?: number;
    currency_code?: string;
  }>;
}

/**
 * Middleware to validate product/variant pricing in requests
 * Ensures all price amounts are valid numbers in cedis
 */
export function validatePricing() {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    try {
      // Only validate POST, PUT, PATCH requests that might contain price data
      if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
        return next();
      }

      const body = req.body as any;

      // Check if this is a product/variant creation or update
      if (body.products || body.product || body.variants || body.variant || body.prices) {
        validatePriceData(body);
      }

      next();
    } catch (error) {
      console.error("Pricing validation error:", error);
      res.status(400).json({
        error: "Invalid pricing data",
        message: error.message,
      });
    }
  };
}

/**
 * Recursively validate price data in request body
 * Prices should be valid numbers in cedis (can be decimal like 2400 or 1.30)
 */
function validatePriceData(data: any, path: string = "body"): void {
  if (!data || typeof data !== 'object') {
    return;
  }

  // If this object has an amount field, validate it
  if ('amount' in data) {
    // Check if amount is a valid number
    if (typeof data.amount !== 'number' || isNaN(data.amount) || !isFinite(data.amount)) {
      throw new Error(
        `Invalid price amount at ${path}.amount: ${data.amount}. ` +
        `Prices must be valid numbers in cedis. Example: GH₵ 2,400.00 should be 2400`
      );
    }

    // Check if amount is non-negative
    if (data.amount < 0) {
      throw new Error(
        `Invalid price amount at ${path}.amount: ${data.amount}. ` +
        `Prices cannot be negative.`
      );
    }

    // Sanity check: warn about unusually high prices
    const currencyCode = (data.currency_code || 'ghs').toLowerCase();
    if (currencyCode === 'ghs' && data.amount > 1000000) {
      console.warn(
        `⚠️ Unusually high GHS price at ${path}.amount: GH₵ ${data.amount.toLocaleString()}. ` +
        `Please verify this is correct.`
      );
    }
  }

  // Check prices array
  if (Array.isArray(data.prices)) {
    data.prices.forEach((price: any, index: number) => {
      validatePriceData(price, `${path}.prices[${index}]`);
    });
  }

  // Check variants array (in product creation)
  if (Array.isArray(data.variants)) {
    data.variants.forEach((variant: any, index: number) => {
      validatePriceData(variant, `${path}.variants[${index}]`);
    });
  }

  // Check products array (in bulk operations)
  if (Array.isArray(data.products)) {
    data.products.forEach((product: any, index: number) => {
      validatePriceData(product, `${path}.products[${index}]`);
    });
  }

  // Recursively check nested objects
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === 'object' && data[key] !== null) {
      // Avoid infinite recursion by checking for circular references
      if (key !== 'parent' && key !== 'metadata') {
        validatePriceData(data[key], `${path}.${key}`);
      }
    }
  }
}

/**
 * Helper middleware to convert prices from cedis to pesewas in request body
 * 
 * DEPRECATED: This middleware is no longer needed as prices are now stored in cedis.
 * Kept for backward compatibility but effectively does nothing.
 * 
 * Prices should be submitted in cedis (e.g., 2400 for GH₵ 2,400.00).
 * Conversion to pesewas only happens at payment processing time.
 */
export function convertCedisToPesewas() {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction
  ) => {
    // No conversion needed - prices are stored in cedis
    // This middleware is kept for backward compatibility only
    next();
  };
}

/**
 * Auto-detect if prices are likely in cedis (for admin panel convenience)
 * Returns true if any price appears to be in cedis format
 */
function shouldAutoConvert(data: any): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check if this object has an amount field that looks like cedis
  if ('amount' in data && typeof data.amount === 'number') {
    const currencyCode = (data.currency_code || 'ghs').toLowerCase();
    
    // For GHS: if amount < 1000 and not 0, likely in cedis
    // (Most products cost more than GH₵ 1.00 = 100 pesewas)
    if (currencyCode === 'ghs') {
      if (data.amount > 0 && data.amount < 1000) {
        return true;
      }
    }
    
    // If amount has decimal places, it's definitely in major currency unit
    if (data.amount % 1 !== 0) {
      return true;
    }
  }

  // Check prices array
  if (Array.isArray(data.prices)) {
    for (const price of data.prices) {
      if (shouldAutoConvert(price)) {
        return true;
      }
    }
  }

  // Check variants array
  if (Array.isArray(data.variants)) {
    for (const variant of data.variants) {
      if (shouldAutoConvert(variant)) {
        return true;
      }
    }
  }

  // Check products array
  if (Array.isArray(data.products)) {
    for (const product of data.products) {
      if (shouldAutoConvert(product)) {
        return true;
      }
    }
  }

  // Recursively check nested objects
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === 'object' && data[key] !== null) {
      if (key !== 'parent' && key !== 'metadata' && key !== '_pricesInCedis') {
        if (shouldAutoConvert(data[key])) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Recursively convert price amounts from cedis to pesewas
 * @param data - The data object to convert
 * @param forceConvert - If true, convert all prices regardless of detection. If false, only convert detected cedis.
 */
function convertPriceData(data: any, forceConvert: boolean = false): void {
  if (!data || typeof data !== 'object') {
    return;
  }

  // If this object has an amount field, convert it
  if ('amount' in data && typeof data.amount === 'number') {
    const currencyCode = (data.currency_code || 'ghs').toLowerCase();
    
    // Determine if this price should be converted
    let shouldConvert = forceConvert;
    
    if (!shouldConvert) {
      // Auto-detect: convert if it looks like cedis
      if (currencyCode === 'ghs') {
        // GHS prices < 1000 are likely in cedis
        shouldConvert = data.amount > 0 && data.amount < 1000;
      }
      // If amount has decimal places, it's definitely in major currency unit
      if (data.amount % 1 !== 0) {
        shouldConvert = true;
      }
    }
    
    if (shouldConvert) {
      const oldAmount = data.amount;
      const converted = toSmallestCurrencyUnit(data.amount, currencyCode);
      // Ensure we store an integer (round to handle any floating point issues)
      data.amount = Math.round(converted);
      
      // Log conversion for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `💰 Auto-converted price: ${oldAmount} ${currencyCode.toUpperCase()} → ${data.amount} (${currencyCode === 'ghs' ? 'pesewas' : 'cents'})`
        );
      }
    }
  }

  // Convert prices array
  if (Array.isArray(data.prices)) {
    data.prices.forEach((price: any) => {
      convertPriceData(price, forceConvert);
    });
  }

  // Convert variants array
  if (Array.isArray(data.variants)) {
    data.variants.forEach((variant: any) => {
      convertPriceData(variant, forceConvert);
    });
  }

  // Convert products array
  if (Array.isArray(data.products)) {
    data.products.forEach((product: any) => {
      convertPriceData(product, forceConvert);
    });
  }

  // Recursively convert nested objects
  for (const key in data) {
    if (data.hasOwnProperty(key) && typeof data[key] === 'object' && data[key] !== null) {
      if (key !== 'parent' && key !== 'metadata' && key !== '_pricesInCedis') {
        convertPriceData(data[key], forceConvert);
      }
    }
  }
}
