# Order Completion Email Notifications

## Overview

Order completion emails are automatically sent to customers when their order is successfully created. This happens in **both** order completion flows.

## When Emails Are Sent

Emails are sent automatically after order creation in:

1. **Payment Verification Flow** (`/store/payments/paystack/verify`)
   - After payment is verified with Paystack
   - After order is created from cart
   - Email sent before response is returned

2. **Cart Complete Flow** (`/store/cart/complete`)
   - After cart is completed
   - After order is created
   - Email sent before response is returned

## Email Template

The order confirmation email includes:

- **Order Summary**
  - Order ID
  - Order Date
  - Total Amount

- **Shipping Address**
  - Full delivery address from order

- **Order Items**
  - Item name
  - Quantity
  - Price per item

**Template File**: `backend/src/modules/email-notifications/templates/order-placed.tsx`

## Implementation Details

### Email Utility Function

Located in `backend/src/utils/email.ts`:

```typescript
await sendOrderCompletionEmail(notificationModuleService, order);
```

This function:
- Validates order has required data (email, shipping address)
- Falls back to metadata if shipping address is not populated
- Logs errors but doesn't throw (email failure shouldn't break order)
- Uses Resend email service

### Integration Points

**1. Payment Verification (`/store/payments/paystack/verify`):**

```typescript
// After order creation
const completeOrder = orders[0];

// Send order completion email
try {
  const notificationModuleService: INotificationModuleService = 
    req.scope.resolve(Modules.NOTIFICATION);
  await sendOrderCompletionEmail(notificationModuleService, completeOrder);
} catch (emailError) {
  console.error("❌ Failed to send order completion email (non-fatal):", emailError);
  // Don't fail the order if email fails
}
```

**2. Cart Complete (`/store/cart/complete`):**

```typescript
// After order creation
if (!order) {
  throw new Error("Failed to create order - no order returned");
}

// Send order completion email
try {
  const notificationModuleService: INotificationModuleService = 
    req.scope.resolve(Modules.NOTIFICATION);
  await sendOrderCompletionEmail(notificationModuleService, order);
} catch (emailError) {
  console.error("❌ Failed to send order completion email (non-fatal):", emailError);
  // Don't fail the order if email fails
}
```

## Error Handling

Email sending is **non-fatal**:
- If email fails, the error is logged but the order is still completed
- Customer still receives order confirmation in the API response
- Admin can manually resend confirmation if needed

Common scenarios:
- Resend API key not configured → Logged, order proceeds
- Email address invalid → Logged, order proceeds
- Network error → Logged, order proceeds
- Missing shipping address → Warning logged, email skipped

## Configuration

Requires Resend to be configured:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

See [PASSWORD_RESET_SETUP.md](./PASSWORD_RESET_SETUP.md) for Resend setup instructions.

## Testing

### Test Order Completion Email

1. **Via Payment Verification:**
   ```bash
   # Complete a payment and verify
   curl http://localhost:9000/store/payments/paystack/verify?reference=xxx
   ```

2. **Via Cart Complete:**
   ```bash
   curl -X POST http://localhost:9000/store/cart/complete \
     -H "Content-Type: application/json" \
     -d '{"cart_id": "cart_123", ...}'
   ```

3. **Check Console Logs:**
   ```
   📧 Preparing order completion email for order ORD-123
   ✅ Order completion email sent to customer@example.com for order ORD-123
   ```

4. **Check Email:**
   - In production: Check customer's inbox
   - In development: Check Resend dashboard for delivery status

### Preview Email Template

```bash
cd backend
pnpm email:dev
```

Opens preview at `http://localhost:3002` - navigate to the "Order Placed" template.

## Customizing the Email

To customize the order confirmation email:

1. Edit `backend/src/modules/email-notifications/templates/order-placed.tsx`
2. Use React Email components
3. Preview changes with `pnpm email:dev`
4. Restart server to apply changes

Example customizations:
- Add company logo
- Change colors/styling
- Add tracking information
- Include customer support contact
- Add social media links

## Troubleshooting

**Email not sent:**
- Check console for error messages
- Verify Resend API key is configured
- Check Resend dashboard for delivery status
- Verify customer email is valid

**Email template errors:**
- Check that order has all required fields
- Verify shipping address is populated
- Check template syntax is valid React/JSX

**Delivery issues:**
- Check spam folder
- Verify sender domain is verified in Resend
- Check Resend account status and credits

## Production Checklist

Before going live:

- [ ] Verify Resend API key is configured
- [ ] Verify sender domain in Resend dashboard
- [ ] Test order completion flow end-to-end
- [ ] Check emails arrive in inbox (not spam)
- [ ] Verify email content displays correctly
- [ ] Test with various email providers (Gmail, Outlook, etc.)
- [ ] Set up email delivery monitoring in Resend dashboard

## Future Enhancements

Potential improvements:
- Add order tracking link
- Include estimated delivery date
- Add "View Order" button linking to customer portal
- Send shipping confirmation when order is fulfilled
- Send delivery confirmation when order is delivered
- Add order status update emails

## Related Documentation

- [PASSWORD_RESET_SETUP.md](./PASSWORD_RESET_SETUP.md) - Resend configuration
- [ORDER_COMPLETION_FLOWS.md](./ORDER_COMPLETION_FLOWS.md) - How orders are created
- Email template docs: `src/modules/email-notifications/README.md`

