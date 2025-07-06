# Deployment Guide

## 🚀 Overview

This guide provides step-by-step instructions for deploying the GearUp platform to production. The platform uses **Supabase** for backend services and can be deployed to various hosting platforms for the frontend.

---

## 📋 Prerequisites

### Required Accounts
- [Supabase Account](https://supabase.com) - Backend services
- [Stripe Account](https://stripe.com) - Payment processing
- [Vercel Account](https://vercel.com) - Frontend hosting (recommended)
- [GitHub Account](https://github.com) - Version control

### Required Tools
- **Node.js** (v18 or higher)
- **Git** (latest version)
- **Supabase CLI** (latest version)
- **Stripe CLI** (for testing)

### System Requirements
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: 10GB available space
- **Network**: Stable internet connection

---

## 🏗 Environment Setup

### 1. Local Development Environment

#### Install Dependencies
```bash
# Clone the repository
git clone https://github.com/your-username/gearup-ro-rentals.git
cd gearup-ro-rentals

# Install dependencies
npm install
# or
yarn install
# or
bun install
```

#### Environment Variables
Create `.env.local` file:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Development URLs
VITE_APP_URL=http://localhost:5173
VITE_API_URL=http://localhost:54321
```

### 2. Supabase Project Setup

#### Create Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization
4. Enter project details:
   - **Name**: `gearup-ro-rentals`
   - **Database Password**: Generate strong password
   - **Region**: Select closest to Romania (e.g., West Europe)
5. Click "Create new project"

#### Get Project Credentials
1. Go to Settings → API
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** → `VITE_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

#### Initialize Database
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Push database schema
supabase db push

# Start local development
supabase start
```

### 3. Stripe Configuration

#### Create Stripe Account
1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Complete account setup
3. Navigate to Developers → API Keys
4. Copy:
   - **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** → `STRIPE_SECRET_KEY`

#### Configure Webhooks
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
5. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

#### Set Up Stripe Connect (for Escrow)
1. Go to Connect → Settings
2. Configure platform settings:
   - **Business type**: Platform
   - **Country**: Romania
   - **Currency**: RON
3. Set payout schedule (e.g., 2 business days)

---

## 🔧 Development Deployment

### 1. Local Development
```bash
# Start development server
npm run dev
# or
yarn dev
# or
bun dev

# Access application
open http://localhost:5173
```

### 2. Database Migrations
```bash
# Create new migration
supabase migration new add_new_feature

# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset
```

### 3. Edge Functions Development
```bash
# Start edge functions locally
supabase functions serve

# Deploy specific function
supabase functions deploy stripe-create-payment-intent

# Deploy all functions
supabase functions deploy
```

---

## 🚀 Production Deployment

### 1. Frontend Deployment (Vercel)

#### Prepare for Production
```bash
# Build application
npm run build

# Test production build
npm run preview
```

#### Deploy to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Environment Variables (Vercel)
Add production environment variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key

# Production URLs
VITE_APP_URL=https://your-domain.vercel.app
VITE_API_URL=https://your-project-ref.supabase.co
```

#### Custom Domain Setup
1. Go to Project Settings → Domains
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS

### 2. Backend Deployment (Supabase)

#### Production Database Setup
```bash
# Link to production project
supabase link --project-ref your-production-project-ref

# Push production schema
supabase db push

# Run production migrations
supabase migration up
```

#### Edge Functions Deployment
```bash
# Deploy all functions
supabase functions deploy

# Verify deployment
supabase functions list
```

#### Production Environment Variables
Set in Supabase Dashboard → Settings → Edge Functions:
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Production URLs
SUCCESS_URL=https://your-domain.vercel.app/payment-success
CANCEL_URL=https://your-domain.vercel.app/payment-cancel
```

### 3. Alternative Frontend Hosting

#### Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

#### AWS S3 + CloudFront
```bash
# Install AWS CLI
aws configure

# Build application
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name

# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

#### Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```bash
# Build and run
docker build -t gearup-app .
docker run -p 80:80 gearup-app
```

---

## 🔒 Security Configuration

### 1. Environment Security

#### Production Environment Variables
```env
# Never commit these to version control
STRIPE_SECRET_KEY=sk_live_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

#### Environment Variable Validation
```typescript
// src/utils/env.ts
export const validateEnv = () => {
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY'
  ]

  for (const var_name of required) {
    if (!import.meta.env[var_name]) {
      throw new Error(`Missing required environment variable: ${var_name}`)
    }
  }
}
```

### 2. Database Security

#### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- ... other tables
```

#### Security Policies
```sql
-- Example: Users can only view their own bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);
```

### 3. API Security

#### Rate Limiting
```typescript
// Implement rate limiting
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}
```

#### CORS Configuration
```typescript
// Configure CORS for production
const corsOptions = {
  origin: ['https://your-domain.vercel.app'],
  credentials: true,
  optionsSuccessStatus: 200
}
```

### 4. Payment Security

#### Stripe Security
```typescript
// Validate webhook signatures
const signature = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(
  req.body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)
```

#### PCI Compliance
- ✅ Stripe handles PCI compliance
- ✅ No card data stored locally
- ✅ All sensitive data tokenized

---

## 📊 Monitoring & Analytics

### 1. Application Monitoring

#### Vercel Analytics
```typescript
// Enable Vercel Analytics
import { Analytics } from '@vercel/analytics/react'

function App() {
  return (
    <>
      <YourApp />
      <Analytics />
    </>
  )
}
```

#### Error Tracking
```typescript
// Sentry integration
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "your-sentry-dsn",
  environment: "production",
  integrations: [
    new Sentry.BrowserTracing(),
  ],
  tracesSampleRate: 1.0,
})
```

### 2. Database Monitoring

#### Supabase Monitoring
1. Go to Supabase Dashboard → Project → Database
2. Monitor:
   - **Query Performance**: Slow queries
   - **Connection Pool**: Active connections
   - **Storage Usage**: Database size
   - **Backup Status**: Backup completion

#### Custom Monitoring
```sql
-- Monitor slow queries
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements 
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;
```

### 3. Payment Monitoring

#### Stripe Dashboard
1. Monitor payment success rates
2. Track failed payments
3. Review dispute activity
4. Monitor fraud detection

#### Custom Payment Analytics
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

---

## 🔄 CI/CD Pipeline

### 1. GitHub Actions

#### Workflow Configuration
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

#### Environment Secrets
Set in GitHub Repository → Settings → Secrets:
- `VERCEL_TOKEN`: Vercel deployment token
- `ORG_ID`: Vercel organization ID
- `PROJECT_ID`: Vercel project ID
- `SUPABASE_URL`: Production Supabase URL
- `SUPABASE_ANON_KEY`: Production Supabase anon key

### 2. Database Migrations

#### Automated Migrations
```yaml
# .github/workflows/migrate.yml
name: Database Migration

on:
  push:
    branches: [main]
    paths: ['supabase/migrations/**']

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
```

---

## 🛠 Maintenance

### 1. Regular Maintenance Tasks

#### Daily Tasks
- [ ] Monitor error logs
- [ ] Check payment processing
- [ ] Verify backup completion
- [ ] Monitor system performance

#### Weekly Tasks
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Monitor user feedback
- [ ] Review analytics

#### Monthly Tasks
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database maintenance
- [ ] Backup verification

### 2. Database Maintenance

#### Vacuum and Analyze
```sql
-- Weekly maintenance
VACUUM ANALYZE;
REINDEX DATABASE gearup_rentals;
```

#### Performance Optimization
```sql
-- Monitor slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### 3. Backup Strategy

#### Automated Backups
- **Frequency**: Daily
- **Retention**: 30 days
- **Location**: Supabase managed backups
- **Verification**: Weekly restore tests

#### Manual Backups
```bash
# Export database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Import database
psql $DATABASE_URL < backup_20240101.sql
```

---

## 🚨 Troubleshooting

### 1. Common Issues

#### Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run type-check

# Verify environment variables
npm run validate-env
```

#### Database Connection Issues
```bash
# Check Supabase status
supabase status

# Reset local development
supabase stop
supabase start

# Verify connection
supabase db ping
```

#### Payment Processing Issues
```bash
# Test Stripe webhooks locally
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Verify webhook configuration
stripe webhooks list
```

### 2. Performance Issues

#### Frontend Performance
```bash
# Analyze bundle size
npm run analyze

# Check Lighthouse scores
npm run lighthouse

# Optimize images
npm run optimize-images
```

#### Database Performance
```sql
-- Identify slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements 
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes;
```

### 3. Security Issues

#### Security Audit
```bash
# Run security audit
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update
```

#### SSL/TLS Issues
```bash
# Verify SSL certificate
openssl s_client -connect your-domain.com:443

# Check certificate expiration
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

---

## 📞 Support & Resources

### 1. Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [React Documentation](https://react.dev)

### 2. Community Support
- [Supabase Discord](https://discord.supabase.com)
- [Stripe Community](https://support.stripe.com)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

### 3. Professional Support
- **Supabase**: Enterprise support available
- **Stripe**: Priority support for verified accounts
- **Vercel**: Pro plan includes priority support

---

## 📋 Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Backup strategy in place

### Deployment
- [ ] Deploy to staging environment
- [ ] Run integration tests
- [ ] Deploy to production
- [ ] Verify all functionality
- [ ] Monitor error rates
- [ ] Check payment processing

### Post-Deployment
- [ ] Monitor application performance
- [ ] Verify backup completion
- [ ] Check security logs
- [ ] Review user feedback
- [ ] Update documentation
- [ ] Schedule maintenance

---

This comprehensive deployment guide ensures a smooth and secure production deployment of the GearUp platform with proper monitoring, maintenance, and troubleshooting procedures. 