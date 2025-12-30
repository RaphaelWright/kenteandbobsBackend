/**
 * Currency Conversion Utilities
 * 
 * Convention:
 * - Database stores all prices in GHANA CEDIS (e.g., 2400 = GH₵ 2,400.00)
 * - API responses return prices in GHANA CEDIS
 * - Payment gateways (Paystack) receive prices in PESEWAS (converted at payment time)
 * 
 * Examples:
 * - GH₵ 1.30 = 1.30 (stored in database)
 * - GH₵ 2,400.00 = 2400 (stored in database)
 * - When processing payment: 2400 cedis → 240000 pesewas (sent to Paystack)
 */

/**
 * Convert Ghana Cedis to Pesewas
 * @param cedis Amount in Ghana Cedis (e.g., 1.30)
 * @returns Amount in Pesewas (e.g., 130) - always an integer
 */
export function cedisToPesewas(cedis: number): number {
  // Convert to number if needed (handles string numbers and floating point precision)
  const amount = typeof cedis === 'string' ? parseFloat(cedis as any) : cedis;
  
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    throw new Error(`Invalid cedis amount: ${cedis}. Must be a valid number.`);
  }
  
  if (amount < 0) {
    throw new Error(`Invalid cedis amount: ${cedis}. Amount cannot be negative.`);
  }
  
  // Multiply by 100 and round to avoid floating point issues
  // Ensure we always return a proper integer
  return Math.round(amount * 100);
}

/**
 * Convert Pesewas to Ghana Cedis
 * @param pesewas Amount in Pesewas (e.g., 130)
 * @returns Amount in Ghana Cedis (e.g., 1.30)
 */
export function pesewasToCedis(pesewas: number): number {
  // Convert to number if needed (handles string numbers and floating point precision)
  const amount = typeof pesewas === 'string' ? parseFloat(pesewas as any) : pesewas;
  
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    throw new Error(`Invalid pesewas amount: ${pesewas}. Must be a valid number.`);
  }
  
  if (amount < 0) {
    throw new Error(`Invalid pesewas amount: ${pesewas}. Amount cannot be negative.`);
  }
  
  // Divide by 100
  return amount / 100;
}

/**
 * Format Pesewas as Ghana Cedis string with currency symbol
 * @param pesewas Amount in Pesewas (e.g., 130)
 * @param includeCurrency Whether to include the GH₵ symbol (default: true)
 * @returns Formatted string (e.g., "GH₵ 1.30" or "1.30")
 */
export function formatPesewasAsCedis(pesewas: number, includeCurrency: boolean = true): string {
  const cedis = pesewasToCedis(pesewas);
  const formatted = cedis.toFixed(2);
  return includeCurrency ? `GH₵ ${formatted}` : formatted;
}

/**
 * Format Cedis as string with currency symbol
 * @param cedis Amount in Ghana Cedis (e.g., 1.30)
 * @param includeCurrency Whether to include the GH₵ symbol (default: true)
 * @returns Formatted string (e.g., "GH₵ 1.30" or "1.30")
 */
export function formatCedis(cedis: number, includeCurrency: boolean = true): string {
  const formatted = cedis.toFixed(2);
  return includeCurrency ? `GH₵ ${formatted}` : formatted;
}

/**
 * Validate that a price is in pesewas (whole number)
 * @param amount Amount to validate
 * @returns True if valid pesewas amount, false otherwise
 */
export function isValidPesewasAmount(amount: number): boolean {
  if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
    return false;
  }
  
  // Check if amount is effectively an integer (handles floating point precision issues)
  // Round to handle cases like 4000.0000000000000000
  const rounded = Math.round(amount);
  return Math.abs(amount - rounded) < 0.0001; // Allow tiny floating point errors
}

/**
 * Convert amount from any currency to pesewas based on currency code
 * @param amount Amount in the currency's major unit
 * @param currencyCode Currency code (e.g., "ghs", "usd", "eur")
 * @returns Amount in smallest currency unit (pesewas, cents, etc.)
 */
export function toSmallestCurrencyUnit(amount: number, currencyCode: string): number {
  // Ensure amount is a number (handle decimal precision)
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return 0; // Gracefully handle invalid amounts
  }
  
  // Multiply by 100 and round to get smallest unit (works for all currencies)
  return Math.round(numAmount * 100);
}

/**
 * Convert amount from smallest currency unit to major unit
 * @param amount Amount in smallest currency unit (pesewas, cents, etc.)
 * @param currencyCode Currency code (e.g., "ghs", "usd", "eur")
 * @returns Amount in major currency unit (cedis, dollars, euros)
 */
export function fromSmallestCurrencyUnit(amount: number, currencyCode: string): number {
  // Ensure amount is a number (handle decimal precision from database)
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  
  if (isNaN(numAmount) || !isFinite(numAmount)) {
    return 0; // Gracefully handle invalid amounts
  }
  
  const code = currencyCode.toLowerCase();
  
  // Pesewas -> Ghana Cedis
  if (code === 'ghs') {
    return numAmount / 100;
  }
  
  // Cents -> USD
  if (code === 'usd') {
    return numAmount / 100;
  }
  
  // Cents -> EUR
  if (code === 'eur') {
    return numAmount / 100;
  }
  
  // Default: assume 100 subunits per unit (covers most currencies)
  return numAmount / 100;
}

/**
 * Format amount in smallest currency unit as major unit string
 * @param amount Amount in smallest currency unit
 * @param currencyCode Currency code (e.g., "ghs", "usd", "eur")
 * @param includeCurrency Whether to include currency symbol
 * @returns Formatted string
 */
export function formatSmallestCurrencyUnit(
  amount: number, 
  currencyCode: string, 
  includeCurrency: boolean = true
): string {
  const code = currencyCode.toLowerCase();
  const majorUnit = fromSmallestCurrencyUnit(amount, code);
  const formatted = majorUnit.toFixed(2);
  
  if (!includeCurrency) {
    return formatted;
  }
  
  // Map currency codes to symbols
  const symbols: Record<string, string> = {
    'ghs': 'GH₵',
    'usd': '$',
    'eur': '€',
    'gbp': '£',
  };
  
  const symbol = symbols[code] || code.toUpperCase();
  return `${symbol} ${formatted}`;
}

/**
 * Price data structure for API responses
 */
export interface PriceResponse {
  /** Amount in cedis - raw database value (e.g., 2400 = GH₵ 2,400.00) */
  amount: number;
  /** Amount in cedis - same as amount, for display */
  display_amount: number;
  /** Formatted string with currency symbol (e.g., "GH₵ 2,400.00") */
  formatted: string;
  /** Currency code (e.g., "ghs", "usd") */
  currency_code: string;
}

/**
 * Helper function to process admin price input
 * Automatically converts cedis to pesewas if needed
 * Can be used directly in route handlers if middleware isn't applied
 * 
 * @param priceData - Price object with amount and currency_code
 * @returns Price object with amount in pesewas
 * 
 * @example
 * // In admin route handler
 * const processedPrice = processAdminPriceInput({
 *   amount: 130.00,  // Admin enters in cedis
 *   currency_code: "ghs"
 * });
 * // Returns: { amount: 13000, currency_code: "ghs" }
 */
export function processAdminPriceInput(priceData: {
  amount: number;
  currency_code?: string;
}): { amount: number; currency_code: string } {
  const currencyCode = (priceData.currency_code || 'ghs').toLowerCase();
  
  // Check if conversion is needed
  let amount = priceData.amount;
  
  // If amount has decimal places, it's in major currency unit
  if (amount % 1 !== 0) {
    amount = toSmallestCurrencyUnit(amount, currencyCode);
  } else if (currencyCode === 'ghs' && amount > 0 && amount < 1000) {
    // For GHS, amounts < 1000 are likely in cedis
    amount = toSmallestCurrencyUnit(amount, currencyCode);
  }
  
  return {
    amount,
    currency_code: currencyCode,
  };
}

/**
 * Convert raw price amount to enriched price response
 * @param amount Amount in cedis (from database) - e.g., 2400 means GH₵ 2,400.00
 * @param currencyCode Currency code
 * @returns Enriched price object with display values
 */
export function enrichPrice(amount: number, currencyCode: string = 'ghs'): PriceResponse {
  // Database stores values in cedis, so no conversion needed
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  const display_amount = isNaN(numAmount) || !isFinite(numAmount) ? 0 : numAmount;
  
  // Format the amount with currency symbol
  const formatted = formatCedis(display_amount, true);
  
  return {
    amount: display_amount,
    display_amount,
    formatted,
    currency_code: currencyCode.toLowerCase(),
  };
}
