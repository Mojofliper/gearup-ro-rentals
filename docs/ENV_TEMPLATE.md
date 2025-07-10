# Environment Variables Template

Create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here

# For production, use live keys:
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here

# Error Reporting (Optional)
# VITE_ERROR_REPORTING_URL=https://your-error-reporting-service.com
# VITE_ERROR_REPORTING_API_KEY=your_error_reporting_api_key_here
```

## How to get these values:

### Supabase Keys:

1. Go to https://supabase.com
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon public key

### Stripe Keys:

1. Go to https://dashboard.stripe.com
2. Go to Developers → API keys
3. Copy the publishable key (starts with pk*test* or pk*live*)
4. For webhooks, go to Developers → Webhooks and create endpoint
5. Copy the webhook signing secret (starts with whsec\_)

## Supabase Edge Function Secrets:

Set these in your Supabase dashboard under Settings → API → Edge Function Secrets:

```bash
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```
