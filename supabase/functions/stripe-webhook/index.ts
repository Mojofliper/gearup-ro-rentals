import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-12-18.acacia",
});

const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "stripe-signature, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.log("Webhook: No stripe signature");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    // Use constructEventAsync for Deno Edge runtime
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || "",
    );

    // Create Supabase client with service role key for webhook operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    console.log("Webhook: Supabase URL configured:", !!supabaseUrl);
    console.log("Webhook: Service role key configured:", !!supabaseServiceKey);

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object, supabaseClient);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object, supabaseClient);
        break;
      case "charge.refunded":
        await handleChargeRefunded(event.data.object, supabaseClient);
        break;
      case "account.updated":
        await handleAccountUpdated(event.data.object, supabaseClient);
        break;
      case "transfer.created":
        await handleTransferCreated(event.data.object, supabaseClient);
        break;
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object, supabaseClient);
        break;
      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event.data.object, supabaseClient);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      { status: 400 },
    );
  }
});

async function handleCheckoutSessionCompleted(
  session: unknown,
  supabaseClient: unknown,
) {
  console.log("Checkout session completed:", session.id);
  console.log("Session payment_intent:", session.payment_intent);
  console.log("Session metadata:", session.metadata);

  try {
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error("Missing booking_id in session metadata");
      return;
    }

    if (!session.payment_intent) {
      console.error("No payment_intent found in session");
      return;
    }

    console.log("Processing payment for booking:", bookingId);

    // First, check current booking status
    const { data: currentBooking, error: currentBookingError } =
      await supabaseClient
        .from("bookings")
        .select(
          "id, status, payment_status, payment_intent_id, owner_id, end_date",
        )
        .eq("id", bookingId)
        .single();

    if (currentBookingError) {
      console.error("Error fetching current booking:", currentBookingError);
      return;
    }

    console.log("Current booking status:", {
      id: currentBooking.id,
      status: currentBooking.status,
      payment_status: currentBooking.payment_status,
      payment_intent_id: currentBooking.payment_intent_id,
      owner_id: currentBooking.owner_id,
    });

    // Update booking payment status - always update payment_status when payment is successful
    const { error: bookingError } = await supabaseClient
      .from("bookings")
      .update({
        payment_status: "completed",
        payment_intent_id: session.payment_intent, // Update with actual payment intent ID
      })
      .eq("id", bookingId);

    if (bookingError) {
      console.error("Error updating booking payment status:", bookingError);
    } else {
      console.log(
        "Successfully updated payment_status to completed for booking:",
        bookingId,
      );
    }

    // Update booking status to confirmed - always update to prevent race conditions
    const { error: statusError } = await supabaseClient
      .from("bookings")
      .update({
        status: "confirmed", // Auto-confirm booking after payment
      })
      .eq("id", bookingId);

    if (statusError) {
      console.error("Error updating booking status:", statusError);
    } else {
      console.log(
        "Successfully updated status to confirmed for booking:",
        bookingId,
      );
    }

    // Get the charge ID from the payment intent
    let chargeId = null;
    if (session.payment_intent) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          session.payment_intent,
        );
        chargeId = paymentIntent.latest_charge;
        console.log("Retrieved charge ID from payment intent:", chargeId);
      } catch (error) {
        console.error("Error retrieving payment intent:", error);
      }
    }

    // Get owner's Stripe account ID
    const { data: connectedAccount, error: accountError } = await supabaseClient
      .from("connected_accounts")
      .select("stripe_account_id")
      .eq("owner_id", currentBooking.owner_id)
      .single();

    if (accountError || !connectedAccount) {
      console.error(
        "Connected account not found for owner:",
        currentBooking.owner_id,
      );
      throw new Error("Connected account not found for owner");
    }

    // Parse amounts from session metadata (these are set when creating the checkout session)
    const rentalAmount = parseInt(session.metadata?.rental_amount || "0");
    const depositAmount = parseInt(session.metadata?.deposit_amount || "0");
    const platformFee = parseInt(session.metadata?.platform_fee || "0");

    console.log("Amounts from session metadata:", {
      rentalAmount,
      depositAmount,
      platformFee,
    });

    // Update or create escrow transaction record
    const { data: existingEscrow, error: escrowQueryError } =
      await supabaseClient
        .from("escrow_transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

    if (escrowQueryError) {
      console.error("Error querying escrow transaction:", escrowQueryError);
    }

    if (existingEscrow) {
      // Update existing escrow transaction
      console.log("Updating existing escrow transaction:", existingEscrow.id);

      const { error: escrowUpdateError } = await supabaseClient
        .from("escrow_transactions")
        .update({
          escrow_status: "held",
          stripe_payment_intent_id: session.payment_intent,
          stripe_charge_id: chargeId,
          rental_amount: rentalAmount,
          deposit_amount: depositAmount,
          platform_fee: platformFee,
          owner_stripe_account_id: connectedAccount.stripe_account_id,
          held_until:
            existingEscrow.held_until ||
            new Date(currentBooking.end_date).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEscrow.id);

      if (escrowUpdateError) {
        console.error("Error updating escrow transaction:", escrowUpdateError);
        throw escrowUpdateError;
      } else {
        console.log(
          "Successfully updated escrow transaction with payment intent, charge ID, and amounts:",
          session.payment_intent,
          chargeId,
        );
      }
    } else {
      // Create new escrow transaction record
      console.log("Creating new escrow transaction for booking:", bookingId);

      const { error: escrowError } = await supabaseClient
        .from("escrow_transactions")
        .insert({
          booking_id: bookingId,
          stripe_payment_intent_id: session.payment_intent,
          stripe_charge_id: chargeId,
          rental_amount: rentalAmount,
          deposit_amount: depositAmount,
          platform_fee: platformFee,
          escrow_status: "held",
          owner_stripe_account_id: connectedAccount.stripe_account_id,
          held_until: new Date(currentBooking.end_date).toISOString(), // Hold until end of rental period
          released_at: null,
          released_to: null,
          release_reason: null,
          refund_amount: 0,
          refund_reason: null,
          refund_id: null,
          transfer_id: null,
          transfer_failure_reason: null,
        });

      if (escrowError) {
        console.error("Error creating escrow transaction:", escrowError);
        throw escrowError;
      } else {
        console.log(
          "Successfully created escrow transaction with payment intent:",
          session.payment_intent,
        );
      }
    }

    // Also update the transactions table for accounting purposes (if it exists)
    if (session.metadata?.transaction_id) {
      const { error: transactionUpdateError } = await supabaseClient
        .from("transactions")
        .update({
          stripe_payment_intent_id: session.payment_intent,
          status: "completed",
          stripe_charge_id: chargeId,
        })
        .eq("id", session.metadata.transaction_id);

      if (transactionUpdateError) {
        console.error(
          "Error updating transaction (non-critical):",
          transactionUpdateError,
        );
      } else {
        console.log("Successfully updated transaction for accounting purposes");
      }
    }

    console.log(
      "Successfully processed checkout session completion for booking:",
      bookingId,
    );
  } catch (error) {
    console.error("Error handling checkout session completion:", error);
    throw error; // Re-throw to ensure webhook fails and Stripe retries
  }
}

async function handleCheckoutSessionExpired(
  session: unknown,
  supabaseClient: unknown,
) {
  console.log("Checkout session expired:", session.id);
  console.log("Session payment_intent:", session.payment_intent);
  console.log("Session metadata:", session.metadata);

  try {
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      console.error("Missing booking_id in session metadata");
      return;
    }

    if (!session.payment_intent) {
      console.error("No payment_intent found in session");
      return;
    }

    console.log("Processing expired payment for booking:", bookingId);

    // Update booking payment status to 'failed'
    const { error: bookingError } = await supabaseClient
      .from("bookings")
      .update({
        payment_status: "failed",
        payment_intent_id: session.payment_intent, // Update with actual payment intent ID
      })
      .eq("id", bookingId);

    if (bookingError) {
      console.error(
        "Error updating booking payment status to failed:",
        bookingError,
      );
    } else {
      console.log(
        "Successfully updated payment_status to failed for booking:",
        bookingId,
      );
    }

    // Update escrow transaction status to 'failed'
    const { data: existingEscrow, error: escrowQueryError } =
      await supabaseClient
        .from("escrow_transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .maybeSingle();

    if (escrowQueryError) {
      console.error(
        "Error querying escrow transaction for expired session:",
        escrowQueryError,
      );
    }

    if (existingEscrow) {
      const { error: escrowUpdateError } = await supabaseClient
        .from("escrow_transactions")
        .update({
          escrow_status: "failed",
          stripe_payment_intent_id: session.payment_intent,
          stripe_charge_id: null, // Clear charge ID as payment failed
          rental_amount: 0,
          deposit_amount: 0,
          platform_fee: 0,
          owner_stripe_account_id: null,
          held_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingEscrow.id);

      if (escrowUpdateError) {
        console.error(
          "Error updating escrow transaction to failed:",
          escrowUpdateError,
        );
      } else {
        console.log(
          "Successfully updated escrow transaction to failed for expired session:",
          bookingId,
        );
      }
    }

    // Also update the transactions table for accounting purposes (if it exists)
    if (session.metadata?.transaction_id) {
      const { error: transactionUpdateError } = await supabaseClient
        .from("transactions")
        .update({
          stripe_payment_intent_id: session.payment_intent,
          status: "failed",
          stripe_charge_id: null,
        })
        .eq("id", session.metadata.transaction_id);

      if (transactionUpdateError) {
        console.error(
          "Error updating transaction (non-critical):",
          transactionUpdateError,
        );
      } else {
        console.log("Successfully updated transaction for accounting purposes");
      }
    }

    console.log(
      "Successfully processed checkout session expiration for booking:",
      bookingId,
    );
  } catch (error) {
    console.error("Error handling checkout session expiration:", error);
    throw error; // Re-throw to ensure webhook fails and Stripe retries
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: unknown,
  supabaseClient: unknown,
) {
  console.log("Payment succeeded:", paymentIntent.id);

  try {
    // Update escrow transaction with charge ID (primary source)
    console.log("Payment intent latest_charge:", paymentIntent.latest_charge);
    if (paymentIntent.latest_charge) {
      console.log(
        "Updating escrow transaction with charge ID:",
        paymentIntent.latest_charge,
      );
      const { data: escrowUpdateData, error: escrowChargeUpdateError } =
        await supabaseClient
          .from("escrow_transactions")
          .update({
            stripe_charge_id: paymentIntent.latest_charge,
          })
          .eq("stripe_payment_intent_id", paymentIntent.id)
          .select();

      if (escrowChargeUpdateError) {
        console.error(
          "Error updating escrow transaction with charge ID:",
          escrowChargeUpdateError,
        );
      } else {
        console.log(
          "Successfully updated escrow transaction with charge ID. Updated rows:",
          escrowUpdateData?.length || 0,
        );
      }
    } else {
      console.log("No latest_charge found in payment intent");
    }

    // Update booking payment status using escrow transaction
    const { data: escrowTransaction } = await supabaseClient
      .from("escrow_transactions")
      .select("booking_id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (escrowTransaction) {
      // Always update booking status and payment status when payment succeeds
      await supabaseClient
        .from("bookings")
        .update({
          payment_status: "completed",
          status: "confirmed", // Auto-confirm booking after payment
        })
        .eq("id", escrowTransaction.booking_id);
    }

    // Also update the transactions table for accounting purposes (if it exists)
    const { error: transactionUpdateError } = await supabaseClient
      .from("transactions")
      .update({
        status: "completed",
        stripe_charge_id: paymentIntent.latest_charge,
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (transactionUpdateError) {
      console.error(
        "Error updating transaction (non-critical):",
        transactionUpdateError,
      );
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: unknown,
  supabaseClient: unknown,
) {
  console.log("Payment failed:", paymentIntent.id);

  try {
    // Update booking payment status using escrow transaction
    const { data: escrowTransaction } = await supabaseClient
      .from("escrow_transactions")
      .select("booking_id")
      .eq("stripe_payment_intent_id", paymentIntent.id)
      .single();

    if (escrowTransaction) {
      await supabaseClient
        .from("bookings")
        .update({
          payment_status: "failed",
          // Don't automatically cancel the booking - let user decide if they want to retry payment
          // status: 'cancelled' // Removed - only cancel if user explicitly cancels
        })
        .eq("id", escrowTransaction.booking_id);
    }

    // Also update the transactions table for accounting purposes (if it exists)
    const { error: transactionUpdateError } = await supabaseClient
      .from("transactions")
      .update({
        status: "failed",
      })
      .eq("stripe_payment_intent_id", paymentIntent.id);

    if (transactionUpdateError) {
      console.error(
        "Error updating transaction (non-critical):",
        transactionUpdateError,
      );
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}

async function handleChargeRefunded(charge: unknown, supabaseClient: unknown) {
  console.log("Charge refunded:", charge.id);

  try {
    // Find transaction by charge ID
    const { data: transaction } = await supabaseClient
      .from("transactions")
      .select("*")
      .eq("stripe_charge_id", charge.id)
      .single();

    if (transaction) {
      // Update transaction with refund details
      await supabaseClient
        .from("transactions")
        .update({
          status: "refunded",
          refund_amount: charge.amount_refunded,
          refund_reason: "Stripe refund",
        })
        .eq("id", transaction.id);

      // Fetch the booking to check its current status
      const { data: booking } = await supabaseClient
        .from("bookings")
        .select("status")
        .eq("id", transaction.booking_id)
        .single();

      let newStatus = booking?.status;
      if (booking && !["returned", "completed"].includes(booking.status)) {
        newStatus = "cancelled";
      }

      // Update booking payment status and status (only set cancelled if not already returned/completed)
      await supabaseClient
        .from("bookings")
        .update({
          payment_status: "refunded",
          status: newStatus,
        })
        .eq("id", transaction.booking_id);

      // Update escrow transaction if exists
      await supabaseClient
        .from("escrow_transactions")
        .update({
          escrow_status: "refunded",
          refund_amount: charge.amount_refunded,
          refund_reason: "Stripe refund",
        })
        .eq("stripe_payment_intent_id", transaction.stripe_payment_intent_id);
    }
  } catch (error) {
    console.error("Error handling charge refund:", error);
  }
}

async function handleAccountUpdated(account: unknown, supabaseClient: unknown) {
  console.log("Account updated:", account.id);

  try {
    // Only handle Express accounts
    if (account.type !== "express") {
      console.log("Skipping non-express account:", account.id);
      return;
    }

    // Check if this account already exists in our database
    const { data: existingAccount } = await supabaseClient
      .from("connected_accounts")
      .select("id")
      .eq("stripe_account_id", account.id)
      .single();

    if (!existingAccount) {
      // This is a new account created during onboarding
      console.log("New account created during onboarding:", account.id);

      // Find the user by email
      if (account.email) {
        const { data: user } = await supabaseClient
          .from("users")
          .select("id")
          .eq("email", account.email)
          .single();

        if (user) {
          // Determine the account status
          let accountStatus = "connect_required";
          if (account.charges_enabled && account.payouts_enabled) {
            accountStatus = "active";
          } else if (account.charges_enabled && !account.payouts_enabled) {
            accountStatus = "charges_only";
          } else if (account.details_submitted) {
            accountStatus = "verification_required";
          } else if (
            account.requirements &&
            Object.keys(account.requirements.currently_due || {}).length > 0
          ) {
            accountStatus = "pending";
          }

          // Store the account in our database
          const { error: insertError } = await supabaseClient
            .from("connected_accounts")
            .insert({
              owner_id: user.id,
              stripe_account_id: account.id,
              account_status: accountStatus,
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              details_submitted: account.details_submitted,
              country: account.country,
              business_type: account.business_type,
              capabilities: account.capabilities || {},
              requirements: account.requirements || {},
              business_profile: account.business_profile || {},
              company: account.company || {},
              individual: account.individual || {},
            });

          if (insertError) {
            console.error(
              "Error storing new connected account from webhook:",
              insertError,
            );
          } else {
            console.log(
              "Successfully stored new connected account from webhook:",
              account.id,
            );
          }
        } else {
          console.log("No user found for account email:", account.email);
        }
      } else {
        console.log("No email found for account:", account.id);
      }
    } else {
      // Account exists, update its status
      console.log("Updating existing account:", account.id);

      // Determine custom status for our app
      let status: "active" | "pending" | "restricted" | "connect_required" =
        "pending";

      if (account.charges_enabled && account.payouts_enabled) {
        status = "active";
      } else if (!account.details_submitted) {
        // User hasn't completed onboarding
        status = "connect_required";
      } else {
        // Details submitted but requirements still due / disabled
        status = "restricted";
      }

      // Update connected account row
      await supabaseClient
        .from("connected_accounts")
        .update({
          account_status: status,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements || {},
          capabilities: account.capabilities || {},
          business_profile: account.business_profile || {},
          company: account.company || {},
          individual: account.individual || {},
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);
    }
  } catch (error) {
    console.error("Error handling account update:", error);
  }
}

async function handleTransferCreated(
  transfer: unknown,
  supabaseClient: unknown,
) {
  console.log("Transfer created:", transfer.id);

  try {
    // Update escrow transaction status (match on charge_id, not payment_intent_id)
    await supabaseClient
      .from("escrow_transactions")
      .update({
        escrow_status: "released",
        transfer_id: transfer.id,
        release_date: new Date().toISOString(),
      })
      .eq("stripe_charge_id", transfer.source_transaction);

    // Update booking status
    const { data: escrowTransaction } = await supabaseClient
      .from("escrow_transactions")
      .select("booking_id")
      .eq("stripe_charge_id", transfer.source_transaction)
      .single();

    if (escrowTransaction) {
      await supabaseClient
        .from("bookings")
        .update({
          payment_status: "completed",
          escrow_status: "released",
        })
        .eq("id", escrowTransaction.booking_id);
    }
  } catch (error) {
    console.error("Error handling transfer created:", error);
  }
}
