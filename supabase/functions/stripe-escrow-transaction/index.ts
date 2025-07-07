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
    const { bookingId, rentalAmount, depositAmount } = await req.json()

    if (!bookingId || !rentalAmount || depositAmount === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, rentalAmount, depositAmount' }),
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

    // Get booking details with owner information
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        gear:gear(*),
        owner:profiles!bookings_owner_id_fkey(*)
      `)
      .eq('id', bookingId)
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

    // Get owner's connected account
    const { data: connectedAccount } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', booking.owner_id)
      .single()

    if (!connectedAccount || !connectedAccount.charges_enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'Owner account not ready for payments',
          needsOnboarding: !connectedAccount,
          accountStatus: connectedAccount?.account_status 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const totalAmount = rentalAmount + depositAmount
    const platformFee = Math.round(totalAmount * 0.13) // 13% platform fee

    // Create payment intent WITHOUT transfer_data so funds stay on the platform balance (escrow)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'ron',
      // Funds stay with platform; we will transfer rental later and keep platform fee
      metadata: {
        booking_id: bookingId,
        rental_amount: rentalAmount,
        deposit_amount: depositAmount,
        platform_fee: platformFee,
        gear_id: booking.gear_id,
        owner_id: booking.owner_id,
        renter_id: booking.renter_id,
        escrow: 'true'
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    // Create escrow transaction record
    const { error: escrowError } = await supabaseClient
      .from('escrow_transactions')
      .insert({
        booking_id: bookingId,
        stripe_payment_intent_id: paymentIntent.id,
        rental_amount: rentalAmount,
        deposit_amount: depositAmount,
        platform_fee: platformFee,
        escrow_status: 'pending',
        owner_stripe_account_id: connectedAccount.stripe_account_id,
      })

    if (escrowError) {
      console.error('Error creating escrow transaction:', escrowError)
      return new Response(
        JSON.stringify({ error: 'Failed to create escrow transaction' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update booking with payment intent
    await supabaseClient
      .from('bookings')
      .update({ 
        payment_intent_id: paymentIntent.id,
        payment_status: 'pending'
      })
      .eq('id', bookingId)

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: totalAmount,
        platformFee: platformFee,
        escrowStatus: 'pending',
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Escrow transaction error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create escrow transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 