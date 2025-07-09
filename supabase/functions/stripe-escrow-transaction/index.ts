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

    console.log('Received bookingId:', bookingId)
    console.log('Received rentalAmount:', rentalAmount)
    console.log('Received depositAmount:', depositAmount)

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
        owner:users!owner_id(*)
      `)
      .eq('id', bookingId)
      .single()

    console.log('Booking query result:', booking)
    console.log('Booking query error:', bookingError)

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found', debug: { bookingId, bookingError, booking } }),
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

    const platformFee = Math.round(rentalAmount * 0.13) // 13% platform fee on rental amount only
    const totalAmount = rentalAmount + depositAmount + platformFee

    // Create checkout session for redirect flow (escrow)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ron',
            product_data: {
              name: `Închiriere ${booking.gear?.title || 'Echipament'}`,
              description: `Închiriere pentru perioada ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}`,
            },
            unit_amount: totalAmount * 100, // Convert to smallest currency unit (bani for RON)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin') || 'http://localhost:5173'}/payment-success?booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get('origin') || 'http://localhost:5173'}/payment-cancel?booking_id=${bookingId}`,
      metadata: {
        booking_id: bookingId,
        rental_amount: rentalAmount.toString(),
        deposit_amount: depositAmount.toString(),
        platform_fee: platformFee.toString(),
        gear_id: booking.gear_id,
        owner_id: booking.owner_id,
        renter_id: booking.renter_id,
        owner_stripe_account_id: connectedAccount.stripe_account_id,
        escrow: 'true'
      },
    })

    // Create escrow transaction record with pending status
    // The webhook will update it with the payment intent ID when payment completes
    const { error: escrowError } = await supabaseClient
      .from('escrow_transactions')
      .insert({
        booking_id: bookingId,
        stripe_payment_intent_id: null, // Will be updated by webhook when payment completes
        stripe_charge_id: null, // Will be updated by webhook when payment completes
        rental_amount: rentalAmount,
        deposit_amount: depositAmount,
        platform_fee: platformFee,
        escrow_status: 'pending',
        owner_stripe_account_id: connectedAccount.stripe_account_id,
        held_until: new Date(booking.end_date).toISOString(), // Hold until end of rental period
        released_at: null, // Will be set when escrow is released
        released_to: null, // Will be set to owner_id when escrow is released
        release_reason: null, // Will be set when escrow is released
        refund_amount: 0, // Default to 0, will be set if refund occurs
        refund_reason: null, // Will be set if refund occurs
        refund_id: null, // Will be set if refund occurs
        transfer_id: null, // Will be set when transfer is created
        transfer_failure_reason: null, // Will be set if transfer fails
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

    console.log('Escrow transaction created with pending status, will be updated by webhook when payment completes')

    // Update booking with session ID (payment intent will be updated when payment is completed)
    await supabaseClient
      .from('bookings')
      .update({ 
        payment_intent_id: session.id, // Store session ID instead of payment intent ID
        payment_status: 'pending'
      })
      .eq('id', bookingId)

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
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