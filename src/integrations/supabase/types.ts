export type Database = Record<string, unknown>;

// Claim types
export interface ClaimData {
  booking_id: string;
  claim_type: 'damage' | 'theft' | 'late_return' | 'other';
  description: string;
  evidence_urls?: string[];
  amount_requested?: number;
}

export interface ClaimUpdate {
  claim_status?: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  resolution_amount?: number;
  resolution_date?: string;
}

export interface ClaimResolution {
  claim_status: 'approved' | 'rejected';
  admin_notes?: string;
  resolution_amount?: number;
  resolution_date?: string;
}

// Gear types
export interface GearData {
  title: string;
  description: string;
  category_id: string;
  daily_rate: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  availability_start?: string;
  availability_end?: string;
  owner_id?: string;
}

export interface GearUpdate {
  title?: string;
  description?: string;
  category_id?: string;
  daily_rate?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  availability_start?: string;
  availability_end?: string;
  is_active?: boolean;
}

// Payment types
export interface PaymentData {
  booking_id: string;
  amount: number;
  currency?: string;
  payment_method?: string;
  description?: string;
}

export interface StripeAccountData {
  country: string;
  email: string;
  business_type?: 'individual' | 'company';
  company?: {
    name?: string;
    tax_id?: string;
  };
  individual?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

// Review types
export interface ReviewData {
  gear_id: string;
  booking_id: string;
  rating: number;
  comment?: string;
  title?: string;
}

export interface ReviewUpdate {
  rating?: number;
  comment?: string;
  title?: string;
  is_public?: boolean;
}

// Supabase client type for edge functions
export interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        single: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    insert: (data: Record<string, unknown>) => Promise<{ error: unknown }>;
    update: (data: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: unknown }>;
    };
  };
}
