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
    const { booking_id, release_type = 'automatic', deposit_to_owner = false } = await req.json()

    if (!booking_id || !release_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, release_type' }),
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

    // Get booking and escrow transaction details
    const { data: booking, error: bookingError } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        gear:gear(*),
        owner:profiles!bookings_owner_id_fkey(*)
      `)
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

    // Get owner's connected account
    const { data: connectedAccount } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', booking.owner_id)
      .single()

    if (!connectedAccount || !connectedAccount.payouts_enabled) {
      return new Response(
        JSON.stringify({ error: 'Owner account not ready for transfers' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    try {
      // Calculate amount for owner (include deposit if deposit_to_owner true)
      const baseAmount = escrowTransaction.rental_amount - escrowTransaction.platform_fee
      const ownerAmount = deposit_to_owner ? baseAmount + escrowTransaction.deposit_amount : baseAmount

      // Release rental amount to owner
      const transfer = await stripe.transfers.create({
        amount: ownerAmount,
        currency: 'ron',
        destination: connectedAccount.stripe_account_id,
        source_transaction: escrowTransaction.stripe_payment_intent_id,
        metadata: {
          booking_id: booking_id,
          transfer_type: 'rental_payment',
          release_type: release_type
        }
      })

      let refundId: string | null = null

      if (!deposit_to_owner) {
        // Return deposit to renter
        const refund = await stripe.refunds.create({
          payment_intent: escrowTransaction.stripe_payment_intent_id,
          amount: escrowTransaction.deposit_amount,
          metadata: {
            booking_id: booking_id,
            refund_type: 'deposit_return',
            release_type: release_type
          }
        })
        refundId = refund.id
      }

      // If auto_refund, set escrow_status accordingly
      const newEscrowStatus = release_type === 'auto_refund' ? 'auto_refunded' : 'released'

      // Update escrow transaction status
      await supabaseClient
        .from('escrow_transactions')
        .update({
          escrow_status: newEscrowStatus,
          transfer_id: transfer.id,
          refund_id: refundId,
          release_date: new Date().toISOString(),
          release_type: release_type
        })
        .eq('id', escrowTransaction.id)

      // Update booking status
      await supabaseClient
        .from('bookings')
        .update({
          status: release_type === 'auto_refund' ? 'cancelled' : 'completed',
          payment_status: 'completed',
          escrow_status: newEscrowStatus,
          completed_at: new Date().toISOString()
        })
        .eq('id', booking_id)

      return new Response(
        JSON.stringify({
          success: true,
          transfer_id: transfer.id,
          refund_id: refundId,
          rental_amount: ownerAmount,
          deposit_amount: escrowTransaction.deposit_amount,
          message: 'Escrow funds released successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError: any) {
      console.error('Stripe error during escrow release:', stripeError)
      
      // Update escrow transaction with error
      await supabaseClient
        .from('escrow_transactions')
        .update({
          escrow_status: 'release_failed',
          transfer_failure_reason: stripeError.message,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowTransaction.id)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to release escrow funds',
          details: stripeError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Escrow release error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process escrow release',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 