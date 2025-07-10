# Environment Variables Setup Guide

## Required Environment Variables

Create a `.env` file in your project root with the following variables:

### Frontend Environment Variables (.env)

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

### Backend Environment Variables (Supabase Dashboard)

Go to your Supabase Dashboard → Settings → Edge Functions and add these secrets:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Supabase Configuration (already set by Supabase)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## How to Get These Values

### 1. Supabase Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY` (for Edge Functions)

### 2. Stripe Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → API Keys
3. Copy:
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

### 3. Stripe Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to Developers → Webhooks
3. Click "Add endpoint"
4. Set endpoint URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
5. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
6. Click "Add endpoint"
7. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

## Setting Up Supabase Edge Function Secrets

1. Go to your Supabase Dashboard
2. Navigate to Settings → Edge Functions
3. Add these secrets:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## Deploying Edge Functions

1. Install Supabase CLI:

   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:

   ```bash
   supabase login
   ```

3. Link your project:

   ```bash
   supabase link --project-ref your-project-ref
   ```

4. Deploy Edge Functions:
   ```bash
   supabase functions deploy stripe-create-payment-intent
   supabase functions deploy stripe-refund
   supabase functions deploy stripe-webhook
   ```

## Testing Configuration

### Test Stripe Keys

Use these test card numbers:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Webhook

1. Use Stripe CLI to test webhooks locally:

   ```bash
   stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
   ```

2. Or use the Stripe Dashboard webhook testing feature

## Security Notes

- ✅ Never commit `.env` files to version control
- ✅ Use test keys for development
- ✅ Use live keys only in production
- ✅ Keep your Stripe secret key secure
- ✅ Validate webhook signatures
- ✅ Use HTTPS in production

## Production Checklist

- [ ] Switch to live Stripe keys
- [ ] Update webhook endpoint URL
- [ ] Test all payment flows
- [ ] Set up monitoring
- [ ] Configure error alerts
- [ ] Set up logging
- [ ] Test refund scenarios
