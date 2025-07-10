# GearUp Payment Architecture

## 🎯 Payment Provider Decision: Stripe

After comprehensive analysis of payment providers for the Romanian market, **Stripe** has been selected as the primary payment processor for GearUp.

### Why Stripe?

#### ✅ **Advantages for GearUp:**

- **Romanian Market Support**: Full RON currency support and local payment methods
- **Marketplace Features**: Stripe Connect supports escrow and marketplace scenarios
- **Security**: PCI-compliant with advanced fraud detection
- **Developer Experience**: Excellent TypeScript support and documentation
- **Cost-Effective**: Competitive pricing (2.9% + 0.30 RON per transaction)
- **Webhook System**: Robust real-time event handling
- **Already Partially Implemented**: 60% of integration complete

#### 🔄 **Alternative Providers Considered:**

- **PayPal**: Limited Romanian market support, higher fees
- **Square**: Not available in Romania
- **Adyen**: Enterprise-focused, complex for startups
- **Local Romanian Providers**: Limited international support, higher fees

---

## 🏗 Payment Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │     Stripe      │
│   (React)       │◄──►│   Edge Functions │◄──►│   API/Webhooks  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Flow     │    │   Database      │    │   Payment       │
│   (Booking)     │    │   (Transactions)│    │   Processing    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Payment Flow Architecture

1. **Booking Creation** → Database transaction record
2. **Payment Intent** → Stripe Checkout Session
3. **User Payment** → Stripe processes payment
4. **Webhook** → Update booking status
5. **Escrow** → Funds held until completion
6. **Release** → Automatic fund distribution

---

## 💳 Stripe Implementation Details

### Current Implementation Status: 60% Complete

#### ✅ **Implemented Features:**

- Stripe client integration
- Payment intent creation
- Basic webhook handling
- Transaction database structure
- Payment modal UI
- Refund API structure

#### 🔄 **Partially Implemented:**

- Payment UI refinement
- Webhook processing
- Error handling
- User feedback

#### ❌ **Missing Features:**

- Escrow system (Stripe Connect)
- Automatic fund distribution
- Advanced fraud detection
- Payment method selection
- Invoice generation

### Stripe Configuration

#### Environment Variables

```env
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Backend (Supabase Edge Functions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUCCESS_URL=https://gearup.ro/payment-success
CANCEL_URL=https://gearup.ro/payment-cancel
```

#### Stripe Account Setup

```typescript
// Stripe configuration for Romania
export const STRIPE_CONFIG = {
  currency: "ron",
  locale: "ro",
  payment_method_types: ["card"],
  capture_method: "automatic",
  // Future: Add local payment methods
  // payment_method_types: ['card', 'sofort', 'ideal', 'bancontact'],
} as const;
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

#### Escrow Flow

```typescript
// 1. Create Connected Account for Owner
const account = await stripe.accounts.create({
  type: "express",
  country: "RO",
  email: owner.email,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// 2. Create Payment Intent with Application Fee
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

// 3. Hold funds in escrow (automatic with Stripe)
// 4. Release funds after rental completion
const transfer = await stripe.transfers.create({
  amount: rentalAmount,
  currency: "ron",
  destination: owner.stripe_account_id,
  source_transaction: paymentIntent.latest_charge,
});
```

### Database Schema for Escrow

```sql
-- Connected accounts for owners
CREATE TABLE connected_accounts (
  id: UUID PRIMARY KEY,
  owner_id: UUID REFERENCES profiles(id),
  stripe_account_id: TEXT UNIQUE,
  account_status: TEXT (pending/active/restricted),
  charges_enabled: BOOLEAN,
  payouts_enabled: BOOLEAN,
  created_at: TIMESTAMPTZ,
  updated_at: TIMESTAMPTZ
);

-- Escrow transactions
CREATE TABLE escrow_transactions (
  id: UUID PRIMARY KEY,
  booking_id: UUID REFERENCES bookings(id),
  stripe_payment_intent_id: TEXT,
  rental_amount: INTEGER,
  deposit_amount: INTEGER,
  platform_fee: INTEGER,
  escrow_status: TEXT (held/released/refunded),
  release_date: TIMESTAMPTZ,
  created_at: TIMESTAMPTZ
);
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

  // Send notifications
  await sendPaymentSuccessNotifications(paymentIntent.metadata.booking_id);
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

This payment architecture ensures a secure, compliant, and user-friendly payment experience for the GearUp platform while maximizing revenue and minimizing risk.
