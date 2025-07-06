# 🎒 GearUp - Peer-to-Peer Photo/Video Gear Rental Platform

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Latest-green.svg)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-orange.svg)](https://stripe.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.11-38B2AC.svg)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-7.0.2-646CFF.svg)](https://vitejs.dev/)

> **Romania's Premier Peer-to-Peer Photo/Video Equipment Rental Platform**

GearUp connects photographers, videographers, and content creators with equipment owners across Romania. Rent professional gear locally with secure payments, deposit protection, and community trust.

## 🚀 Live Demo

- **Production**: [Coming Soon]
- **Staging**: [Coming Soon]
- **Documentation**: [Full Documentation](./docs/)

## ✨ Key Features

### 🔐 **Secure Authentication & User Management**
- ✅ Email/password authentication with Supabase Auth
- ✅ Google OAuth integration
- ✅ User profile management with avatar upload
- ✅ Role-based access (renter/lender/both)
- ✅ Romanian counties location system
- ✅ Input validation and sanitization
- ✅ Rate limiting for security

### 🎒 **Comprehensive Gear Management**
- ✅ Multi-step gear creation with validation
- ✅ Secure photo upload via Supabase Storage
- ✅ Predefined categories (Cameras, Lenses, Drones, etc.)
- ✅ Advanced search and filtering
- ✅ Availability toggle and management
- ✅ Detailed gear information display

### 🔍 **Smart Discovery & Browsing**
- ✅ Featured gear homepage section
- ✅ Responsive gear display cards
- ✅ Real-time search with filters
- ✅ Category and location filtering
- ✅ Price sorting and comparison
- ✅ Mobile-optimized browsing experience

### 📅 **Complete Booking System**
- ✅ Date selection and booking requests
- ✅ Owner approval/rejection workflow
- ✅ Complete status tracking (pending → confirmed → active → completed)
- ✅ Future date validation and conflict checking
- ✅ Automatic cost calculation with 13% platform fee
- ✅ Deposit amount management

### 💬 **Real-time Messaging**
- ✅ Live message delivery via Supabase realtime
- ✅ Booking-specific conversation threads
- ✅ Complete message history storage
- ✅ Read receipts and status tracking
- ✅ Mobile-responsive messaging interface
- ✅ Content sanitization and XSS prevention

### 💳 **Secure Payment Processing**
- ✅ Stripe integration for Romanian market
- ✅ Secure payment intent creation
- ✅ Webhook handling for payment events
- ✅ Transaction tracking and audit trail
- ✅ Refund processing system
- ✅ 13% platform fee calculation

### ⭐ **Reviews & Trust System**
- ✅ User review and rating system (1-5 stars)
- ✅ Average ratings and review counts display
- ✅ Post-booking review submission
- ✅ Review validation (completed bookings only)
- ✅ Public review display on gear pages

### 🛡️ **Enterprise-Grade Security**
- ✅ Row Level Security (RLS) on all tables
- ✅ Comprehensive input validation
- ✅ XSS prevention and content sanitization
- ✅ API rate limiting and abuse prevention
- ✅ Authentication guards for protected routes
- ✅ Secure file upload handling

## 🏗️ Technical Architecture

### **Frontend Stack**
- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development for better maintainability
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - Professional component library built on Radix UI
- **React Query** - Powerful data fetching, caching, and synchronization
- **React Router** - Declarative routing for React applications
- **Vite** - Lightning-fast build tool and development server

### **Backend Stack**
- **Supabase** - Open-source Firebase alternative with PostgreSQL
- **PostgreSQL** - Robust, scalable relational database
- **Row Level Security** - Database-level access control
- **Edge Functions** - Serverless backend logic with Deno
- **Real-time Subscriptions** - Live updates via WebSocket
- **Storage** - Secure file storage with CDN

### **Payment Processing**
- **Stripe** - Industry-leading payment processing
- **Webhooks** - Secure payment event handling
- **Checkout Sessions** - Optimized payment flow
- **Refund API** - Automated refund processing
- **Stripe Connect** - Escrow system (planned)

### **Development Tools**
- **ESLint** - Code linting and quality enforcement
- **Prettier** - Code formatting for consistency
- **Husky** - Git hooks for pre-commit checks
- **TypeScript** - Static type checking
- **Vite** - Fast development and optimized builds

## 📊 Database Schema

### **Core Tables**
```sql
-- User Management
profiles (id, full_name, avatar_url, location, phone, is_verified, role)

-- Content Management
categories (id, name, slug, description, icon_name)
gear (id, owner_id, name, description, category_id, price_per_day, deposit_amount, images)

-- Booking System
bookings (id, gear_id, renter_id, owner_id, start_date, end_date, status, payment_status)

-- Payment System
transactions (id, booking_id, stripe_payment_intent_id, amount, platform_fee, status)

-- Communication
messages (id, booking_id, sender_id, content, is_read)
message_threads (id, booking_id, participant1_id, participant2_id)

-- Reviews & Trust
reviews (id, booking_id, reviewer_id, reviewed_id, gear_id, rating, comment)

-- Dispute Resolution
claims (id, booking_id, claimant_id, claim_type, description, status)
photo_uploads (id, booking_id, uploaded_by, photo_type, photo_url, timestamp)

-- Security & Rate Limiting
rate_limits (id, user_id, action_type, action_count, window_start)
```

### **Key Relationships**
- Users can have multiple gear listings
- Users can be both renters and owners
- Bookings connect renters, owners, and gear
- Messages are tied to specific bookings
- Reviews are tied to completed bookings
- Transactions track payment for bookings
- Claims handle disputes for bookings
- Photos document handovers and claims

## 🚀 Getting Started

### **Prerequisites**
- Node.js 18+ and npm/yarn/bun
- Supabase account
- Stripe account
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/gearup-ro-rentals.git
   cd gearup-ro-rentals
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   
   # Stripe Configuration
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
   ```

4. **Set up Supabase**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link your project
   supabase link --project-ref your-project-ref
   
   # Push database schema
   supabase db push
   ```

5. **Start development server**
   ```bash
npm run dev
   # or
   yarn dev
   # or
   bun dev
   ```

6. **Open your browser**
   ```
   http://localhost:5173
   ```

### **Environment Setup**

See [Environment Setup Guide](./docs/ENVIRONMENT_SETUP.md) for detailed configuration instructions.

## 📱 Platform Flow

### **1. User Registration & Verification**
- Full name, email, password, location
- Email verification required
- Phone verification (planned)
- Role selection (renter/lender/both)

### **2. Gear Listing (Owner)**
- Gear title, description, photos (min 1, planned: 3)
- Price per day in RON
- Deposit amount
- Pickup location
- Category and condition

### **3. Browsing & Booking (Renter)**
- Search and filter gear by location, date, type
- Select gear and rental dates
- View cost breakdown (rental + 13% platform fee + deposit)
- Send booking request

### **4. Booking Approval (Owner)**
- Owner receives **email notification** about booking request
- Notification redirects to **Dashboard → "My Equipment" → Equipment dropdown → Rental Requests**
- Owner can Accept or Reject the request
- If **Accepted**: 
  - **Popup appears to set pickup location** (exact address)
  - Renter receives **email notification**
  - Renter is directed to **Dashboard → "My Bookings" tab**

### **5. Payment Processing**
- Renter clicks **"Plătește"** button in "My Bookings" tab
- **Rental Dashboard** opens with special thread for this rental
- Total paid upfront (rental + platform fee + deposit)
- Platform fee → platform account immediately
- Deposit + rental fee → held in escrow

### **6. Rental Dashboard & Handover**
- **Both parties see in rental thread:**
  - Pickup location (exact address)
  - Direct messaging for coordination
  - Escrow status (deposit + rental fee held)
  - Dispute button for issues
- Both users upload timestamped photos
- Messaging system for coordination

### **7. Return & Completion**
- Renter clicks **"Returned"** button in rental dashboard
- Owner clicks **"Received"** button in rental dashboard
- **Both must confirm** for transaction completion
- If no issues: deposit returned, rental fee released to owner
- If issues: claim system activated

### **8. Owner Analytics Dashboard**
- **Dashboard → "Analytics" tab**
- Financial analytics (earnings, fees, pending payments)
- Equipment performance metrics
- Customer analytics and reviews
- Stripe Connect integration for payments

### **8. Dispute Resolution**
- Photo evidence upload
- Admin review and mediation
- Deposit penalty system

## 🔧 Development

### **Available Scripts**
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Supabase
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase
npm run supabase:status   # Check Supabase status
```

### **Project Structure**
```
src/
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── AddGear/        # Gear creation components
│   ├── BrowseGear/     # Gear browsing components
│   └── ...
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations
├── lib/                # Utility functions
├── pages/              # Page components
├── services/           # API services
└── utils/              # Helper utilities
```

### **Code Quality**
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **React Query** for data management
- **Error boundaries** for error handling

## 🚀 Deployment

### **Frontend Deployment (Vercel)**
```bash
# Build the application
npm run build

# Deploy to Vercel
vercel --prod
```

### **Backend Deployment (Supabase)**
```bash
# Deploy database schema
supabase db push

# Deploy Edge Functions
supabase functions deploy
```

### **Environment Variables**
Set production environment variables in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`

## 🔮 Roadmap & Improvements

### **Phase 1: Core Platform Completion (2-4 weeks)**
- [ ] **Complete Escrow System**: Implement Stripe Connect for secure fund holding
- [ ] **Add Missing API Endpoints**: Complete booking and payment flows
- [ ] **Implement Admin Dashboard**: Basic admin interface for dispute resolution
- [ ] **Add Photo Documentation**: Timestamped handover photos with metadata
- [ ] **Enhance Error Handling**: Better user feedback and error recovery
- [ ] **SMS Verification**: Phone number verification for enhanced security
- [ ] **Push Notifications**: Real-time user notifications

### **Phase 2: Advanced Features (1-3 months)**
- [ ] **Analytics Dashboard**: User behavior and platform performance tracking
- [ ] **Advanced Search**: Full-text search with filters and geolocation
- [ ] **Performance Optimization**: Redis caching and query optimization
- [ ] **Mobile PWA**: Progressive web app features for mobile users
- [ ] **Email Notifications**: Automated email system for important events
- [ ] **Offline Support**: Service worker for offline functionality
- [ ] **Advanced Security**: Fraud detection and content moderation

### **Phase 3: Scalability & Growth (3-6 months)**
- [ ] **Microservices Architecture**: Split into smaller, focused services
- [ ] **CDN Implementation**: Global content delivery network
- [ ] **Advanced Analytics**: Machine learning for fraud detection
- [ ] **API Gateway**: Centralized API management and versioning
- [ ] **Multi-region Deployment**: Global platform expansion
- [ ] **Advanced Payment Features**: Multiple payment methods, invoicing
- [ ] **Community Features**: User forums, gear recommendations

### **Technical Improvements**

#### **Database Optimizations**
```sql
-- Performance optimization indexes
CREATE INDEX CONCURRENTLY idx_gear_search_composite ON gear(category_id, is_available, price_per_day, created_at);
CREATE INDEX CONCURRENTLY idx_bookings_status_dates ON bookings(status, start_date, end_date);
CREATE INDEX CONCURRENTLY idx_transactions_status_created ON transactions(status, created_at);

-- Full-text search for better discovery
CREATE INDEX CONCURRENTLY idx_gear_fulltext ON gear USING gin(to_tsvector('romanian', name || ' ' || COALESCE(description, '')));
```

#### **Advanced Caching**
```typescript
// Redis caching for improved performance
export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  },
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value))
  }
}
```

#### **Real-time Enhancements**
```typescript
// Enhanced real-time messaging with WebSocket
export class RealtimeService {
  subscribeToBooking(bookingId: string, callback: (update: any) => void) {
    return supabase
      .channel(`booking:${bookingId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        callback
      )
      .subscribe()
  }
}
```

#### **Security Enhancements**
```typescript
// Fraud detection and content moderation
export class FraudDetection {
  static async analyzeTransaction(transaction: any) {
    const riskFactors = []
    if (transaction.amount > 1000000) riskFactors.push('high_amount')
    if (transaction.user_age_days < 7) riskFactors.push('new_user')
    
    return {
      riskScore: riskFactors.length * 25,
      riskFactors,
      shouldBlock: riskFactors.length >= 3
    }
  }
}
```

## 📊 Performance Metrics

### **Target Performance Goals**
- **Page Load Time**: < 2 seconds
- **Search Results**: < 500ms
- **Image Loading**: < 1 second
- **Payment Processing**: < 3 seconds
- **Real-time Updates**: < 100ms latency

### **Core Web Vitals**
- **First Contentful Paint (FCP)**: < 1.8s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Input Delay (FID)**: < 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

## 🛡️ Security Features

### **Authentication & Authorization**
- Supabase Auth with JWT tokens
- Role-based access control (RBAC)
- Session management with automatic cleanup
- Password strength validation

### **Data Protection**
- Row Level Security (RLS) on all tables
- Input validation and sanitization
- XSS prevention and content filtering
- SQL injection protection

### **Payment Security**
- Stripe PCI-compliant payment processing
- Webhook signature validation
- Secure payment intent creation
- Fraud detection (planned)

### **API Security**
- Rate limiting and abuse prevention
- CORS configuration
- Request validation
- Error handling without data leakage

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### **Development Setup**
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### **Code Standards**
- Follow TypeScript best practices
- Use ESLint and Prettier
- Write meaningful commit messages
- Add documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### **Documentation**
- [Full Documentation](./docs/)
- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Security Guide](./docs/SECURITY_GUIDE.md)

### **Getting Help**
- **Issues**: [GitHub Issues](https://github.com/your-username/gearup-ro-rentals/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/gearup-ro-rentals/discussions)
- **Email**: support@gearup.ro

### **Community**
- **Discord**: [Join our community](https://discord.gg/gearup)
- **Twitter**: [@GearUpRomania](https://twitter.com/GearUpRomania)
- **LinkedIn**: [GearUp Romania](https://linkedin.com/company/gearup-romania)

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Stripe** for secure payment processing
- **Vercel** for seamless deployment
- **shadcn/ui** for the beautiful component library
- **React Query** for powerful data management
- **Tailwind CSS** for the utility-first styling approach

---

**Built with ❤️ in Romania**

*GearUp - Connecting photographers, one rental at a time.*
