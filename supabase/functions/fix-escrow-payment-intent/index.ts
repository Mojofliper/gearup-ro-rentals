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
    const { booking_id } = await req.json()

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: booking_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get booking details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get escrow transaction
    const { data: escrowTransaction, error: escrowError } = await supabaseClient
      .from('escrow_transactions')
      .select('*')
      .eq('booking_id', booking_id)
      .single()

    if (escrowError || !escrowTransaction) {
      return new Response(
        JSON.stringify({ error: 'Escrow transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if payment_intent_id is already set
    if (escrowTransaction.stripe_payment_intent_id) {
      return new Response(
        JSON.stringify({ 
          message: 'Payment intent ID already set',
          payment_intent_id: escrowTransaction.stripe_payment_intent_id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get session ID from booking
    const sessionId = booking.payment_intent_id

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'No session ID found in booking' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    try {
      // Retrieve the session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      
      if (!session.payment_intent) {
        return new Response(
          JSON.stringify({ error: 'No payment intent found in session' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update escrow transaction with payment intent ID
      const { error: updateError } = await supabaseClient
        .from('escrow_transactions')
        .update({
          stripe_payment_intent_id: session.payment_intent,
          escrow_status: 'held', // Update status to held since payment is completed
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransaction.id)

      if (updateError) {
        console.error('Error updating escrow transaction:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update escrow transaction' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Escrow transaction updated successfully',
          payment_intent_id: session.payment_intent,
          session_id: sessionId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError: unknown) {
      console.error('Stripe error:', stripeError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to retrieve session from Stripe',
          details: stripeError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Fix escrow payment intent error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fix escrow payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 