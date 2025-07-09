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
    const { transactionId, amount, reason } = await req.json()

    // Validate required fields
    if (!transactionId || !amount || !reason) {
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

    // Get transaction from database
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select(`
        *,
        booking:bookings(
          *,
                  owner:users!owner_id(*),
        renter:users!renter_id(*)
        )
      `)
      .eq('id', transactionId)
      .single()

    // Get escrow transaction if exists
    const { data: escrowTransaction } = await supabaseClient
      .from('escrow_transactions')
      .select('*')
      .eq('stripe_payment_intent_id', transaction?.stripe_payment_intent_id)
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

    // Verify user has access to this transaction (owner or renter)
    const isOwner = transaction.booking.owner_id === user.id
    const isRenter = transaction.booking.renter_id === user.id
    
    if (!isOwner && !isRenter) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access to transaction' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify transaction has a payment intent
    if (!transaction.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ error: 'No payment intent found for transaction' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify transaction is completed
    if (transaction.status !== 'completed') {
      return new Response(
        JSON.stringify({ error: 'Transaction is not completed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify refund amount doesn't exceed original amount
    if (amount > transaction.amount) {
      return new Response(
        JSON.stringify({ error: 'Refund amount exceeds original amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id,
      amount: amount * 100, // Convert RON to cents for Stripe
      reason: reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      metadata: {
        transaction_id: transactionId,
        booking_id: transaction.booking_id,
        refunded_by: user.id,
        refund_reason: reason,
      },
    })

    // Update transaction with refund details
    await supabaseClient
      .from('transactions')
      .update({
        status: 'refunded',
        refund_amount: amount,
        refund_reason: reason,
      })
      .eq('id', transactionId)

    // Update escrow transaction if exists
    if (escrowTransaction) {
      await supabaseClient
        .from('escrow_transactions')
        .update({
          escrow_status: 'refunded',
          refund_amount: amount,
          refund_reason: reason,
          refund_id: refund.id,
        })
        .eq('id', escrowTransaction.id)

      // Update booking escrow status
      await supabaseClient
        .from('bookings')
        .update({
          escrow_status: 'refunded',
        })
        .eq('id', transaction.booking_id)
    }

    return new Response(
      JSON.stringify({
        refundId: refund.id,
        amount: refund.amount,
        status: refund.status,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error processing refund:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 