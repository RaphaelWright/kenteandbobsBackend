# Paystack Quick Start Guide

Get Paystack payments running in 5 minutes!

---

## Step 1: Get API Keys (2 minutes)

1. Sign up at [Paystack](https://paystack.com)
2. Go to **Settings > API Keys & Webhooks**
3. Copy your test keys:
   - Secret Key: `sk_test_...`
   - Public Key: `pk_test_...`

---

## Step 2: Configure Backend (1 minute)

Add to `backend/.env`:

```bash
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
FRONTEND_URL=http://localhost:8000
```

Restart backend:

```bash
cd backend
npm run dev
```

---

## Step 3: Test Payment Flow (2 minutes)

### A. Initialize Payment

```bash
curl -X POST http://localhost:9000/store/payments/paystack/initialize \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{}'
```

Response:
```json
{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/abc123",
    "reference": "PS_1234567890_xyz"
  }
}
```

### B. Visit `authorization_url` in Browser

Use test card:
- **Card:** 4084084084084081
- **CVV:** 408
- **Expiry:** Any future date
- **PIN:** 0000
- **OTP:** 123456

### C. Verify Payment

```bash
curl "http://localhost:9000/store/payments/paystack/verify?reference=PS_1234567890_xyz" \
  -b cookies.txt
```

Response:
```json
{
  "success": true,
  "order": {
    "id": "order_123",
    "total": 50000,
    "status": "pending"
  }
}
```

**Done! 🎉**

---

## Frontend Integration

### React/Next.js Example

```typescript
// 1. Initialize payment
async function handlePayWithPaystack() {
  const res = await fetch('/store/payments/paystack/initialize', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_url: `${window.location.origin}/checkout/verify`
    })
  });
  
  const data = await res.json();
  
  // 2. Redirect to Paystack
  window.location.href = data.data.authorization_url;
}

// 3. Verify on callback (in /checkout/verify page)
useEffect(() => {
  const reference = new URLSearchParams(window.location.search).get('reference');
  
  if (reference) {
    fetch(`/store/payments/paystack/verify?reference=${reference}`, {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Payment successful!
          console.log('Order:', data.order);
        }
      });
  }
}, []);
```

---

## Common Issues

### Payment initialization fails

**Check:**
```bash
# Is PAYSTACK_SECRET_KEY set?
echo $PAYSTACK_SECRET_KEY

# Is user logged in?
# Is cart not empty?
```

### Verification fails

**Check:**
- Payment was completed on Paystack
- Reference is correct
- Amount matches cart total

---

## Next Steps

- [Complete Documentation](./PAYSTACK_INTEGRATION.md)
- [Webhook Setup](./PAYSTACK_INTEGRATION.md#webhook-configuration)
- [Production Checklist](./PAYSTACK_INTEGRATION.md#security)

---

## Test Cards

| Purpose | Card Number | CVV | PIN | OTP |
|---------|-------------|-----|-----|-----|
| Success | 4084084084084081 | 408 | 0000 | 123456 |
| Fail | 5060666666666666666 | 123 | - | - |

---

## Support

- **Paystack:** [paystack.com/support](https://paystack.com/support)
- **Documentation:** [PAYSTACK_INTEGRATION.md](./PAYSTACK_INTEGRATION.md)
- **Issues:** Check troubleshooting section in main docs

---

**Ready to go live?**

1. Switch to live API keys
2. Complete KYC verification
3. Setup webhook URL
4. Test with real (small) amount
5. Launch! 🚀

