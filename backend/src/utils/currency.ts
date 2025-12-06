/**
 * Currency Conversion Utilities
 * 
 * Convention:
 * - Database and Medusa store all prices in PESEWAS (smallest currency unit)
 * - Admin panel displays prices in GHANA CEDIS for user convenience
 * - Frontend displays prices in GHANA CEDIS for customers
 * - Payment gateways (Paystack) receive prices in PESEWAS
 * 
 * Examples:
 * - GH₵ 1.30 = 130 pesewas (stored in database)
 * - GH₵ 99.99 = 9999 pesewas (stored in database)
 */

/**
 * Convert Ghana Cedis to Pesewas
 * @param cedis Amount in Ghana Cedis (e.g., 1.30)
 * @returns Amount in Pesewas (e.g., 130)
 */
export function cedisToPesewas(cedis: number): number {
  if (typeof cedis !== 'number' || isNaN(cedis)) {
    throw new Error(`Invalid cedis amount: ${cedis}. Must be a valid number.`);
  }
  
  if (cedis < 0) {
    throw new Error(`Invalid cedis amount: ${cedis}. Amount cannot be negative.`);
  }
  
  // Multiply by 100 and round to avoid floating point issues
  return Math.round(cedis * 100);
}

/**
 * Convert Pesewas to Ghana Cedis
 * @param pesewas Amount in Pesewas (e.g., 130)
 * @returns Amount in Ghana Cedis (e.g., 1.30)
 */
export function pesewasToCedis(pesewas: number): number {
  if (typeof pesewas !== 'number' || isNaN(pesewas)) {
    throw new Error(`Invalid pesewas amount: ${pesewas}. Must be a valid number.`);
  }
  
  if (pesewas < 0) {
    throw new Error(`Invalid pesewas amount: ${pesewas}. Amount cannot be negative.`);
  }
  
  // Divide by 100
  return pesewas / 100;
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
  return typeof amount === 'number' && 
         !isNaN(amount) && 
         Number.isInteger(amount) && 
         amount >= 0;
}

/**
 * Convert amount from any currency to pesewas based on currency code
 * @param amount Amount in the currency's major unit
 * @param currencyCode Currency code (e.g., "ghs", "usd", "eur")
 * @returns Amount in smallest currency unit (pesewas, cents, etc.)
 */
export function toSmallestCurrencyUnit(amount: number, currencyCode: string): number {
  const code = currencyCode.toLowerCase();
  
  // Ghana Cedis -> Pesewas
  if (code === 'ghs') {
    return cedisToPesewas(amount);
  }
  
  // USD -> Cents
  if (code === 'usd') {
    return Math.round(amount * 100);
  }
  
  // EUR -> Cents
  if (code === 'eur') {
    return Math.round(amount * 100);
  }
  
  // Default: assume 100 subunits per unit (covers most currencies)
  return Math.round(amount * 100);
}

/**
 * Convert amount from smallest currency unit to major unit
 * @param amount Amount in smallest currency unit (pesewas, cents, etc.)
 * @param currencyCode Currency code (e.g., "ghs", "usd", "eur")
 * @returns Amount in major currency unit (cedis, dollars, euros)
 */
export function fromSmallestCurrencyUnit(amount: number, currencyCode: string): number {
  const code = currencyCode.toLowerCase();
  
  // Pesewas -> Ghana Cedis
  if (code === 'ghs') {
    return pesewasToCedis(amount);
  }
  
  // Cents -> USD
  if (code === 'usd') {
    return amount / 100;
  }
  
  // Cents -> EUR
  if (code === 'eur') {
    return amount / 100;
  }
  
  // Default: assume 100 subunits per unit (covers most currencies)
  return amount / 100;
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
  /** Amount in smallest currency unit (pesewas, cents, etc.) - raw database value */
  amount: number;
  /** Amount in major currency unit (cedis, dollars, etc.) - for display */
  display_amount: number;
  /** Formatted string with currency symbol (e.g., "GH₵ 1.30") */
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
 * @param amount Amount in smallest currency unit (from database)
 * @param currencyCode Currency code
 * @returns Enriched price object with display values
 */
export function enrichPrice(amount: number, currencyCode: string = 'ghs'): PriceResponse {
  const display_amount = fromSmallestCurrencyUnit(amount, currencyCode);
  const formatted = formatSmallestCurrencyUnit(amount, currencyCode, true);
  
  return {
    amount,
    display_amount,
    formatted,
    currency_code: currencyCode.toLowerCase(),
  };
}
