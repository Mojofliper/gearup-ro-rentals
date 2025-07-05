import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { 
  CreatePaymentIntentParams, 
  PaymentIntentResponse, 
  StripeError,
  calculatePlatformFee,
  validatePaymentAmounts 
} from '@/integrations/stripe/client';

type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export class PaymentService {
  /**
   * Create a payment intent for a booking
   */
  static async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResponse> {
    try {
      // Validate amounts
      if (!validatePaymentAmounts(params.rentalAmount, params.depositAmount, params.platformFee)) {
        throw new StripeError('Invalid payment amounts');
      }

      // Create transaction record in database
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          booking_id: params.bookingId,
          amount: params.amount,
          rental_amount: params.rentalAmount,
          deposit_amount: params.depositAmount,
          platform_fee: params.platformFee,
          status: 'pending',
          metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        } as TransactionInsert)
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        throw new StripeError('Failed to create transaction record');
      }

      // Call Supabase Edge Function to create Stripe payment intent
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          amount: params.amount,
          currency: 'ron',
          metadata: {
            booking_id: params.bookingId,
            transaction_id: transaction.id,
            rental_amount: params.rentalAmount,
            deposit_amount: params.depositAmount,
            platform_fee: params.platformFee,
            ...params.metadata,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(errorData.message || 'Failed to create payment intent');
      }

      const paymentIntentData = await response.json();

      // Update transaction with payment intent ID
      await supabase
        .from('transactions')
        .update({
          stripe_payment_intent_id: paymentIntentData.paymentIntentId,
        } as TransactionUpdate)
        .eq('id', transaction.id);

      return {
        clientSecret: paymentIntentData.clientSecret,
        paymentIntentId: paymentIntentData.paymentIntentId,
        amount: params.amount,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment after successful Stripe payment
   */
  static async confirmPayment(paymentIntentId: string): Promise<void> {
    try {
      // Update transaction status to completed
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'completed',
        } as TransactionUpdate)
        .eq('stripe_payment_intent_id', paymentIntentId);

      if (error) {
        console.error('Transaction update error:', error);
        throw new StripeError('Failed to confirm payment');
      }
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to confirm payment');
    }
  }

  /**
   * Process a refund for a transaction
   */
  static async processRefund(
    transactionId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      // Get transaction details
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        throw new StripeError('Transaction not found');
      }

      // Call Supabase Edge Function to process refund
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          transactionId,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(errorData.message || 'Failed to process refund');
      }

      // Update transaction with refund details
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          status: 'refunded',
          refund_amount: amount,
          refund_reason: reason,
        } as TransactionUpdate)
        .eq('id', transactionId);

      if (updateError) {
        console.error('Transaction refund update error:', updateError);
        throw new StripeError('Failed to update refund status');
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to process refund');
    }
  }

  /**
   * Get transaction details by booking ID
   */
  static async getTransactionByBookingId(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) {
        throw new StripeError('Failed to fetch transaction');
      }

      return data;
    } catch (error) {
      console.error('Transaction fetch error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to fetch transaction');
    }
  }

  /**
   * Get all transactions for a user
   */
  static async getUserTransactions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          booking:bookings(
            *,
            gear:gear(*),
            owner:profiles!bookings_owner_id_fkey(*),
            renter:profiles!bookings_renter_id_fkey(*)
          )
        `)
        .or(`booking.owner_id.eq.${userId},booking.renter_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new StripeError('Failed to fetch user transactions');
      }

      return data || [];
    } catch (error) {
      console.error('User transactions fetch error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to fetch user transactions');
    }
  }

  /**
   * Calculate payment breakdown
   */
  static calculatePaymentBreakdown(rentalAmount: number, depositAmount: number) {
    const platformFee = calculatePlatformFee(rentalAmount);
    const totalAmount = rentalAmount + depositAmount + platformFee;

    return {
      rentalAmount,
      depositAmount,
      platformFee,
      totalAmount,
    };
  }
} 