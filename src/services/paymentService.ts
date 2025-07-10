import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import {
  CreatePaymentIntentParams,
  PaymentIntentResponse,
  StripeError,
  calculatePlatformFee,
  validatePaymentAmounts,
} from "@/integrations/stripe/client";

type BookingUpdate = {
  id?: string;
  rental_amount?: number;
  deposit_amount?: number;
  total_amount?: number;
  platform_fee?: number;
  status?: string;
  payment_status?: string;
  [key: string]: unknown;
};

export class PaymentService {
  /**
   * Create a payment intent for a booking
   */
  static async createPaymentIntent(
    params: CreatePaymentIntentParams,
  ): Promise<{ url: string; sessionId: string }> {
    try {
      // Validate amounts
      if (
        !validatePaymentAmounts(
          params.rentalAmount,
          params.depositAmount,
          params.platformFee,
        )
      ) {
        throw new StripeError("Invalid payment amounts");
      }

      // Call Supabase Edge Function to create Stripe payment intent
      const payload = {
        transactionId: params.transactionId,
        bookingId: params.bookingId,
        amount: params.amount,
        currency: "ron",
        metadata: {
          ...params.metadata,
          gearTitle: params.gearTitle,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      };
      console.log("Sending payment intent payload:", payload);
      const response = await fetch(
        `https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-create-payment-intent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Edge Function error response:", errorData);
        throw new StripeError(
          errorData.details ||
            errorData.message ||
            "Failed to create checkout session",
        );
      }

      const sessionData = await response.json();
      console.log("Edge Function success response:", sessionData);

      if (!sessionData.url) {
        console.error("No URL in session data:", sessionData);
        throw new StripeError("No payment URL received from server");
      }

      return {
        url: sessionData.url,
        sessionId: sessionData.sessionId,
      };
    } catch (error) {
      console.error("Checkout session creation error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to create checkout session");
    }
  }

  /**
   * Confirm a payment after successful Stripe payment
   */
  static async confirmPayment(paymentIntentId: string): Promise<void> {
    try {
      // For now, we'll just log the confirmation
      // In a real implementation, you'd update the booking status
      console.log("Payment confirmed for intent:", paymentIntentId);
    } catch (error) {
      console.error("Payment confirmation error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to confirm payment");
    }
  }

  /**
   * Process a refund for a booking
   */
  static async processRefund(
    bookingId: string,
    amount: number,
    reason: string,
  ): Promise<void> {
    try {
      // Call Supabase Edge Function to process refund
      const response = await fetch(
        `https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-refund`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            bookingId,
            amount,
            reason,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(errorData.message || "Failed to process refund");
      }
    } catch (error) {
      console.error("Refund processing error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to process refund");
    }
  }

  /**
   * Get booking details by ID
   */
  static async getBookingById(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) {
        throw new StripeError("Failed to fetch booking");
      }

      return data;
    } catch (error) {
      console.error("Booking fetch error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to fetch booking");
    }
  }

  /**
   * Get all bookings for a user
   */
  static async getUserBookings(userId: string) {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          gear:gear(*),
          owner:users!owner_id(*),
          renter:users!renter_id(*)
        `,
        )
        .or(`owner_id.eq.${userId},renter_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) {
        throw new StripeError("Failed to fetch user bookings");
      }

      return data || [];
    } catch (error) {
      console.error("User bookings fetch error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to fetch user bookings");
    }
  }

  /**
   * Calculate payment breakdown
   */
  static calculatePaymentBreakdown(
    rentalAmount: number,
    depositAmount: number,
  ) {
    const platformFee = calculatePlatformFee(rentalAmount);
    const totalAmount = rentalAmount + depositAmount + platformFee;

    return {
      rentalAmount,
      depositAmount,
      platformFee,
      totalAmount,
    };
  }

  /**
   * Setup Stripe Connect account for gear owner
   */
  static async setupStripeConnect(
    userId: string,
    email: string,
    country: string = "RO",
  ) {
    try {
      const response = await fetch(
        `https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/stripe-connect-setup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId,
            email,
            country,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(
          errorData.error || "Failed to setup Stripe Connect",
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Stripe Connect setup error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to setup Stripe Connect");
    }
  }

  /**
   * Get connected account status for a user
   */
  static async getConnectedAccountStatus(userId: string) {
    try {
      const { data, error } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("owner_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new StripeError("Failed to fetch connected account status");
      }

      return data;
    } catch (error) {
      console.error("Connected account status error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to fetch connected account status");
    }
  }

  /**
   * Sync connected account status from Stripe
   */
  static async syncConnectedAccountStatus(userId: string) {
    try {
      const response = await fetch(
        `https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/sync-stripe-account-status`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            userId,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(
          errorData.error || "Failed to sync account status",
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Sync account status error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to sync account status");
    }
  }

  /**
   * Get escrow transaction details
   */
  static async getEscrowTransaction(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from("escrow_transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw new StripeError("Failed to fetch escrow transaction");
      }

      return data;
    } catch (error) {
      console.error("Escrow transaction error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to fetch escrow transaction");
    }
  }

  /**
   * Create a transaction for a booking if one does not exist
   */
  static async getOrCreateTransactionForBooking(booking: {
    id: string;
    rental_amount: number;
    deposit_amount: number;
    total_amount: number;
    platform_fee?: number;
    [key: string]: unknown;
  }): Promise<{
    id: string;
    booking_id: string;
    amount: number;
    platform_fee: number;
    deposit_amount: number;
    rental_amount: number;
    status: string;
    [key: string]: unknown;
  }> {
    // console.log('🔍 FUNCTION CALLED: getOrCreateTransactionForBooking');
    // console.log('=== TRANSACTION DEBUG START ===');
    // Debug: Log current Supabase user/session and booking ID
    const session = await supabase.auth.getSession();
    // console.log('Supabase session:', session?.data?.session);
    // console.log('Supabase user:', session?.data?.session?.user);
    // console.log('User ID:', session?.data?.session?.user?.id);
    // console.log('Creating transaction for booking:', booking.id);
    // console.log('Booking data:', booking);
    // console.log('Booking renter_id:', booking.renter_id);
    // console.log('Booking owner_id:', booking.owner_id);
    // console.log('Is user the renter?', session?.data?.session?.user?.id === booking.renter_id);
    // console.log('Is user the owner?', session?.data?.session?.user?.id === booking.owner_id);
    // console.log('=== TRANSACTION DEBUG END ===');

    // Try to find an existing transaction for this booking
    const { data: existing, error: findError } = await supabase
      .from("transactions")
      .select("*")
      .eq("booking_id", booking.id)
      .single();

    if (findError && findError.code !== "PGRST116") {
      console.error("Error finding existing transaction:", findError);
    }

    if (existing) {
      // console.log('Found existing transaction:', existing);
      return existing;
    }

    // Calculate the correct amounts
    // The booking.rental_amount is the actual rental cost (without deposit and fees)
    // We need to calculate platform fee and total amount
    const rentalAmount = Number(booking.rental_amount) || 0;
    const depositAmount = Number(booking.deposit_amount) || 0;
    const platformFee = Math.round(rentalAmount * 0.13);
    const totalAmount = rentalAmount + depositAmount + platformFee;

    // console.log('Calculated amounts:', {
    //   rentalAmount,
    //   depositAmount,
    //   platformFee,
    //   totalAmount
    // });

    // If not found, create a new transaction
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        booking_id: booking.id,
        amount: totalAmount,
        platform_fee: platformFee,
        deposit_amount: depositAmount,
        rental_amount: rentalAmount,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating transaction:", error);
      throw new StripeError(`Failed to create transaction: ${error.message}`);
    }

    if (!data) {
      throw new StripeError("Failed to create transaction: No data returned");
    }

    // console.log('Created transaction:', data);
    return data;
  }

  /**
   * Release escrow funds for a completed booking
   */
  static async releaseEscrowFunds(
    bookingId: string,
    releaseType:
      | "automatic"
      | "manual"
      | "claim_owner"
      | "claim_denied"
      | "return_confirmed"
      | "completed" = "automatic",
    depositToOwner: boolean = false,
  ) {
    try {
      // Check if booking exists
      const booking = await this.getBookingById(bookingId);
      if (!booking) {
        throw new StripeError(`Booking with ID ${bookingId} not found.`);
      }

      const response = await fetch(
        `https://wnrbxwzeshgblkfidayb.supabase.co/functions/v1/escrow-release`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            booking_id: bookingId,
            release_type: releaseType,
            deposit_to_owner: depositToOwner,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new StripeError(
          errorData.error || "Failed to release escrow funds",
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Escrow release error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to release escrow funds");
    }
  }

  /**
   * Get payment status for a booking
   */
  static async getPaymentStatus(bookingId: string) {
    try {
      // Get booking with payment details
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
          *,
          transactions(*),
          escrow_transactions(*)
        `,
        )
        .eq("id", bookingId)
        .single();

      if (bookingError) {
        throw new StripeError("Failed to fetch booking payment status");
      }

      return {
        booking,
        transaction: booking.transactions?.[0] || null,
        escrowTransaction: booking.escrow_transactions?.[0] || null,
        paymentStatus: booking.payment_status || "pending",
        escrowStatus:
          booking.escrow_transactions?.[0]?.escrow_status || "pending",
      };
    } catch (error) {
      console.error("Payment status error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to get payment status");
    }
  }

  /**
   * Process automatic escrow release for completed bookings
   */
  static async processAutomaticEscrowRelease() {
    try {
      // Find bookings that are ready for automatic escrow release
      const { data: completedBookings, error } = await supabase
        .from("bookings")
        .select(
          `
          *,
          escrow_transactions(*)
        `,
        )
        .eq("status", "completed")
        .eq("payment_status", "paid")
        .eq("escrow_transactions.escrow_status", "held");

      if (error) {
        throw new StripeError("Failed to fetch completed bookings");
      }

      const releasePromises =
        completedBookings?.map(async (booking) => {
          try {
            return await this.releaseEscrowFunds(booking.id, "automatic");
          } catch (error) {
            console.error(
              `Failed to release escrow for booking ${booking.id}:`,
              error,
            );
            return null;
          }
        }) || [];

      const results = await Promise.all(releasePromises);
      const successful = results.filter((result) => result !== null);

      return {
        total: completedBookings?.length || 0,
        successful: successful.length,
        failed: (completedBookings?.length || 0) - successful.length,
      };
    } catch (error) {
      console.error("Automatic escrow release error:", error);
      throw error instanceof StripeError
        ? error
        : new StripeError("Failed to process automatic escrow release");
    }
  }
}
