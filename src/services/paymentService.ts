
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';
import { 
  CreatePaymentIntentParams, 
  PaymentIntentResponse, 
  StripeError,
  calculatePlatformFee,
  validatePaymentAmounts 
} from '@/integrations/stripe/client';

type BookingUpdate = Database['public']['Tables']['bookings']['Update'];

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

<<<<<<< Updated upstream
=======
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
        } as TransactionInsert)
        .select()
        .single();

      if (transactionError) {
        console.error('Transaction creation error:', transactionError);
        throw new StripeError('Failed to create transaction record');
      }

>>>>>>> Stashed changes
      // Call Supabase Edge Function to create Stripe payment intent
      const response = await fetch(`https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          bookingId: params.bookingId,
          amount: params.amount,
          currency: 'ron',
          metadata: {
            booking_id: params.bookingId,
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
      // For now, we'll just log the confirmation
      // In a real implementation, you'd update the booking status
      console.log('Payment confirmed for intent:', paymentIntentId);
    } catch (error) {
      console.error('Payment confirmation error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to confirm payment');
    }
  }

  /**
   * Process a refund for a booking
   */
  static async processRefund(
    bookingId: string,
    amount: number,
    reason: string
  ): Promise<void> {
    try {
      // Call Supabase Edge Function to process refund
      const response = await fetch(`https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          bookingId,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(errorData.message || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to process refund');
    }
  }

  /**
   * Get booking details by ID
   */
  static async getBookingById(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (error) {
        throw new StripeError('Failed to fetch booking');
      }

      return data;
    } catch (error) {
      console.error('Booking fetch error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to fetch booking');
    }
  }

  /**
   * Get all bookings for a user
   */
  static async getUserBookings(userId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          gear:gear(*),
          owner:profiles!bookings_owner_id_fkey(*),
          renter:profiles!bookings_renter_id_fkey(*)
        `)
        .or(`owner_id.eq.${userId},renter_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw new StripeError('Failed to fetch user bookings');
      }

      return data || [];
    } catch (error) {
      console.error('User bookings fetch error:', error);
      throw error instanceof StripeError ? error : new StripeError('Failed to fetch user bookings');
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
