# Security Guide

## 🛡️ Overview

This guide provides comprehensive security measures and best practices for the GearUp platform. Security is paramount for a peer-to-peer rental platform handling user data, payments, and equipment transactions.

---

## 🔐 Authentication & Authorization

### 1. User Authentication

#### Supabase Auth Implementation

```typescript
// src/contexts/AuthContext.tsx
import { createClient } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: any) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, userData: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData
      }
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### Password Security

```typescript
// src/utils/security.ts
export const validatePassword = (password: string): boolean => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};
```

### 2. Session Management

#### Secure Session Configuration

```typescript
// Session security settings
const sessionConfig = {
  // Session timeout (24 hours)
  sessionTimeout: 24 * 60 * 60 * 1000,

  // Refresh token rotation
  refreshTokenRotation: true,

  // Secure cookie settings
  cookieSettings: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: "strict",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};
```

#### Session Validation

```typescript
// src/utils/session.ts
export const validateSession = async (): Promise<boolean> => {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return false;
    }

    // Check session expiration
    const now = Date.now();
    const sessionExpiry = session.expires_at! * 1000;

    if (now > sessionExpiry) {
      await supabase.auth.signOut();
      return false;
    }

    return true;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
};
```

### 3. Role-Based Access Control (RBAC)

#### User Roles

```sql
-- Database role definitions
CREATE TYPE user_role AS ENUM ('renter', 'lender', 'both', 'admin');

-- Update profiles table
ALTER TABLE public.profiles
ADD COLUMN role user_role DEFAULT 'renter';

-- Role-based policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

#### Authorization Checks

```typescript
// src/utils/authorization.ts
export const checkPermission = async (
  userId: string,
  resource: string,
  action: string,
): Promise<boolean> => {
  const { data: user } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (!user) return false;

  // Admin has all permissions
  if (user.role === "admin") return true;

  // Define permissions matrix
  const permissions = {
    renter: {
      gear: ["read"],
      bookings: ["create", "read", "update"],
      reviews: ["create", "read"],
    },
    lender: {
      gear: ["create", "read", "update", "delete"],
      bookings: ["read", "update"],
      reviews: ["read"],
    },
    both: {
      gear: ["create", "read", "update", "delete"],
      bookings: ["create", "read", "update"],
      reviews: ["create", "read"],
    },
  };

  const userPermissions = permissions[user.role as keyof typeof permissions];
  return (
    userPermissions?.[resource as keyof typeof userPermissions]?.includes(
      action,
    ) || false
  );
};
```

---

## 🛡️ Data Protection

### 1. Input Validation & Sanitization

#### Input Validation

```typescript
// src/utils/validation.ts
export const validateGearInput = (input: any): boolean => {
  const { name, description, price_per_day } = input;

  // Name validation
  if (
    !name ||
    typeof name !== "string" ||
    name.length < 3 ||
    name.length > 100
  ) {
    return false;
  }

  // Check for XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
  ];

  if (xssPatterns.some((pattern) => pattern.test(name))) {
    return false;
  }

  // Description validation
  if (
    description &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    return false;
  }

  // Price validation
  if (
    !price_per_day ||
    typeof price_per_day !== "number" ||
    price_per_day < 0
  ) {
    return false;
  }

  return true;
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, "") // Remove event handlers
    .trim();
};
```

#### SQL Injection Prevention

```typescript
// Use parameterized queries (Supabase handles this automatically)
const createGear = async (gearData: any) => {
  const { data, error } = await supabase
    .from("gear")
    .insert(gearData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Never use string concatenation for SQL queries
// ❌ WRONG
const badQuery = `SELECT * FROM gear WHERE name = '${userInput}'`;

// ✅ CORRECT
const goodQuery = supabase.from("gear").select("*").eq("name", userInput);
```

### 2. Data Encryption

#### Sensitive Data Encryption

```typescript
// src/utils/encryption.ts
export const encryptSensitiveData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData,
  );

  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedData.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedData), iv.length);

  return btoa(String.fromCharCode(...combined));
};

export const decryptSensitiveData = async (
  encryptedData: string,
  key: CryptoKey,
): Promise<string> => {
  const combined = new Uint8Array(
    atob(encryptedData)
      .split("")
      .map((char) => char.charCodeAt(0)),
  );

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data,
  );

  return new TextDecoder().decode(decryptedData);
};
```

### 3. Row Level Security (RLS)

#### Database Security Policies

```sql
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Gear policies
CREATE POLICY "Gear is viewable by everyone" ON public.gear
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own gear" ON public.gear
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own gear" ON public.gear
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own gear" ON public.gear
  FOR DELETE USING (auth.uid() = owner_id);

-- Bookings policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = renter_id OR auth.uid() = owner_id);

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = renter_id OR auth.uid() = owner_id);

-- Messages policies
CREATE POLICY "Users can view messages for their bookings" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their bookings" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = messages.booking_id
      AND (bookings.renter_id = auth.uid() OR bookings.owner_id = auth.uid())
    )
  );
```

---

## 💳 Payment Security

### 1. Stripe Integration Security

#### Secure Payment Processing

```typescript
// src/services/paymentService.ts
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export class PaymentService {
  // Create payment intent with proper validation
  static async createPaymentIntent(bookingData: any) {
    try {
      // Validate booking data
      if (!bookingData.amount || bookingData.amount <= 0) {
        throw new Error("Invalid payment amount");
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: bookingData.amount,
        currency: "ron",
        metadata: {
          booking_id: bookingData.booking_id,
          user_id: bookingData.user_id,
        },
        // Enable 3D Secure
        setup_future_usage: "off_session",
        // Enable fraud detection
        capture_method: "automatic",
      });

      return {
        success: true,
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
      };
    } catch (error) {
      console.error("Payment intent creation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment failed",
      };
    }
  }

  // Validate webhook signature
  static validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
      return true;
    } catch (error) {
      console.error("Webhook signature validation failed:", error);
      return false;
    }
  }
}
```

#### Webhook Security

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  try {
    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      return new Response("Missing signature", { status: 400 });
    }

    // Validate webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return new Response("Invalid signature", { status: 400 });
    }

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook error", { status: 500 });
  }
});
```

### 2. PCI Compliance

#### Card Data Handling

```typescript
// Never store card data locally
// ✅ CORRECT: Use Stripe tokens
const paymentData = {
  payment_method_id: "pm_1234567890", // Stripe token
  amount: 25000,
  currency: "ron",
};

// ❌ WRONG: Never store actual card data
const badPaymentData = {
  card_number: "4242424242424242",
  expiry_month: "12",
  expiry_year: "2025",
  cvc: "123",
};
```

#### Secure Payment UI

```typescript
// src/components/PaymentModal.tsx
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!)

export const PaymentModal: React.FC<PaymentModalProps> = ({ booking, onClose }) => {
  const handlePayment = async () => {
    try {
      const stripe = await stripePromise
      if (!stripe) throw new Error('Stripe failed to load')

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          amount: booking.total_amount
        })
      })

      const session = await response.json()

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id
      })

      if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      // Handle error appropriately
    }
  }

  return (
    <div className="payment-modal">
      <h2>Finalizează plata</h2>
      <p>Suma: {booking.total_amount / 100} RON</p>
      <button onClick={handlePayment}>
        Plătește cu cardul
      </button>
    </div>
  )
}
```

---

## 🚨 Security Monitoring

### 1. Rate Limiting

#### API Rate Limiting

```typescript
// src/utils/rateLimit.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

export class RateLimiter {
  static async checkRateLimit(
    userId: string,
    action: string,
    maxActions: number = 10,
    windowMinutes: number = 60,
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc("check_rate_limit", {
        action_type: action,
        max_actions: maxActions,
        window_minutes: windowMinutes,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Rate limit check failed:", error);
      return false;
    }
  }

  static async recordAction(userId: string, action: string): Promise<void> {
    try {
      await supabase.from("rate_limits").insert({
        user_id: userId,
        action_type: action,
      });
    } catch (error) {
      console.error("Failed to record action:", error);
    }
  }
}
```

#### Database Rate Limiting Function

```sql
-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type TEXT,
  max_actions INTEGER DEFAULT 10,
  window_minutes INTEGER DEFAULT 60
) RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMPTZ;
BEGIN
  -- Get current window start
  window_start := now() - (window_minutes || ' minutes')::INTERVAL;

  -- Count actions in current window
  SELECT COALESCE(SUM(action_count), 0) INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = check_rate_limit.action_type
    AND created_at > window_start;

  -- Check if limit exceeded
  IF current_count >= max_actions THEN
    RETURN FALSE;
  END IF;

  -- Record this action
  INSERT INTO public.rate_limits (user_id, action_type)
  VALUES (auth.uid(), check_rate_limit.action_type);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. Security Logging

#### Security Event Logging

```typescript
// src/utils/securityLogger.ts
export class SecurityLogger {
  static async logSecurityEvent(
    event: string,
    userId: string,
    details: any,
    severity: "low" | "medium" | "high" | "critical" = "low",
  ) {
    try {
      await supabase.from("security_logs").insert({
        event_type: event,
        user_id: userId,
        details: details,
        severity: severity,
        ip_address: await this.getClientIP(),
        user_agent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to log security event:", error);
    }
  }

  static async logFailedLogin(email: string, reason: string) {
    await this.logSecurityEvent(
      "failed_login",
      null,
      { email, reason },
      "medium",
    );
  }

  static async logSuspiciousActivity(userId: string, activity: string) {
    await this.logSecurityEvent(
      "suspicious_activity",
      userId,
      { activity },
      "high",
    );
  }

  private static async getClientIP(): Promise<string> {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return "unknown";
    }
  }
}
```

#### Security Logs Table

```sql
-- Security logs table
CREATE TABLE public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id),
  details JSONB,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Admins can view security logs" ON public.security_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
```

### 3. Intrusion Detection

#### Suspicious Activity Detection

```typescript
// src/utils/intrusionDetection.ts
export class IntrusionDetection {
  static async detectSuspiciousActivity(
    userId: string,
    action: string,
  ): Promise<boolean> {
    try {
      // Check for rapid successive actions
      const recentActions = await this.getRecentActions(userId, 5); // Last 5 minutes

      if (recentActions.length > 50) {
        await SecurityLogger.logSuspiciousActivity(userId, "rapid_actions");
        return true;
      }

      // Check for unusual login patterns
      const loginAttempts = await this.getRecentLogins(userId, 60); // Last hour

      if (loginAttempts.length > 10) {
        await SecurityLogger.logSuspiciousActivity(userId, "multiple_logins");
        return true;
      }

      // Check for unusual payment patterns
      const payments = await this.getRecentPayments(userId, 24); // Last 24 hours

      if (payments.length > 20) {
        await SecurityLogger.logSuspiciousActivity(
          userId,
          "excessive_payments",
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Intrusion detection error:", error);
      return false;
    }
  }

  private static async getRecentActions(userId: string, minutes: number) {
    const { data } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", userId)
      .gte(
        "created_at",
        new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      );

    return data || [];
  }

  private static async getRecentLogins(userId: string, minutes: number) {
    const { data } = await supabase
      .from("security_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("event_type", "login")
      .gte(
        "timestamp",
        new Date(Date.now() - minutes * 60 * 1000).toISOString(),
      );

    return data || [];
  }

  private static async getRecentPayments(userId: string, hours: number) {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte(
        "created_at",
        new Date(Date.now() - hours * 60 * 60 * 1000).toISOString(),
      );

    return data || [];
  }
}
```

---

## 🔒 Data Privacy & GDPR

### 1. Data Minimization

#### Minimal Data Collection

```typescript
// Only collect necessary data
const requiredUserData = {
  email: string,        // Required for authentication
  full_name: string,    // Required for identification
  phone?: string,       // Optional for contact
  location?: string     // Optional for local matching
}

// Don't collect unnecessary data
const unnecessaryData = {
  date_of_birth: string,    // Not needed
  social_security: string,  // Not needed
  passport_number: string   // Not needed
}
```

### 2. Data Retention

#### Data Retention Policy

```sql
-- Data retention function
CREATE OR REPLACE FUNCTION public.cleanup_old_data() RETURNS void AS $$
BEGIN
  -- Delete old security logs (keep for 1 year)
  DELETE FROM public.security_logs
  WHERE timestamp < now() - INTERVAL '1 year';

  -- Delete old rate limit records (keep for 30 days)
  DELETE FROM public.rate_limits
  WHERE created_at < now() - INTERVAL '30 days';

  -- Archive old bookings (keep for 7 years for tax purposes)
  -- Move to archive table instead of deleting
  INSERT INTO public.bookings_archive
  SELECT * FROM public.bookings
  WHERE created_at < now() - INTERVAL '7 years';

  DELETE FROM public.bookings
  WHERE created_at < now() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;
```

### 3. User Rights

#### Right to Deletion

```typescript
// src/utils/gdpr.ts
export class GDPRService {
  static async deleteUserData(userId: string): Promise<boolean> {
    try {
      // Delete user data from all tables
      await supabase.from("profiles").delete().eq("id", userId);

      await supabase.from("gear").delete().eq("owner_id", userId);

      await supabase.from("bookings").delete().eq("renter_id", userId);

      await supabase.from("bookings").delete().eq("owner_id", userId);

      // Delete from Supabase Auth
      await supabase.auth.admin.deleteUser(userId);

      return true;
    } catch (error) {
      console.error("Failed to delete user data:", error);
      return false;
    }
  }

  static async exportUserData(userId: string): Promise<any> {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data: gear } = await supabase
        .from("gear")
        .select("*")
        .eq("owner_id", userId);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("*")
        .eq("renter_id", userId);

      return {
        profile,
        gear,
        bookings,
        exported_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to export user data:", error);
      throw error;
    }
  }
}
```

---

## 🛠 Security Best Practices

### 1. Environment Security

#### Environment Variables

```env
# Production environment variables
# Never commit these to version control
STRIPE_SECRET_KEY=sk_live_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
JWT_SECRET=xxx
ENCRYPTION_KEY=xxx
```

#### Environment Validation

```typescript
// src/utils/envValidation.ts
export const validateEnvironment = () => {
  const required = [
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "VITE_STRIPE_PUBLISHABLE_KEY",
  ];

  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  // Validate URL formats
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl.startsWith("https://")) {
    throw new Error("SUPABASE_URL must use HTTPS");
  }
};
```

### 2. Code Security

#### Dependency Security

```bash
# Regular security audits
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Use security-focused packages
npm install helmet
npm install cors
npm install rate-limiter-flexible
```

#### Content Security Policy

```typescript
// src/utils/csp.ts
export const cspHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};
```

### 3. Network Security

#### HTTPS Enforcement

```typescript
// Force HTTPS in production
if (import.meta.env.PROD && window.location.protocol !== "https:") {
  window.location.href = window.location.href.replace("http:", "https:");
}
```

#### CORS Configuration

```typescript
// CORS settings
const corsOptions = {
  origin: [
    "https://your-domain.vercel.app",
    "https://your-staging-domain.vercel.app",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
```

---

## 📋 Security Checklist

### Pre-Deployment Security

- [ ] All dependencies updated and audited
- [ ] Environment variables properly configured
- [ ] HTTPS enforced in production
- [ ] CORS properly configured
- [ ] Content Security Policy implemented
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] SQL injection protection verified
- [ ] XSS protection implemented
- [ ] CSRF protection enabled

### Payment Security

- [ ] Stripe integration properly configured
- [ ] Webhook signature validation implemented
- [ ] PCI compliance verified
- [ ] No card data stored locally
- [ ] Payment error handling implemented
- [ ] Fraud detection enabled

### Data Protection

- [ ] Row Level Security enabled
- [ ] Data encryption implemented
- [ ] GDPR compliance verified
- [ ] Data retention policy implemented
- [ ] User deletion functionality implemented
- [ ] Data export functionality implemented

### Monitoring & Logging

- [ ] Security event logging enabled
- [ ] Intrusion detection implemented
- [ ] Rate limiting monitoring
- [ ] Error logging configured
- [ ] Performance monitoring enabled
- [ ] Backup strategy implemented

---

## 🚨 Incident Response

### Security Incident Response Plan

#### 1. Detection

- Monitor security logs
- Watch for unusual activity patterns
- Respond to user reports

#### 2. Assessment

- Determine incident severity
- Identify affected systems
- Assess potential impact

#### 3. Response

- Isolate affected systems
- Block malicious IPs
- Reset compromised accounts
- Notify affected users

#### 4. Recovery

- Restore from backups
- Patch vulnerabilities
- Update security measures
- Document lessons learned

---

This comprehensive security guide ensures the GearUp platform maintains the highest security standards for user data, payments, and overall system integrity.
