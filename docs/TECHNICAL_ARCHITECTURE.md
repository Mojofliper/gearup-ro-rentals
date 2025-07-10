# GearUp Technical Architecture

## 🏗 System Overview

GearUp is built as a modern web application using a React frontend with Supabase as the backend-as-a-service platform. The architecture follows a serverless approach with real-time capabilities and comprehensive security measures.

---

## 🎯 Architecture Principles

### Design Philosophy

- **Serverless First**: Leverage Supabase for backend services
- **Real-time by Default**: Live updates for messaging and notifications
- **Security First**: Row Level Security and comprehensive validation
- **Mobile Responsive**: Progressive Web App approach
- **Type Safety**: Full TypeScript implementation
- **Performance**: Optimized for fast loading and smooth UX

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React Query + Context API
- **Backend**: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Payments**: Stripe integration
- **Real-time**: Supabase Realtime subscriptions
- **Deployment**: Vercel/Netlify ready

---

## 🗄 Database Architecture

### Core Tables

#### Users & Authentication

```sql
-- Managed by Supabase Auth
auth.users {
  id: UUID (primary key)
  email: TEXT
  encrypted_password: TEXT
  email_confirmed_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  raw_user_meta_data: JSONB
}

-- User profiles
profiles {
  id: UUID (references auth.users)
  full_name: TEXT
  avatar_url: TEXT
  location: TEXT
  phone: TEXT
  is_verified: BOOLEAN (default: false)
  role: TEXT (renter/lender/both)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

#### Gear Management

```sql
-- Gear categories
categories {
  id: UUID (primary key)
  name: TEXT (unique)
  slug: TEXT (unique)
  description: TEXT
  icon_name: TEXT
  created_at: TIMESTAMPTZ
}

-- Gear listings
gear {
  id: UUID (primary key)
  owner_id: UUID (references profiles)
  name: TEXT (validated)
  description: TEXT
  category_id: UUID (references categories)
  brand: TEXT
  model: TEXT
  condition: TEXT (enum)
  price_per_day: INTEGER (RON cents)
  deposit_amount: INTEGER (RON cents)
  pickup_location: TEXT
  specifications: JSONB
  included_items: JSONB
  images: JSONB (array of URLs)
  is_available: BOOLEAN
  view_count: INTEGER
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

#### Booking System

```sql
-- Bookings
bookings {
  id: UUID (primary key)
  gear_id: UUID (references gear)
  renter_id: UUID (references profiles)
  owner_id: UUID (references profiles)
  start_date: DATE
  end_date: DATE
  total_days: INTEGER
  total_amount: INTEGER (RON cents)
  deposit_amount: INTEGER (RON cents)
  status: TEXT (pending/confirmed/active/completed/cancelled)
  payment_status: TEXT (pending/paid/failed/refunded)
  notes: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}

-- Transactions
transactions {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  stripe_payment_intent_id: TEXT (unique)
  amount: INTEGER (total in RON cents)
  platform_fee: INTEGER (13% in RON cents)
  deposit_amount: INTEGER (RON cents)
  rental_amount: INTEGER (RON cents)
  status: TEXT (pending/processing/completed/failed/refunded)
  payment_method: TEXT
  stripe_charge_id: TEXT
  refund_amount: INTEGER
  refund_reason: TEXT
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

#### Communication System

```sql
-- Messages
messages {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  sender_id: UUID (references profiles)
  content: TEXT (sanitized)
  is_read: BOOLEAN
  created_at: TIMESTAMPTZ
}

-- Message threads
message_threads {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  participant1_id: UUID (references profiles)
  participant2_id: UUID (references profiles)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

#### Reviews & Feedback

```sql
-- Reviews
reviews {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  reviewer_id: UUID (references profiles)
  reviewed_id: UUID (references profiles)
  gear_id: UUID (references gear)
  rating: INTEGER (1-5)
  comment: TEXT
  created_at: TIMESTAMPTZ
}
```

#### Dispute Resolution

```sql
-- Claims
claims {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  claimant_id: UUID (references profiles)
  claim_type: TEXT (damage/late_return/missing_item/other)
  description: TEXT
  evidence_photos: JSONB
  admin_notes: TEXT
  status: TEXT (pending/under_review/resolved/dismissed)
  resolution: TEXT
  deposit_penalty: INTEGER (RON cents)
  admin_id: UUID (references profiles)
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
  resolved_at: TIMESTAMPTZ
}

-- Photo uploads
photo_uploads {
  id: UUID (primary key)
  booking_id: UUID (references bookings)
  uploaded_by: UUID (references profiles)
  photo_type: TEXT (pickup_renter/pickup_owner/return_renter/return_owner/claim_evidence)
  photo_url: TEXT
  timestamp: TIMESTAMPTZ
  metadata: JSONB
}
```

#### System Tables

```sql
-- Rate limiting
rate_limits {
  id: UUID (primary key)
  user_id: UUID (references profiles)
  action_type: TEXT
  action_count: INTEGER
  window_start: TIMESTAMPTZ
  created_at: TIMESTAMPTZ
}
```

### Database Relationships

#### Entity Relationship Diagram

```
auth.users (1) ←→ (1) profiles
profiles (1) ←→ (N) gear
profiles (1) ←→ (N) bookings (as owner)
profiles (1) ←→ (N) bookings (as renter)
gear (1) ←→ (N) bookings
gear (1) ←→ (N) reviews
categories (1) ←→ (N) gear
bookings (1) ←→ (N) messages
bookings (1) ←→ (N) transactions
bookings (1) ←→ (N) photo_uploads
bookings (1) ←→ (N) claims
bookings (1) ←→ (N) reviews
```

### Row Level Security (RLS)

#### Security Policies

```sql
-- Profiles: Users can only view public info, edit their own
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Gear: Viewable by everyone, editable by owner
CREATE POLICY "Gear is viewable by everyone" ON gear
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own gear" ON gear
  FOR UPDATE USING (auth.uid() = owner_id);

-- Bookings: Only participants can view
CREATE POLICY "Users can view their own bookings" ON bookings
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Messages: Only booking participants can access
CREATE POLICY "Users can view messages for their bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );
```

---

## 🔧 API Architecture

### Frontend API Layer

#### React Query Integration

```typescript
// Query Client Configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### Custom Hooks Pattern

```typescript
// Example: useGear hook
export const useGear = (id?: string) => {
  return useQuery({
    queryKey: ["gear", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("gear")
        .select(
          `
          *,
          owner:profiles(*),
          category:categories(*)
        `,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
```

### Supabase Client Configuration

```typescript
// Supabase client setup
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  },
);
```

### Edge Functions

#### Payment Processing

```typescript
// stripe-create-payment-intent
serve(async (req) => {
  const { amount, currency, metadata } = await req.json();

  // Validate user and transaction
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price_data: { currency, unit_amount: amount } }],
    mode: "payment",
    success_url: `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: CANCEL_URL,
    metadata,
  });

  return new Response(JSON.stringify({ url: session.url }));
});
```

#### Webhook Handling

```typescript
// stripe-webhook
serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  const event = stripe.webhooks.constructEvent(
    body,
    signature,
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
  );

  switch (event.type) {
    case "payment_intent.succeeded":
      await handlePaymentSuccess(event.data.object);
      break;
    case "payment_intent.payment_failed":
      await handlePaymentFailure(event.data.object);
      break;
  }
});
```

---

## 🔐 Security Architecture

### Authentication Flow

```typescript
// Auth context implementation
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(profile);
      } else {
        setProfile(null);
        // Clear sensitive data on logout
        localStorage.removeItem("user-preferences");
        sessionStorage.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ... rest of implementation
};
```

### Input Validation & Sanitization

```typescript
// Validation utilities
export const validateGearName = (name: string): string | null => {
  if (!name || name.trim().length < 3) {
    return "Numele trebuie să aibă cel puțin 3 caractere";
  }
  if (name.length > 100) {
    return "Numele nu poate depăși 100 de caractere";
  }
  if (/[<>]/.test(name)) {
    return "Numele nu poate conține caractere speciale";
  }
  return null;
};

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
};
```

### Rate Limiting

```sql
-- Database function for rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  action_type TEXT,
  max_actions INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;

  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_rate_limit.action_type
    AND created_at > window_start;

  IF current_count >= max_actions THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (user_id, action_type)
  VALUES (auth.uid(), check_rate_limit.action_type);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📱 Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── AddGear/              # Gear creation components
│   ├── BrowseGear/           # Browsing components
│   ├── AuthModal.tsx         # Authentication modal
│   ├── BookingModal.tsx      # Booking creation
│   ├── ConfirmationSystem.tsx # Pickup/return confirmation
│   ├── ConversationModal.tsx # Messaging interface
│   ├── FeaturedGear.tsx      # Homepage featured gear
│   ├── GearDetail.tsx        # Gear detail page
│   ├── Header.tsx            # Navigation header
│   ├── Messages.tsx          # Messaging system
│   ├── PaymentModal.tsx      # Payment interface
│   ├── Profile.tsx           # User profile
│   └── ReviewModal.tsx       # Review creation
├── contexts/
│   ├── AuthContext.tsx       # Authentication context
│   └── ThemeContext.tsx      # Theme management
├── hooks/
│   ├── useAuth.ts            # Authentication hooks
│   ├── useGear.ts            # Gear management
│   ├── useBookings.ts        # Booking management
│   ├── usePayments.ts        # Payment processing
│   ├── useReviews.ts         # Review system
│   └── useSecureAuth.ts      # Security hooks
├── integrations/
│   ├── supabase/
│   │   ├── client.ts         # Supabase client
│   │   └── types.ts          # Database types
│   └── stripe/
│       └── client.ts         # Stripe integration
├── services/
│   └── paymentService.ts     # Payment service
├── utils/
│   ├── validation.ts         # Input validation
│   ├── security.ts           # Security utilities
│   └── htmlSanitizer.ts      # Content sanitization
└── pages/
    ├── Index.tsx             # Homepage
    ├── NotFound.tsx          # 404 page
    ├── PaymentSuccess.tsx    # Payment success
    └── PaymentCancel.tsx     # Payment cancel
```

### State Management

```typescript
// Context-based state management
export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

// React Query for server state
export const useGearList = (filters?: GearFilters) => {
  return useQuery({
    queryKey: ["gear", "list", filters],
    queryFn: async () => {
      // Fetch gear with filters
    },
  });
};

// Local state with useState/useReducer
const [cartItems, setCartItems] = useState<CartItem[]>([]);
const [selectedDates, setSelectedDates] = useState<Date[]>([]);
```

### Routing Structure

```typescript
// App routing
const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/browse" element={<BrowseGear />} />
      <Route path="/gear/:id" element={<GearDetail />} />
      <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
      <Route path="/add-gear" element={<AuthGuard><AddGear /></AuthGuard>} />
      <Route path="/messages" element={<AuthGuard><Messages /></AuthGuard>} />
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-cancel" element={<PaymentCancel />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
```

---

## 🔄 Real-time Architecture

### Supabase Realtime Integration

```typescript
// Real-time messaging
useEffect(() => {
  if (!user || bookings.length === 0) return;

  const channels = bookings.map((booking) =>
    supabase
      .channel("messages-realtime-listen-" + booking.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `booking_id=eq.${booking.id}`,
        },
        (payload) => {
          // Handle new message
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe(),
  );

  return () => {
    channels.forEach((ch) => supabase.removeChannel(ch));
  };
}, [user, bookings]);
```

### Live Updates

- **Messaging**: Real-time message delivery
- **Booking Status**: Live status updates
- **Notifications**: Instant user notifications
- **Availability**: Real-time gear availability

---

## 🚀 Performance Optimizations

### Frontend Optimizations

```typescript
// React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Lazy loading
const LazyComponent = lazy(() => import('./HeavyComponent'));

// Image optimization
<img
  src={imageUrl}
  loading="lazy"
  alt={description}
  className="object-cover"
/>
```

### Database Optimizations

```sql
-- Indexes for performance
CREATE INDEX idx_gear_owner_id ON gear(owner_id);
CREATE INDEX idx_gear_category_id ON gear(category_id);
CREATE INDEX idx_gear_is_available ON gear(is_available);
CREATE INDEX idx_bookings_renter_id ON bookings(renter_id);
CREATE INDEX idx_bookings_owner_id ON bookings(owner_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_messages_booking_id ON messages(booking_id);
CREATE INDEX idx_transactions_booking_id ON transactions(booking_id);
```

### Bundle Optimization

```typescript
// Vite configuration
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js", "@stripe/stripe-js"],
  },
});
```

---

## 🔧 Development & Deployment

### Development Environment

```bash
# Development setup
npm install
npm run dev

# Environment variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Deployment Pipeline

```yaml
# GitHub Actions workflow
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run build
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Environment Configuration

```typescript
// Environment validation
const requiredEnvVars = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "VITE_STRIPE_PUBLISHABLE_KEY",
];

requiredEnvVars.forEach((envVar) => {
  if (!import.meta.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

---

## 📊 Monitoring & Analytics

### Error Tracking

```typescript
// Error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    // Send to error tracking service
  }
}

// API error handling
const handleApiError = (error: any) => {
  console.error("API Error:", error);

  if (error.code === "PGRST116") {
    return "Elementul nu a fost găsit";
  }

  return "A apărut o eroare neașteptată";
};
```

### Performance Monitoring

```typescript
// Performance metrics
const measurePageLoad = () => {
  const navigation = performance.getEntriesByType(
    "navigation",
  )[0] as PerformanceNavigationTiming;

  return {
    loadTime: navigation.loadEventEnd - navigation.loadEventStart,
    domContentLoaded:
      navigation.domContentLoadedEventEnd -
      navigation.domContentLoadedEventStart,
    firstPaint: performance.getEntriesByName("first-paint")[0]?.startTime,
  };
};
```

---

## 🔮 Future Architecture Considerations

### Scalability Improvements

1. **Microservices**: Break down into smaller services
2. **Caching Layer**: Redis for session and data caching
3. **CDN**: Global content delivery network
4. **Load Balancing**: Distribute traffic across instances
5. **Database Sharding**: Horizontal scaling for data

### Advanced Features

1. **Real-time Analytics**: Live platform metrics
2. **AI/ML Integration**: Smart recommendations
3. **Mobile Optimization**: Enhanced mobile responsive features
4. **Offline Support**: Service worker implementation
5. **Internationalization**: Multi-language support

### Security Enhancements

1. **2FA**: Two-factor authentication
2. **Audit Logging**: Comprehensive activity tracking
3. **Penetration Testing**: Regular security assessments
4. **Compliance**: GDPR, PCI DSS compliance
5. **Encryption**: End-to-end encryption for messages

This technical architecture provides a solid foundation for the GearUp platform with room for future growth and scalability.
