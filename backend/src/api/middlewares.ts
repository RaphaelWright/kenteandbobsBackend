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

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/auth/me",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/customers/me",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/protected/*",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/orders*",
      middlewares: [authenticate]
    },
    {
      matcher: "/store/cart/complete",
      middlewares: [authenticate]
    }
  ]
});

