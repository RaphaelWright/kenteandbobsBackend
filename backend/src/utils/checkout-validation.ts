/**
 * Checkout validation utilities
 * Used to validate delivery and payment data from frontend
 */

export interface DeliveryData {
  deliveryOption: "pickup" | "delivery";
  country?: string;
  streetAddress?: string;
  apartment?: string;
  city?: string;
  region?: string;
  phone?: string;
  additionalPhone?: string;
  email?: string;
  postalCode?: string;
}

export interface PaymentData {
  paymentMethod: "card" | "mobile_money";
  cardNumber?: string;
  cardExpiry?: string;
  cardCvv?: string;
  mobileNumber?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Ghana phone number
 * Format: +233XXXXXXXXX or 0XXXXXXXXX
 * Where X is a digit from 2-5 for the first digit after country code, then 8 more digits
 */
export function validateGhanaPhone(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^(\+233|0)[2-5][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate delivery data from frontend
 */
export function validateDeliveryData(delivery: DeliveryData): ValidationResult {
  if (!delivery) {
    return { valid: false, error: "Delivery data is required" };
  }

  if (!delivery.deliveryOption) {
    return { valid: false, error: "Delivery option is required" };
  }

  // For pickup, no additional validation needed
  if (delivery.deliveryOption === "pickup") {
    return { valid: true };
  }

  // For delivery, validate all required fields
  const requiredFields: (keyof DeliveryData)[] = [
    "country",
    "streetAddress",
    "city",
    "region",
    "phone",
    "additionalPhone",
    "email",
  ];

  for (const field of requiredFields) {
    if (!delivery[field]) {
      return {
        valid: false,
        error: `Missing required field for delivery: ${field}`,
      };
    }
  }

  // Validate primary phone number
  if (delivery.phone && !validateGhanaPhone(delivery.phone)) {
    return {
      valid: false,
      error: "Invalid Ghana phone number. Format: +233XXXXXXXXX or 0XXXXXXXXX",
    };
  }

  // Validate additional phone number
  if (delivery.additionalPhone && !validateGhanaPhone(delivery.additionalPhone)) {
    return {
      valid: false,
      error: "Invalid additional Ghana phone number. Format: +233XXXXXXXXX or 0XXXXXXXXX",
    };
  }

  // Validate email
  if (delivery.email && !validateEmail(delivery.email)) {
    return {
      valid: false,
      error: "Invalid email address",
    };
  }

  return { valid: true };
}

/**
 * Validate payment data from frontend
 */
export function validatePaymentData(payment: PaymentData): ValidationResult {
  if (!payment) {
    return { valid: false, error: "Payment data is required" };
  }

  if (!payment.paymentMethod) {
    return {
      valid: false,
      error: "Payment method is required",
    };
  }

  // Validate card payment
  if (payment.paymentMethod === "card") {
    // Note: In production, you would validate:
    // - Card number format (Luhn algorithm)
    // - Expiry date (MM/YY format and not expired)
    // - CVV (3-4 digits)
    // For now, we just check they exist if provided
    if (payment.cardNumber || payment.cardExpiry || payment.cardCvv) {
      if (!payment.cardNumber) {
        return { valid: false, error: "Card number is required" };
      }
      if (!payment.cardExpiry) {
        return { valid: false, error: "Card expiry is required" };
      }
      if (!payment.cardCvv) {
        return { valid: false, error: "Card CVV is required" };
      }
    }
  }

  // Validate mobile money payment
  if (payment.paymentMethod === "mobile_money") {
    if (payment.mobileNumber && !validateGhanaPhone(payment.mobileNumber)) {
      return {
        valid: false,
        error: "Invalid mobile money number. Must be a valid Ghana phone number",
      };
    }
  }

  return { valid: true };
}

/**
 * Convert frontend delivery data to Medusa address format
 */
export function convertDeliveryToAddress(delivery: DeliveryData) {
  if (delivery.deliveryOption === "pickup") {
    // For pickup, return a store/pickup address
    return {
      first_name: "Store",
      last_name: "Pickup",
      address_1: "Store Location - Customer Pickup",
      city: "Accra",
      country_code: "gh",
      phone: delivery.phone || "",
      metadata: {
        delivery_option: "pickup",
      },
    };
  }

  // For delivery, convert to address format
  const nameParts = delivery.email?.split("@")[0].split(".") || ["Customer"];
  const firstName = nameParts[0] || "Customer";
  const lastName = nameParts[1] || "";

  return {
    first_name: firstName,
    last_name: lastName,
    address_1: delivery.streetAddress || "",
    address_2: delivery.apartment || "",
    city: delivery.city || "",
    province: delivery.region || "",
    postal_code: delivery.postalCode || "",
    country_code: delivery.country?.toLowerCase() || "gh",
    phone: delivery.phone || "",
    metadata: {
      additional_phone: delivery.additionalPhone || "",
      delivery_option: delivery.deliveryOption,
    },
  };
}

/**
 * Validate card number using Luhn algorithm
 * (Optional - for future use)
 */
export function validateCardNumber(cardNumber: string): boolean {
  if (!cardNumber) return false;
  
  // Remove spaces and non-digits
  const cleaned = cardNumber.replace(/\D/g, "");
  
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Validate card expiry date
 * (Optional - for future use)
 */
export function validateCardExpiry(expiry: string): boolean {
  if (!expiry) return false;
  
  // Expected format: MM/YY or MM/YYYY
  const parts = expiry.split("/");
  if (parts.length !== 2) return false;
  
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10);
  
  if (month < 1 || month > 12) return false;
  
  // Convert 2-digit year to 4-digit
  const fullYear = year < 100 ? 2000 + year : year;
  
  // Check if card is expired
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (fullYear < currentYear) return false;
  if (fullYear === currentYear && month < currentMonth) return false;
  
  return true;
}

