import { defineMiddlewares } from "@medusajs/medusa";

/**
 * Authentication middleware to protect routes
 * Checks if the user is authenticated via session
 */
export const authenticate = async (req, res, next) => {
  const authContext = req.session?.auth_context;

  if (!authContext || !authContext.auth_identity_id) {
    return res.status(401).json({
      error: "Unauthorized - Authentication required"
    });
  }

  // Attach auth context to request for easy access
  req.auth = authContext;
  next();
};

/**
 * Optional authentication middleware
 * Allows the request to proceed even if not authenticated
 * but attaches auth context if available
 */
export const optionalAuthenticate = async (req, res, next) => {
  const authContext = req.session?.auth_context;
  
  if (authContext && authContext.auth_identity_id) {
    req.auth = authContext;
  }
  
  next();
};

/**
 * Pricing context middleware
 * Sets the currency_code for price calculations
 */
export const setPricingContext = async (req, res, next) => {
  // Get currency_code from query params or default to GHS
  const currency_code = (req.query?.currency_code as string) || "ghs";
  
  // Set pricing context that Medusa can use
  req.pricingContext = {
    currency_code: currency_code.toLowerCase(),
  };
  
  next();
};

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/auth/me",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/protected/*",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/products*",
      middlewares: [setPricingContext]
    }
  ]
});

