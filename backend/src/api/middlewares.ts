import { authenticate as medusaAuthenticate } from "@medusajs/framework/http";
import { defineMiddlewares } from "@medusajs/medusa";

/**
 * Authentication middleware to protect routes
 * Checks if the user is authenticated via session
 */
export const authenticate = async (req, res, next) => {
  try {
    // Check if session exists
    if (!req.session) {
      console.warn("[Auth Middleware] No session found");
      return res.status(401).json({
        error: "Unauthorized - No session found",
        message: "Please login to access this resource"
      });
    }

    const authContext = req.session.auth_context;

    // Check if auth context exists and has required fields
    if (!authContext || !authContext.auth_identity_id) {
      console.warn("[Auth Middleware] No auth context or auth_identity_id in session");
      return res.status(401).json({
        error: "Unauthorized - Authentication required",
        message: "Please login to access this resource"
      });
    }

    console.log("[Auth Middleware] ✅ User authenticated:", {
      auth_identity_id: authContext.auth_identity_id,
      actor_id: authContext.actor_id,
      actor_type: authContext.actor_type
    });

    // Attach auth context to request for easy access
    req.auth = authContext;
    next();
  } catch (error) {
    console.error("[Auth Middleware] Error:", error);
    return res.status(500).json({
      error: "Authentication error",
      message: error.message
    });
  }
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
      matcher: "/store/customers/me",
      middlewares: [optionalAuthenticate]  // Use optional to not block, let route handle auth
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

