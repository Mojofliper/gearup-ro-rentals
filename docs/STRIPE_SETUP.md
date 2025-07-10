# Stripe Payments Setup Guide - Complete Implementation

## 🎯 Payment Provider Decision: Stripe

After comprehensive analysis, **Stripe** has been selected as the primary payment processor for GearUp.

### Why Stripe?

- **Romanian Market Support**: Full RON currency and local payment methods
- **Marketplace Features**: Stripe Connect supports escrow scenarios
- **Security**: PCI-compliant with advanced fraud detection
- **Developer Experience**: Excellent TypeScript support
- **Cost-Effective**: Competitive pricing (2.9% + 0.30 RON per transaction)
- **Already Implemented**: 60% of integration complete

---

## Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **Node.js & Package Manager**: Ensure you have Node.js and npm/yarn/bun installed
3. **Supabase Project**: Ensure your Supabase project is set up

---

## Installation

1. **Install Dependencies**:

   ```bash
   npm install @stripe/stripe-js stripe
   # or
   yarn add @stripe/stripe-js stripe
   # or
   bun add @stripe/stripe-js stripe
   ```

2. **Environment Variables**:
   Create a `.env` file in your project root with:

   ```env
   # Frontend Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

   # Backend (Supabase Edge Functions)
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
   SUCCESS_URL=http://localhost:5173/payment-success
   CANCEL_URL=http://localhost:5173/payment-cancel

   # For production, use live keys:
   # VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
   # STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
   ```

---

## Stripe Dashboard Setup

### 1. Get API Keys

- Go to [Stripe Dashboard](https://dashboard.stripe.com)
- Navigate to Developers → API Keys
- Copy your Publishable Key and Secret Key

### 2. Configure Webhooks

- Go to Developers → Webhooks
- Add endpoint: `https://your-domain.com/functions/v1/stripe-webhook`
- Select events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
  - `account.updated` (for Stripe Connect)

### 3. Configure Payment Methods

- Go to Settings → Payment Methods
- Enable the payment methods you want to accept
- For Romania: Cards, SOFORT, iDEAL, Bancontact

### 4. Set up Stripe Connect (for Escrow)

- Go to Connect → Settings
- Configure your platform settings
- Set up Express accounts for owners
- Configure payout schedules

---

## Database Schema

### Transactions Table

```sql
-- Run this migration
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  stripe_payment_intent_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- Total in RON cents
  platform_fee INTEGER NOT NULL, -- 13% in RON cents
  deposit_amount INTEGER NOT NULL, -- RON cents
  rental_amount INTEGER NOT NULL, -- RON cents
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  stripe_charge_id TEXT,
  refund_amount INTEGER DEFAULT 0,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Connected accounts for escrow
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) UNIQUE,
  stripe_account_id TEXT UNIQUE NOT NULL,
  account_status TEXT DEFAULT 'pending' CHECK (account_status IN ('pending', 'active', 'restricted')),
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escrow transactions
CREATE TABLE IF NOT EXISTS escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  stripe_payment_intent_id TEXT,
  rental_amount INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL,
  platform_fee INTEGER NOT NULL,
  escrow_status TEXT DEFAULT 'held' CHECK (escrow_status IN ('held', 'released', 'refunded')),
  release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔐 Escrow System Implementation

### Stripe Connect Marketplace Model

#### Account Structure

```
GearUp Platform Account (Platform)
├── Connected Accounts (Owners)
│   ├── Owner 1 Account
│   ├── Owner 2 Account
│   └── Owner N Account
└── Platform Fees (13%)
```

#### Escrow Flow Implementation

1. **Create Connected Account for Owner**:

```typescript
// In your edge function
const account = await stripe.accounts.create({
  type: "express",
  country: "RO",
  email: owner.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Save to database
await supabase.from("connected_accounts").insert({
  owner_id: owner.id,
  stripe_account_id: account.id,
  account_status: "pending",
});
```

2. **Create Payment Intent with Escrow**:

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: totalAmount,
  currency: "ron",
  application_fee_amount: platformFee,
  transfer_data: {
    destination: owner.stripe_account_id,
  },
  metadata: {
    booking_id: booking.id,
    rental_amount: rentalAmount,
    deposit_amount: depositAmount,
  },
});
```

3. **Release Funds After Rental Completion**:

```typescript
// Release rental amount to owner
const transfer = await stripe.transfers.create({
  amount: rentalAmount,
  currency: "ron",
  destination: owner.stripe_account_id,
  source_transaction: paymentIntent.latest_charge,
});

// Return deposit to renter
const refund = await stripe.refunds.create({
  payment_intent: paymentIntent.id,
  amount: depositAmount,
});
```

---

## 🔄 Complete Payment Flow

### 1. Booking Creation

```typescript
// User creates booking
const booking = await supabase
  .from("bookings")
  .insert({
    gear_id: gearId,
    renter_id: userId,
    owner_id: ownerId,
    start_date: startDate,
    end_date: endDate,
    total_amount: rentalAmount,
    deposit_amount: depositAmount,
    status: "pending",
    payment_status: "pending",
  })
  .select()
  .single();

// Create transaction record
const transaction = await supabase
  .from("transactions")
  .insert({
    booking_id: booking.id,
    amount: totalAmount,
    rental_amount: rentalAmount,
    deposit_amount: depositAmount,
    platform_fee: platformFee,
    status: "pending",
  })
  .select()
  .single();
```

### 2. Payment Intent Creation

```typescript
// Create Stripe Checkout Session
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  line_items: [
    {
      price_data: {
        currency: "ron",
        product_data: {
          name: `Rental: ${gear.name}`,
          description: `Rental period: ${startDate} - ${endDate}`,
        },
        unit_amount: totalAmount,
      },
      quantity: 1,
    },
  ],
  mode: "payment",
  success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: CANCEL_URL,
  customer_email: user.email,
  metadata: {
    booking_id: booking.id,
    transaction_id: transaction.id,
    rental_amount: rentalAmount,
    deposit_amount: depositAmount,
    platform_fee: platformFee,
  },
});
```

### 3. Payment Processing

```typescript
// Webhook handler for payment success
async function handlePaymentSuccess(paymentIntent: any) {
  // Update transaction status
  await supabase
    .from("transactions")
    .update({
      status: "completed",
      stripe_charge_id: paymentIntent.latest_charge,
    })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  // Update booking status
  await supabase
    .from("bookings")
    .update({ payment_status: "paid" })
    .eq("id", paymentIntent.metadata.booking_id);

  // Create escrow transaction
  await supabase.from("escrow_transactions").insert({
    booking_id: paymentIntent.metadata.booking_id,
    stripe_payment_intent_id: paymentIntent.id,
    rental_amount: parseInt(paymentIntent.metadata.rental_amount),
    deposit_amount: parseInt(paymentIntent.metadata.deposit_amount),
    platform_fee: parseInt(paymentIntent.metadata.platform_fee),
    escrow_status: "held",
  });
}
```

### 4. Escrow Management

```typescript
// Hold funds in escrow (automatic with Stripe Connect)
// Funds are automatically held until manual release or automatic release

// Manual release after rental completion
async function releaseEscrowFunds(bookingId: string) {
  const booking = await getBookingById(bookingId);
  const transaction = await getTransactionByBookingId(bookingId);
  const escrowTransaction = await getEscrowTransactionByBookingId(bookingId);

  // Release rental amount to owner
  await stripe.transfers.create({
    amount: transaction.rental_amount,
    currency: "ron",
    destination: booking.owner.stripe_account_id,
    source_transaction: transaction.stripe_charge_id,
  });

  // Return deposit to renter
  await stripe.refunds.create({
    payment_intent: transaction.stripe_payment_intent_id,
    amount: transaction.deposit_amount,
  });

  // Update escrow status
  await supabase
    .from("escrow_transactions")
    .update({
      escrow_status: "released",
      release_date: new Date().toISOString(),
    })
    .eq("booking_id", bookingId);
}
```

---

## 🛡 Security & Compliance

### PCI Compliance

- **Stripe**: PCI DSS Level 1 compliant
- **No Card Data**: Card data never touches our servers
- **Tokenization**: All sensitive data is tokenized

### Fraud Protection

```typescript
// Stripe Radar integration
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
  currency: "ron",
  capture_method: "automatic",
  // Enable fraud detection
  radar_options: {
    session: sessionId,
  },
  // 3D Secure authentication
  setup_future_usage: "off_session",
});
```

### Data Protection

- **GDPR Compliance**: All data processing follows GDPR
- **Data Minimization**: Only necessary data is collected
- **Right to Deletion**: Users can request data deletion
- **Audit Trail**: Complete transaction logging

---

## 📊 Payment Analytics & Reporting

### Transaction Monitoring

```sql
-- Payment success rate
SELECT
  DATE(created_at) as date,
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
  ROUND(
    COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*),
    2
  ) as success_rate
FROM transactions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

### Revenue Tracking

```sql
-- Platform revenue
SELECT
  DATE(created_at) as date,
  SUM(platform_fee) as platform_revenue,
  SUM(rental_amount) as total_rentals,
  SUM(deposit_amount) as total_deposits
FROM transactions
WHERE status = 'completed'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;
```

---

## 🔧 Implementation Roadmap

### Phase 1: Complete Current Implementation (Week 1-2)

- [ ] Refine payment UI components
- [ ] Complete webhook processing
- [ ] Improve error handling
- [ ] Add payment method selection
- [ ] Test payment flows thoroughly

### Phase 2: Escrow System (Week 3-4)

- [ ] Implement Stripe Connect
- [ ] Create connected accounts for owners
- [ ] Implement escrow logic
- [ ] Add automatic fund release
- [ ] Test escrow flows

### Phase 3: Advanced Features (Week 5-6)

- [ ] Add local payment methods
- [ ] Implement invoice generation
- [ ] Add payment analytics
- [ ] Implement advanced fraud detection
- [ ] Add payment dispute handling

### Phase 4: Optimization (Week 7-8)

- [ ] Performance optimization
- [ ] Mobile responsive optimization
- [ ] A/B testing payment flows
- [ ] User experience improvements
- [ ] Documentation updates

---

## 🚀 Production Checklist

### Pre-Launch

- [ ] Switch to live Stripe keys
- [ ] Set up production webhooks
- [ ] Configure fraud detection
- [ ] Test all payment scenarios
- [ ] Set up monitoring and alerts
- [ ] Configure backup payment methods
- [ ] Legal compliance review

### Post-Launch

- [ ] Monitor payment success rates
- [ ] Track user feedback
- [ ] Optimize conversion rates
- [ ] Implement A/B testing
- [ ] Regular security audits
- [ ] Performance monitoring

---

## 📈 Cost Analysis

### Stripe Fees (Romanian Market)

- **Standard Transaction**: 2.9% + 0.30 RON
- **International Cards**: 3.9% + 0.30 RON
- **Stripe Connect**: No additional fees
- **Refunds**: No fee (original fee not returned)

### Platform Fee Structure

- **Platform Fee**: 13% of rental amount
- **Owner Receives**: 87% of rental amount
- **Deposit**: 100% returned to renter (if no issues)

### Example Transaction

```
Rental Amount: 100 RON
Platform Fee: 13 RON (13%)
Stripe Fee: 3.20 RON (2.9% + 0.30 RON)
Owner Receives: 83.80 RON (100 - 13 - 3.20)
Platform Revenue: 9.80 RON (13 - 3.20)
```

---

## Testing

### Test Card Numbers

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Insufficient Funds**: `4000 0000 0000 9995`

### Test Scenarios

- [ ] Successful payment
- [ ] Failed payment
- [ ] Payment cancellation
- [ ] Refund processing
- [ ] Escrow fund release
- [ ] Webhook processing
- [ ] Error handling

---

## Security Notes

- Never expose your Stripe secret key in frontend code
- Always validate payment amounts on the backend
- Use webhooks to confirm payment status
- Implement proper error handling
- Use HTTPS in production
- Validate webhook signatures
- Implement rate limiting
- Monitor for suspicious activity

---

This comprehensive Stripe setup guide ensures a secure, compliant, and user-friendly payment experience for the GearUp platform while maximizing revenue and minimizing risk.
