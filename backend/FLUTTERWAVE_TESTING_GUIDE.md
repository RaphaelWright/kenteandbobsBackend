# Flutterwave Payment Integration - Testing Guide

Complete guide for testing the Flutterwave payment integration in both sandbox and production environments.

---

## Prerequisites

1. **Backend Running**: Ensure your Medusa backend is running on `http://localhost:9000`
2. **Environment Variables Set**: All Flutterwave credentials configured
3. **Database Connection**: Postgres database accessible
4. **Cart Created**: Have an active cart with items

---

## Test Environment Setup

### 1. Get Flutterwave Test Credentials

1. Sign up at [Flutterwave Developer Portal](https://developer.flutterwave.com)
2. Navigate to Settings → API Keys
3. Copy your test credentials:
   - Public Key: `FLWPUBK_TEST-xxxxxxxx`
   - Secret Key: `FLWSECK_TEST-xxxxxxxx`
   - Encryption Key: Optional for this integration

### 2. Configure Backend Environment

```env
# .env file in backend directory
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your-test-key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your-test-secret
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST-optional
FLUTTERWAVE_WEBHOOK_SECRET=your-webhook-secret

# Required supporting variables
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:9000
```

### 3. Restart Backend

```bash
cd backend
npm run dev
# or
pnpm dev
```

---

## Testing Flow

### Step 1: Authentication

First, authenticate a test user:

```bash
# Login
curl -X POST http://localhost:9000/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt

# Response should include session cookie
```

### Step 2: Create Test Cart

```bash
# Create cart with authenticated session
curl -X POST http://localhost:9000/store/cart \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt

# Response will include cart_id
# Example response:
# {
#   "cart": {
#     "id": "cart_01HZABC123",
#     "currency_code": "ghs",
#     "total": 0,
#     "items": []
#   }
# }
```

### Step 3: Add Items to Cart

```bash
# Add product to cart
curl -X POST http://localhost:9000/store/cart/items \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "variant_id": "variant_01HZVAR123",
    "quantity": 2
  }'

# Cart should now have items and a total > 0
```

### Step 4: Initialize Flutterwave Payment

```bash
# Initialize payment
curl -X POST http://localhost:9000/store/payments/flutterwave/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -c cookies.txt \
  -d '{
    "callback_url": "http://localhost:3000/checkout/verify",
    "payment_options": "card,mobilemoneyghana",
    "metadata": {
      "test_mode": true
    }
  }'

# Response:
# {
#   "success": true,
#   "message": "Payment initialized successfully",
#   "data": {
#     "payment_link": "https://checkout.flutterwave.com/v3/hosted/pay/xxxxx",
#     "tx_ref": "FLW-1234567890-abcd1234",
#     "amount": 10000,
#     "currency": "ghs"
#   }
# }
```

**Save the `tx_ref` and `payment_link` for next steps**

### Step 5: Complete Payment (Manual)

1. Open the `payment_link` in a browser
2. Use test card details:

```
Card Number: 5531886652142950
CVV: 564
Expiry Date: 09/32
PIN: 3310
OTP: 12345
```

3. Complete the payment flow
4. You'll be redirected to the callback URL

### Step 6: Verify Payment

After completing payment on Flutterwave's page:

```bash
# Verify payment using tx_ref from step 4
curl -X POST http://localhost:9000/store/payments/flutterwave/verify \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "tx_ref": "FLW-1234567890-abcd1234"
  }'

# Response:
# {
#   "success": true,
#   "message": "Payment verified and order created successfully",
#   "order": {
#     "id": "order_01HZORDER123",
#     "display_id": "1001",
#     "email": "test@example.com",
#     "payment_status": "captured",
#     "total": 100.00,
#     "currency_code": "ghs"
#   },
#   "payment": {
#     "provider": "flutterwave",
#     "reference": "FLW-1234567890-abcd1234",
#     "transaction_id": "1234567",
#     "status": "successful",
#     "amount": 100.00,
#     "currency": "GHS",
#     "payment_type": "card"
#   }
# }
```

### Step 7: Verify Order Created

```bash
# Get the order
curl -X GET http://localhost:9000/admin/orders/{order_id} \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt

# Check order metadata for Flutterwave payment details
```

---

## Test Cards

### Successful Payments

| Card Number | CVV | Expiry | PIN | OTP | Description |
|-------------|-----|--------|-----|-----|-------------|
| 5531886652142950 | 564 | 09/32 | 3310 | 12345 | Successful Mastercard |
| 4187427415564246 | 828 | 09/32 | 3310 | 12345 | Successful Visa |

### Failed Payments

| Card Number | CVV | Expiry | Description |
|-------------|-----|--------|-------------|
| 5531886652142951 | 564 | 09/32 | Declined card |

### Test Mobile Money (Ghana)

```
Network: Vodafone
Phone: 0240000001
Voucher: 000000 (for sandbox)
```

---

## Webhook Testing

### Using ngrok

1. **Install ngrok**:
   ```bash
   # MacOS
   brew install ngrok

   # Or download from https://ngrok.com
   ```

2. **Expose your local backend**:
   ```bash
   ngrok http 9000
   ```

3. **Copy the ngrok URL**:
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:9000
   ```

4. **Configure Flutterwave Webhook**:
   - Go to Flutterwave Dashboard → Settings → Webhooks
   - Set webhook URL: `https://abc123.ngrok.io/store/payments/flutterwave/webhook`
   - Set secret hash (copy to `FLUTTERWAVE_WEBHOOK_SECRET`)
   - Save settings

5. **Test webhook**:
   - Complete a payment
   - Check your backend logs for webhook events
   - Verify order metadata is updated

### Manual Webhook Test

```bash
# Simulate webhook event
curl -X POST http://localhost:9000/store/payments/flutterwave/webhook \
  -H "Content-Type: application/json" \
  -H "verif-hash: your-webhook-secret" \
  -d '{
    "event": "charge.completed",
    "data": {
      "id": 1234567,
      "tx_ref": "FLW-1234567890-abcd1234",
      "flw_ref": "FLW-MOCK-abcd1234",
      "status": "successful",
      "amount": 100,
      "currency": "GHS",
      "customer": {
        "email": "test@example.com",
        "name": "Test User"
      },
      "payment_type": "card",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }'

# Should return:
# {
#   "success": true,
#   "message": "Order payment status updated"
# }
```

---

## Testing Checklist

### Backend Tests

- [ ] Payment initialization with valid cart
- [ ] Payment initialization fails without authentication
- [ ] Payment initialization fails with empty cart
- [ ] Payment verification with valid tx_ref
- [ ] Payment verification with transaction_id
- [ ] Payment verification fails with invalid reference
- [ ] Order created correctly after verification
- [ ] Order metadata contains Flutterwave payment details
- [ ] Webhook receives and validates signature
- [ ] Webhook updates order payment status
- [ ] Webhook handles invalid signature
- [ ] Cart deleted after successful order creation

### Payment Methods Tests

- [ ] Card payment (Visa)
- [ ] Card payment (Mastercard)
- [ ] Mobile Money (MTN)
- [ ] Mobile Money (Vodafone)
- [ ] Bank Transfer
- [ ] USSD
- [ ] Failed card payment
- [ ] Cancelled payment

### Edge Cases

- [ ] Payment with amount mismatch
- [ ] Multiple verification attempts
- [ ] Concurrent payments
- [ ] Payment timeout
- [ ] Network failure during payment
- [ ] Cart modified during payment
- [ ] Invalid webhook signature
- [ ] Duplicate webhook events

---

## Automated Testing Script

Create a test script to automate the flow:

```bash
#!/bin/bash
# test-flutterwave.sh

BASE_URL="http://localhost:9000"
COOKIES="test-cookies.txt"

echo "🧪 Testing Flutterwave Integration"
echo "=================================="

# 1. Login
echo "1. Authenticating..."
curl -s -X POST $BASE_URL/store/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c $COOKIES > /dev/null

if [ $? -eq 0 ]; then
  echo "✅ Authentication successful"
else
  echo "❌ Authentication failed"
  exit 1
fi

# 2. Create Cart
echo "2. Creating cart..."
CART_RESPONSE=$(curl -s -X POST $BASE_URL/store/cart \
  -H "Content-Type: application/json" \
  -b $COOKIES -c $COOKIES)

CART_ID=$(echo $CART_RESPONSE | jq -r '.cart.id')
echo "✅ Cart created: $CART_ID"

# 3. Add Items
echo "3. Adding items to cart..."
curl -s -X POST $BASE_URL/store/cart/items \
  -H "Content-Type: application/json" \
  -b $COOKIES -c $COOKIES \
  -d '{"variant_id":"variant_01HZVAR123","quantity":2}' > /dev/null

echo "✅ Items added"

# 4. Initialize Payment
echo "4. Initializing Flutterwave payment..."
PAYMENT_RESPONSE=$(curl -s -X POST $BASE_URL/store/payments/flutterwave/initialize \
  -H "Content-Type: application/json" \
  -b $COOKIES -c $COOKIES \
  -d '{"payment_options":"card"}')

PAYMENT_LINK=$(echo $PAYMENT_RESPONSE | jq -r '.data.payment_link')
TX_REF=$(echo $PAYMENT_RESPONSE | jq -r '.data.tx_ref')

echo "✅ Payment initialized"
echo "   Payment Link: $PAYMENT_LINK"
echo "   TX Ref: $TX_REF"

echo ""
echo "📝 Next steps:"
echo "1. Open the payment link in a browser"
echo "2. Complete payment with test card"
echo "3. Run verification:"
echo ""
echo "   curl -X POST $BASE_URL/store/payments/flutterwave/verify \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -b $COOKIES \\"
echo "     -d '{\"tx_ref\":\"$TX_REF\"}'"

# Cleanup
rm -f $COOKIES
```

Run the script:

```bash
chmod +x test-flutterwave.sh
./test-flutterwave.sh
```

---

## Monitoring and Debugging

### Backend Logs

Watch backend logs during testing:

```bash
# If using npm/pnpm
tail -f backend/logs/app.log

# Or check console output
```

Look for:
- Payment initialization logs
- Flutterwave API responses
- Cart and order creation
- Webhook events
- Error messages

### Database Queries

Check order and payment data:

```sql
-- View recent orders with Flutterwave payments
SELECT 
  id, 
  display_id, 
  email, 
  total, 
  currency_code,
  metadata->'payment_provider' as provider,
  metadata->'payment_reference' as reference,
  metadata->'payment_status' as status,
  created_at
FROM "order"
WHERE metadata->>'payment_provider' = 'flutterwave'
ORDER BY created_at DESC
LIMIT 10;

-- Check cart status
SELECT id, customer_id, total, metadata
FROM cart
WHERE id = 'cart_01HZABC123';
```

### Flutterwave Dashboard

Monitor payments in Flutterwave dashboard:
1. Login to [dashboard.flutterwave.com](https://dashboard.flutterwave.com)
2. Go to Transactions → All Transactions
3. Filter by test mode
4. Check webhook delivery logs

---

## Common Issues and Solutions

### Issue: Payment initialization fails with 503

**Solution**: Check that `FLUTTERWAVE_SECRET_KEY` is set correctly

```bash
# Verify environment variable
echo $FLUTTERWAVE_SECRET_KEY

# Should output: FLWSECK_TEST-xxxxx
```

### Issue: Amount mismatch error

**Solution**: Ensure cart total is calculated correctly

```bash
# Check cart total
curl http://localhost:9000/store/cart \
  -b cookies.txt

# Total should be in pesewas (smallest unit)
```

### Issue: Webhook not receiving events

**Solutions**:
1. Verify ngrok is running and URL is correct
2. Check webhook secret matches Flutterwave dashboard
3. Ensure webhook URL is publicly accessible
4. Check Flutterwave webhook logs for delivery errors

### Issue: Order not created after payment

**Solution**: Check verification endpoint logs

```bash
# View recent logs
tail -n 100 backend/logs/app.log | grep -i "flutterwave"

# Common causes:
# - Cart already deleted
# - Cart ID not in payment metadata
# - Customer not found
```

---

## Production Testing

Before going live:

1. **Switch to Production Keys**:
   ```env
   FLUTTERWAVE_PUBLIC_KEY=FLWPUBK-xxxxx
   FLUTTERWAVE_SECRET_KEY=FLWSECK-xxxxx
   ```

2. **Test with Real Cards** (small amounts):
   - Use your own card
   - Test 1 GHS transaction
   - Verify order creation
   - Check webhook delivery

3. **Verify Webhook in Production**:
   - Set webhook URL to production domain
   - Test webhook with real payment
   - Monitor webhook logs

4. **Load Testing**:
   - Test concurrent payments
   - Verify performance under load
   - Check database connection pooling

---

## Success Criteria

✅ All test cases passing  
✅ Orders created successfully  
✅ Payment metadata stored correctly  
✅ Webhooks received and processed  
✅ No errors in backend logs  
✅ Flutterwave dashboard shows successful transactions  
✅ Cart deleted after order creation  
✅ Customer can view order details  

---

## Support

- **Flutterwave Docs**: https://developer.flutterwave.com/docs
- **API Reference**: https://developer.flutterwave.com/reference
- **Test Credentials**: https://developer.flutterwave.com/docs/integration-guides/testing-helpers
- **Support**: support@flutterwave.com

