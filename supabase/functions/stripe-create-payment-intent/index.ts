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
    const { transactionId, amount, currency, metadata } = await req.json()

    // Validate required fields
    if (!transactionId || !amount || !currency) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount (must be positive and in cents)
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
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          *,
          renter:profiles!bookings_renter_id_fkey(*)
        )
      `)
      .eq('id', transactionId)
      .single()

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
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency,
              product_data: {
                name: `Rental for booking ${transaction.booking_id}`,
                description: `Gear rental payment`,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${Deno.env.get('SUCCESS_URL') || 'https://your-app.com/payment-success'}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${Deno.env.get('CANCEL_URL') || 'https://your-app.com/payment-cancel'}`,
        customer_email: transaction.booking.renter?.email,
        metadata: {
          transaction_id: transactionId,
          booking_id: transaction.booking_id,
          user_id: user.id,
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
      .eq('id', transactionId);

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