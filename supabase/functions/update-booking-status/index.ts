import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { bookingId, status, pickupConfirmedAt, handoverCompletedAt } = await req.json()

    if (!bookingId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, status' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the booking to verify ownership
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, owner_id, renter_id, status')
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

    // Check if user is authorized to update this booking
    if (booking.owner_id !== user.id && booking.renter_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized to update this booking' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate status transitions
    const validTransitions = {
      'confirmed': ['picked_up', 'cancelled'],
      'picked_up': ['active', 'cancelled'],
      'active': ['completed', 'cancelled'],
      'completed': [] // No further transitions
    }

    const currentStatus = booking.status
    const allowedTransitions = validTransitions[currentStatus] || []
    
    if (!allowedTransitions.includes(status)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid status transition from ${currentStatus} to ${status}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Prepare update data
    const updateData = { status }
    
    if (status === 'picked_up' && pickupConfirmedAt) {
      updateData.pickup_confirmed_at = pickupConfirmedAt
    }
    
    if (status === 'active' && handoverCompletedAt) {
      updateData.handover_completed_at = handoverCompletedAt
    }

    // Update the booking
    const { data: updatedBooking, error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating booking:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update booking' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // If status is being set to 'picked_up', trigger escrow release for rental amount
    if (status === 'picked_up') {
      try {
        // Get the escrow transaction
        const { data: escrowTransaction } = await supabase
          .from('escrow_transactions')
          .select('id, stripe_payment_intent_id, rental_amount, deposit_amount')
          .eq('booking_id', bookingId)
          .eq('transaction_type', 'escrow_hold')
          .single()

        if (escrowTransaction) {
          // Release rental amount to owner (deposit remains in escrow)
          const { data: releaseTransaction } = await supabase
            .from('escrow_transactions')
            .insert({
              booking_id: bookingId,
              transaction_type: 'rental_release',
              amount: escrowTransaction.rental_amount,
              stripe_payment_intent_id: escrowTransaction.stripe_payment_intent_id,
              status: 'pending'
            })
            .select()
            .single()

          // TODO: Call Stripe API to release funds to owner
          // This would require additional Stripe integration
          console.log('Rental amount should be released to owner:', escrowTransaction.rental_amount)
        }
      } catch (escrowError) {
        console.error('Error handling escrow release:', escrowError)
        // Don't fail the booking update if escrow release fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking: updatedBooking 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in update-booking-status:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 