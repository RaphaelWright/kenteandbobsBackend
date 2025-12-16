# Flutterwave Payment Integration - Quick Reference

## ✅ Implementation Complete

Flutterwave is now available as a payment option alongside Paystack in your Medusa backend.

---

## What You Need to Do

### 1. Add Environment Variables

Add these to your `backend/.env` file:

```env
# Get these from https://dashboard.flutterwave.com
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxx
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TESTxxxxxxxxxx
```

### 2. Restart Your Backend

```bash
cd backend
npm run dev
```

That's it for backend! The integration is ready to use.

---

## API Endpoints Available

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/store/payments/flutterwave/initialize` | POST | Start payment |
| `/store/payments/flutterwave/callback` | GET | Handle redirect |
| `/store/payments/flutterwave/verify` | POST | Verify & create order |
| `/store/payments/flutterwave/webhook` | POST | Real-time updates |

---

## Frontend Integration

To add Flutterwave to your frontend checkout:

1. **Add payment provider selection UI** - Let customers choose between Paystack and Flutterwave
2. **Initialize payment** - Call `/store/payments/flutterwave/initialize`
3. **Redirect to Flutterwave** - User completes payment on Flutterwave page
4. **Verify payment** - Call `/store/payments/flutterwave/verify` after redirect

See `storefront/PAYMENT_PROVIDER_INTEGRATION.md` for complete React examples.

---

## Testing

### Test Card (Sandbox)

```
Card Number: 5531886652142950
CVV: 564
Expiry: 09/32
PIN: 3310
OTP: 12345
```

### Quick Test

```bash
# 1. Initialize payment (requires authenticated session)
curl -X POST http://localhost:9000/store/payments/flutterwave/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt

# 2. Complete payment on Flutterwave page

# 3. Verify payment
curl -X POST http://localhost:9000/store/payments/flutterwave/verify \
  -H "Content-Type: application/json" \
  -d '{"tx_ref": "FLW-xxxxx"}'
```

See `backend/FLUTTERWAVE_TESTING_GUIDE.md` for detailed testing instructions.

---

## Payment Methods Supported

✅ Card (Visa, Mastercard, Verve)  
✅ Mobile Money (MTN, Vodafone, AirtelTigo)  
✅ Bank Transfer  
✅ USSD  
✅ Bank Account  

---

## Documentation

| Guide | Location | Purpose |
|-------|----------|---------|
| **Backend API** | `backend/FLUTTERWAVE_INTEGRATION.md` | Complete API documentation |
| **Frontend** | `storefront/PAYMENT_PROVIDER_INTEGRATION.md` | React components & examples |
| **Testing** | `backend/FLUTTERWAVE_TESTING_GUIDE.md` | How to test the integration |
| **Summary** | `FLUTTERWAVE_IMPLEMENTATION_SUMMARY.md` | Implementation overview |

---

## Files Created

```
backend/src/api/store/payments/flutterwave/
├── initialize/route.ts    ← Initialize payment
├── callback/route.ts      ← Handle redirects
├── verify/route.ts        ← Verify & create order
└── webhook/route.ts       ← Process webhooks
```

Plus 3 comprehensive documentation files.

---

## Going to Production

1. Get production credentials from Flutterwave
2. Complete KYC verification
3. Update `.env` with production keys
4. Configure webhook URL in Flutterwave dashboard
5. Test with real payment

---

## Need Help?

- **API Docs**: https://developer.flutterwave.com/docs
- **Dashboard**: https://dashboard.flutterwave.com
- **Support**: support@flutterwave.com

---

## Next Steps

- [ ] Add Flutterwave credentials to `.env`
- [ ] Restart backend
- [ ] Test payment flow with test card
- [ ] Implement frontend payment selection
- [ ] Configure webhook for production

