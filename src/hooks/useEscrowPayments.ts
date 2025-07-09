import { useState, useCallback } from 'react';
import { PaymentService } from '@/services/paymentService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ConnectedAccountStatus {
  id: string;
  owner_id: string;
  stripe_account_id: string;
  account_status: 'pending' | 'active' | 'restricted';
  charges_enabled: boolean;
  payouts_enabled: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface EscrowTransaction {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
  rental_amount: number;
  deposit_amount: number;
  platform_fee: number;
  escrow_status: 'pending' | 'held' | 'released' | 'refunded' | 'transfer_failed';
  owner_stripe_account_id: string;
  transfer_id: string | null;
  release_date: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  refund_id: string | null;
  transfer_failure_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EscrowPaymentIntent {
  url: string;
  sessionId: string;
  amount: number;
  platformFee: number;
  escrowStatus: string;
}

export const useEscrowPayments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connectedAccount, setConnectedAccount] = useState<ConnectedAccountStatus | null>(null);
  const [escrowTransaction, setEscrowTransaction] = useState<EscrowTransaction | null>(null);

  // Setup Stripe Connect account for gear owner
  const setupStripeConnect = useCallback(async (email: string, country: string = 'RO') => {
    if (!user) {
      toast.error('You must be logged in to setup payments');
      return null;
    }

    setLoading(true);
    try {
      const result = await PaymentService.setupStripeConnect(user.id, email, country);
      
      if (result.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = result.onboardingUrl;
      }
      
      toast.success('Stripe Connect setup initiated');
      return result;
    } catch (error: unknown) {
      console.error('Stripe Connect setup error:', error);
      toast.error('Failed to setup Stripe Connect account');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get connected account status
  const getConnectedAccountStatus = useCallback(async () => {
    if (!user) {
      return null;
    }

    setLoading(true);
    try {
      const account = await PaymentService.getConnectedAccountStatus(user.id);
      setConnectedAccount(account as ConnectedAccountStatus);
      return account;
    } catch (error: unknown) {
      console.error('Failed to get connected account status:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create escrow payment intent
  const createEscrowPaymentIntent = useCallback(async (
    bookingId: string,
    rentalAmount: number,
    depositAmount: number
  ): Promise<EscrowPaymentIntent | null> => {
    if (!user) {
      toast.error('You must be logged in to create payment');
      return null;
    }

    setLoading(true);
    try {
      const result = await PaymentService.createEscrowPaymentIntent(
        bookingId,
        rentalAmount,
        depositAmount
      );
      
      toast.success('Payment intent created successfully');
      return result;
    } catch (error: unknown) {
      console.error('Escrow payment intent error:', error);
      
      if ((error as Error).message?.includes('Owner account not ready')) {
        toast.error('Owner needs to complete payment setup first');
      } else {
        toast.error('Failed to create payment intent');
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get escrow transaction details
  const getEscrowTransaction = useCallback(async (bookingId: string) => {
    setLoading(true);
    try {
      const transaction = await PaymentService.getEscrowTransaction(bookingId);
      setEscrowTransaction(transaction as EscrowTransaction);
      return transaction;
    } catch (error: unknown) {
      console.error('Failed to get escrow transaction:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if user can receive payments (for gear owners)
  const canReceivePayments = useCallback(() => {
    return connectedAccount?.charges_enabled && connectedAccount?.payouts_enabled;
  }, [connectedAccount]);

  // Check if user needs onboarding
  const needsOnboarding = useCallback(() => {
    return !connectedAccount || !connectedAccount.charges_enabled;
  }, [connectedAccount]);

  // Release escrow funds
  const releaseEscrowFunds = useCallback(async (
    bookingId: string,
    releaseType: 'automatic' | 'manual' | 'claim_owner' | 'claim_denied' | 'pickup_confirmed' | 'completed' = 'automatic',
    depositToOwner: boolean = false
  ) => {
    if (!user) {
      toast.error('You must be logged in to release escrow funds');
      return null;
    }

    setLoading(true);
    try {
      const result = await PaymentService.releaseEscrowFunds(bookingId, releaseType, depositToOwner);
      
      toast.success('Escrow funds released successfully');
      return result;
    } catch (error: unknown) {
      console.error('Failed to release escrow funds:', error);
      toast.error('Failed to release escrow funds');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    loading,
    connectedAccount,
    escrowTransaction,
    setupStripeConnect,
    getConnectedAccountStatus,
    createEscrowPaymentIntent,
    getEscrowTransaction,
    canReceivePayments,
    needsOnboarding,
    releaseEscrowFunds,
  };
}; 