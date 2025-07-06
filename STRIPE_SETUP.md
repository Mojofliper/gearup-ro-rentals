# Stripe Payments Setup Guide

## Prerequisites

1. **Stripe Account**: Create a Stripe account at [stripe.com](https://stripe.com)
2. **Node.js & Package Manager**: Ensure you have Node.js and npm/yarn/bun installed

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
   # Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   
   # For production, use live keys:
   # VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
   ```

## Stripe Dashboard Setup

1. **Get API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers → API Keys
   - Copy your Publishable Key

2. **Configure Webhooks** (for production):
   - Go to Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`

3. **Configure Payment Methods**:
   - Go to Settings → Payment Methods
   - Enable the payment methods you want to accept

## Database Migration

Run the database migration to create the transactions table:
```bash
supabase db push
```

## Backend API Setup

You'll need to create backend endpoints for:
- `/api/payments/create-intent` - Creates Stripe payment intent
- `/api/payments/refund` - Processes refunds
- `/api/webhooks/stripe` - Handles Stripe webhooks

## Testing

Use Stripe's test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`
SUCCESS_URL=http://localhost:5173/payment-success
CANCEL_URL=http://localhost:5173/payment-cancel
For redirecting stripe
## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Set up webhook endpoints
- [ ] Configure proper error handling
- [ ] Test payment flows thoroughly
- [ ] Set up monitoring and logging
- [ ] Configure fraud detection
- [ ] Set up proper security headers

## Security Notes

- Never expose your Stripe secret key in frontend code
- Always validate payment amounts on the backend
- Use webhooks to confirm payment status
- Implement proper error handling
- Use HTTPS in production 