# Paystack Authentication Fix Summary

## Issue
Payment initialization was failing with authentication errors:
1. First error: `"Customer not found" - "Unable to find customer profile"`
2. Second error: `"Invalid authentication" - "Unable to determine customer email from authentication context"`

## Root Cause
The Paystack initialization endpoint was using an incorrect method to retrieve the customer email from the authentication context. It was trying to use `authContext.actor_id` which was not properly populated in Medusa v2.

## Fix Applied
Updated `backend/src/api/store/payments/paystack/initialize/route.ts` to:

1. **Properly retrieve auth identity**: Now uses `authModuleService.retrieveAuthIdentity()` to get the full auth identity object
2. **Get email from correct field**: Uses `authIdentity.entity_id` instead of `authContext.actor_id`
3. **Auto-create customer records**: If a customer record doesn't exist, it's automatically created using the authenticated user's email
4. **Better error handling**: Added detailed logging to help diagnose future authentication issues

## Changes Made

### Before
```typescript
const customer = await getCustomerFromAuth(authContext, customerModuleService);
if (!customer) {
  return res.status(400).json({
    error: "Customer not found",
    message: "Unable to find customer profile",
  });
}
```

### After
```typescript
const authModuleService: IAuthModuleService = req.scope.resolve(Modules.AUTH);

// Retrieve auth identity to get customer email properly
const authIdentity = await authModuleService.retrieveAuthIdentity(
  authContext.auth_identity_id
) as any;

const customerEmail = authIdentity.entity_id;

// Try to find existing customer by email
let customer;
const customers = await customerModuleService.listCustomers({
  email: customerEmail,
});

if (customers && customers.length > 0) {
  customer = customers[0];
} else {
  // Auto-create customer record if doesn't exist
  customer = await customerModuleService.createCustomers({
    email: customerEmail,
  });
  console.log("Created customer record for authenticated user:", customer.email);
}
```

## Testing
To test the fix:

1. **Restart your backend server**:
```bash
cd backend
npm run dev
# or
pnpm dev
```

2. **Try the payment initialization again**:
```bash
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=your_session_cookie" \
  -d '{
    "callback_url": "http://localhost:3000/checkout/verify",
    "channels": ["card", "mobile_money", "bank"]
  }'
```

3. **Check backend logs** for these messages:
   - `Retrieved customer email from auth identity: user@example.com`
   - `Created customer record for authenticated user: user@example.com` (if new customer)

## Expected Behavior
✅ Payment initialization should now succeed with a valid `authorization_url` from Paystack
✅ Customer records are automatically created if they don't exist
✅ Detailed logging helps diagnose any authentication issues

## Files Modified
- `backend/src/api/store/payments/paystack/initialize/route.ts` - Fixed customer retrieval and authentication
- `backend/PAYSTACK_INTEGRATION.md` - Updated troubleshooting section

---

**Date:** December 5, 2025  
**Status:** ✅ Fixed and Ready for Testing

