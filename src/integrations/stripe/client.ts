import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export const getStripe = () => stripePromise;

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'ron',
  locale: 'ro',
  payment_method_types: ['card'],
  capture_method: 'automatic',
} as const;

// Payment status types
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

// Payment intent types
export interface CreatePaymentIntentParams {
  bookingId: string;
  amount: number; // in RON cents
  rentalAmount: number; // in RON cents
  depositAmount: number; // in RON cents
  platformFee: number; // in RON cents
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
}

// Error types
export class StripeError extends Error {
  constructor(
    message: string,
    public code?: string,
    public declineCode?: string
  ) {
    super(message);
    this.name = 'StripeError';
  }
}

// Utility functions
export const formatAmountForDisplay = (amount: number): string => {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
  }).format(amount / 100);
};

export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100);
};

export const calculatePlatformFee = (rentalAmount: number): number => {
  return Math.round(rentalAmount * 0.13);
};

export const validatePaymentAmounts = (
  rentalAmount: number,
  depositAmount: number,
  platformFee: number
): boolean => {
  if (rentalAmount <= 0 || depositAmount < 0 || platformFee < 0) {
    return false;
  }
  
  const expectedPlatformFee = calculatePlatformFee(rentalAmount);
  if (Math.abs(platformFee - expectedPlatformFee) > 1) {
    return false;
  }
  
  return true;
}; 