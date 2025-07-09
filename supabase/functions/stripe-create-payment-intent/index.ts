import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@15.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the user from the JWT token
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const body = await req.json();
    console.log('Received body:', body);
    const { transactionId, bookingId, amount, currency, metadata } = body;

    // Validate required fields
    if ((!transactionId && !bookingId) || !amount || !currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount (must be positive)
    if (amount <= 0 || amount > 100000000) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get transaction from database to verify ownership
    let transaction, transactionError;
    if (transactionId) {
      ({ data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          booking:bookings(
            *,
            renter:users!renter_id(*)
          )
        `)
        .eq('id', transactionId)
        .single());
    } else {
      ({ data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select(`
          *,
          booking:bookings(
            *,
            renter:users!renter_id(*)
          )
        `)
        .eq('booking_id', bookingId)
        .single());
      // If not found, create it
      if (transactionError || !transaction) {
        // Get booking details
        const { data: booking, error: bookingError } = await supabaseClient
          .from('bookings')
          .select('id, renter_id, owner_id, rental_amount, deposit_amount')
          .eq('id', bookingId)
          .single();
        if (bookingError || !booking) {
          return new Response(
            JSON.stringify({ error: 'Booking not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        // Calculate platform fee and total amount
        const platformFee = Math.round(booking.rental_amount * 0.13);
        const totalAmount = booking.rental_amount + booking.deposit_amount + platformFee;
        // Insert transaction
        const { data: newTransaction, error: insertError } = await supabaseClient
          .from('transactions')
          .insert({
            booking_id: booking.id,
            amount: totalAmount,
            platform_fee: platformFee,
            deposit_amount: booking.deposit_amount,
            rental_amount: booking.rental_amount,
            status: 'pending',
            currency: 'RON',
          })
          .select(`*, booking:bookings(*, renter:users!renter_id(*))`)
          .single();
        if (insertError || !newTransaction) {
          return new Response(
            JSON.stringify({ error: 'Failed to create transaction' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        transaction = newTransaction;
      }
    }

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify user owns this transaction
    if (transaction.booking.renter_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to transaction' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify transaction amount matches
    if (transaction.amount !== amount) {
      return new Response(
        JSON.stringify({ error: 'Amount mismatch' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Stripe Checkout Session instead of PaymentIntent
    let session;
    try {
      // Get gear information for better product description
      const { data: gearInfo } = await supabaseClient
        .from('gear')
        .select('title')
        .eq('id', transaction.booking.gear_id)
        .single();

      const gearTitle = metadata?.gearTitle || gearInfo?.title || 'Echipament';
      const startDate = metadata?.startDate || transaction.booking.start_date;
      const endDate = metadata?.endDate || transaction.booking.end_date;
      
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Inchiriere: ${gearTitle}`,
                description: `Perioada: ${startDate} - ${endDate}`,
              },
              unit_amount: amount * 100, // Convert RON to cents for Stripe
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${Deno.env.get('SUCCESS_URL') || 'https://localhost:8080/payment-success'}?session_id={CHECKOUT_SESSION_ID}&booking_id=${transaction.booking_id}`,
        cancel_url: `${Deno.env.get('CANCEL_URL') || 'https://localhost:8080/payment-cancel'}?booking_id=${transaction.booking_id}`,
        customer_email: transaction.booking.renter?.email,
        metadata: {
          transaction_id: transactionId,
          booking_id: transaction.booking_id,
          user_id: user.id,
          rental_amount: transaction.rental_amount.toString(),
          deposit_amount: transaction.deposit_amount.toString(),
          platform_fee: transaction.platform_fee.toString(),
          owner_stripe_account_id: transaction.booking.owner_id, // Will be updated by webhook to actual Stripe account ID
          gearTitle: gearTitle,
          startDate: startDate,
          endDate: endDate,
          ...metadata,
        },
      });
    } catch (stripeError) {
      console.error('Stripe session creation failed:', stripeError);
      return new Response(
        JSON.stringify({ error: 'Stripe session creation failed', details: stripeError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!session || !session.url) {
      console.error('Stripe session was not created or missing URL:', session);
      return new Response(
        JSON.stringify({ error: 'Stripe session was not created or missing URL' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update transaction with session ID
    await supabaseClient
      .from('transactions')
      .update({
        stripe_payment_intent_id: session.payment_intent,
        status: 'processing',
      })
      .eq('id', transaction.id);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error creating payment intent:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message || 'Unknown error',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 