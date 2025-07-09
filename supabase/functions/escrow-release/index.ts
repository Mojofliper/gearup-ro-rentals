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
    const { booking_id, release_type, deposit_to_owner = false } = await req.json()

    if (!booking_id || !release_type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: booking_id, release_type' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting escrow release for booking ${booking_id} with type ${release_type}`)

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
      console.error('Booking not found:', bookingError)
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
      console.error('Escrow transaction not found:', escrowError)
      return new Response(
        JSON.stringify({ error: 'Escrow transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate escrow status
    if (escrowTransaction.escrow_status !== 'held') {
      console.error('Escrow is not in held status:', escrowTransaction.escrow_status)
      return new Response(
        JSON.stringify({ error: 'Escrow is not in held status' }),
        { 
          status: 400, 
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
      console.error('Owner account not ready for transfers:', connectedAccount)
      return new Response(
        JSON.stringify({ error: 'Owner account not ready for transfers' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Before the switch statement, declare variables used in case blocks
    let transfer;
    let rentalTransfer;
    let depositRefund;
    let refundId;
    let transferId;

    try {
      // Handle different release types
      switch (release_type) {
        case 'return_confirmed':
          console.log('Processing return_confirmed release - releasing both rental and deposit')
          
          // Release rental amount to owner (if not already released)
          if (!booking.rental_amount_released) {
            console.log('Releasing rental amount to owner:', escrowTransaction.rental_amount)
            
            // Get the payment intent to find the charge ID
            const paymentIntent = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
            const chargeId = paymentIntent.latest_charge
            
            if (!chargeId) {
              throw new Error('No charge found in payment intent')
            }
            
            // Release rental amount to owner
            transfer = await stripe.transfers.create({
              amount: escrowTransaction.rental_amount * 100, // Convert RON to cents for Stripe
              currency: 'ron',
              destination: connectedAccount.stripe_account_id,
              source_transaction: chargeId,
              metadata: {
                booking_id: booking_id,
                transfer_type: 'rental_payment',
                release_type: release_type
              }
            })
            transferId = transfer.id
            console.log('Rental transfer created:', transferId)

            // Update escrow transaction
            await supabaseClient
              .from('escrow_transactions')
              .update({
                rental_released_at: new Date().toISOString(),
                rental_transfer_id: transfer.id
              })
              .eq('id', escrowTransaction.id)

            // Update booking
            await supabaseClient
              .from('bookings')
              .update({
                rental_amount_released: true
              })
              .eq('id', booking_id)
            
            // Send notification to owner about rental payment
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: booking.owner_id,
                title: 'Plată închiriere primită',
                message: `Ai primit plata pentru închirierea "${booking.gear.title}"`,
                type: 'payment',
                data: { 
                  bookingId: booking_id, 
                  amount: escrowTransaction.rental_amount,
                  gearTitle: booking.gear.title
                },
                is_read: false
              })
          }

          // Release deposit back to renter (if not already returned)
          if (!booking.deposit_returned) {
            console.log('Returning deposit to renter:', escrowTransaction.deposit_amount)
            
            try {
              depositRefund = await stripe.refunds.create({
                payment_intent: escrowTransaction.stripe_payment_intent_id,
                amount: escrowTransaction.deposit_amount * 100, // Convert RON to cents for Stripe
                metadata: {
                  booking_id: booking_id,
                  refund_type: 'deposit_return',
                  release_type: release_type
                }
              })
              refundId = depositRefund.id
              console.log('Deposit refund created:', refundId)

              // Update escrow transaction
              await supabaseClient
                .from('escrow_transactions')
                .update({
                  deposit_returned_at: new Date().toISOString(),
                  deposit_refund_id: refundId,
                  escrow_status: 'released'
                })
                .eq('id', escrowTransaction.id)

              // Update booking
              await supabaseClient
                .from('bookings')
                .update({
                  deposit_returned: true,
                  escrow_release_date: new Date().toISOString()
                })
                .eq('id', booking_id)
              
              // Send notification to renter about deposit return
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: booking.renter_id,
                  title: 'Depozit returnat',
                  message: `Depozitul pentru "${booking.gear.title}" a fost returnat`,
                  type: 'payment',
                  data: { 
                    bookingId: booking_id, 
                    amount: escrowTransaction.deposit_amount,
                    gearTitle: booking.gear.title
                  },
                  is_read: false
                })
            } catch (refundError) {
              console.error('Error creating deposit refund:', refundError)
              throw new Error(`Failed to create deposit refund: ${refundError.message}`)
            }
          }
          break

        case 'completed':
          console.log('Processing completed release (deposit only)')
          // Release deposit back to renter
          if (!booking.deposit_returned) {
            console.log('Returning deposit to renter:', escrowTransaction.deposit_amount)
            try {
              depositRefund = await stripe.refunds.create({
                payment_intent: escrowTransaction.stripe_payment_intent_id,
                amount: escrowTransaction.deposit_amount * 100, // Convert RON to cents for Stripe
                metadata: {
                  booking_id: booking_id,
                  refund_type: 'deposit_return',
                  release_type: release_type
                }
              })
              refundId = depositRefund.id
              console.log('Deposit refund created:', refundId)

              // Update escrow transaction
              await supabaseClient
                .from('escrow_transactions')
                .update({
                  deposit_returned_at: new Date().toISOString(),
                  deposit_refund_id: refundId,
                  escrow_status: 'released'
                })
                .eq('id', escrowTransaction.id)

              // Update booking
              await supabaseClient
                .from('bookings')
                .update({
                  deposit_returned: true,
                  escrow_release_date: new Date().toISOString()
                })
                .eq('id', booking_id)
              
              // Send notification to renter about deposit return
              await supabaseClient
                .from('notifications')
                .insert({
                  user_id: booking.renter_id,
                  title: 'Depozit returnat',
                  message: `Depozitul pentru "${booking.gear.title}" a fost returnat`,
                  type: 'payment',
                  data: { 
                    bookingId: booking_id, 
                    amount: escrowTransaction.deposit_amount,
                    gearTitle: booking.gear.title
                  },
                  is_read: false
                })
            } catch (refundError) {
              console.error('Error creating deposit refund:', refundError)
              throw new Error(`Failed to create deposit refund: ${refundError.message}`)
            }
          }
          break

        case 'claim_owner':
          console.log('Processing claim_owner release (owner wins)')
          // Owner wins claim - release rental amount and deposit to owner
          
          // Get the payment intent to find the charge ID
          const paymentIntent = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
          const chargeId = paymentIntent.latest_charge
          
          if (!chargeId) {
            throw new Error('No charge found in payment intent')
          }
          
          transfer = await stripe.transfers.create({
            amount: (escrowTransaction.rental_amount + escrowTransaction.deposit_amount) * 100, // Convert RON to cents for Stripe
            currency: 'ron',
            destination: connectedAccount.stripe_account_id,
            source_transaction: chargeId,
            metadata: {
              booking_id: booking_id,
              transfer_type: 'claim_owner_win',
              release_type: release_type
            }
          })
          transferId = transfer.id;
          console.log('Owner claim transfer created:', transferId)

          // Update escrow transaction
          await supabaseClient
            .from('escrow_transactions')
            .update({
              escrow_status: 'released',
              rental_released_at: new Date().toISOString(),
              deposit_returned_at: new Date().toISOString(),
              rental_transfer_id: transfer.id,
              release_reason: 'Owner claim approved'
            })
            .eq('id', escrowTransaction.id)

          // Update booking
          await supabaseClient
            .from('bookings')
            .update({
              status: 'completed',
              rental_amount_released: true,
              deposit_returned: true,
              escrow_release_date: new Date().toISOString()
            })
            .eq('id', booking_id)
          break

        case 'claim_denied':
          console.log('Processing claim_denied release (owner loses)')
          // Owner loses claim - return deposit to renter, rental amount to owner
          
          // Get the payment intent to find the charge ID
          const paymentIntent2 = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
          const chargeId2 = paymentIntent2.latest_charge
          
          if (!chargeId2) {
            throw new Error('No charge found in payment intent')
          }
          
          rentalTransfer = await stripe.transfers.create({
            amount: escrowTransaction.rental_amount * 100, // Convert RON to cents for Stripe
            currency: 'ron',
            destination: connectedAccount.stripe_account_id,
            source_transaction: chargeId2,
            metadata: {
              booking_id: booking_id,
              transfer_type: 'rental_payment',
              release_type: release_type
            }
          })

          depositRefund = await stripe.refunds.create({
            payment_intent: escrowTransaction.stripe_payment_intent_id,
            amount: escrowTransaction.deposit_amount * 100, // Convert RON to cents for Stripe
            metadata: {
              booking_id: booking_id,
              refund_type: 'deposit_return',
              release_type: release_type
            }
          })

          transferId = rentalTransfer.id;
          refundId = depositRefund.id;
          console.log('Claim denied transfers created - rental:', transferId, 'deposit refund:', refundId)

          // Update escrow transaction
          await supabaseClient
            .from('escrow_transactions')
            .update({
              escrow_status: 'released',
              rental_released_at: new Date().toISOString(),
              deposit_returned_at: new Date().toISOString(),
              rental_transfer_id: rentalTransfer.id,
              deposit_refund_id: depositRefund.id,
              release_reason: 'Owner claim denied'
            })
            .eq('id', escrowTransaction.id)

          // Update booking
          await supabaseClient
            .from('bookings')
            .update({
              status: 'completed',
              rental_amount_released: true,
              deposit_returned: true,
              escrow_release_date: new Date().toISOString()
            })
            .eq('id', booking_id)
          break

        default:
          console.error('Invalid release type:', release_type)
          return new Response(
            JSON.stringify({ error: 'Invalid release type' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
      }

      console.log(`Escrow release completed successfully for booking ${booking_id}`)
      return new Response(
        JSON.stringify({
          success: true,
          booking_id: booking_id,
          release_type: release_type,
          transfer_id: transferId,
          refund_id: refundId,
          message: 'Escrow funds released successfully'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError) {
      console.error('Stripe error during escrow release:', stripeError)
      
      // Update escrow transaction with failure
      await supabaseClient
        .from('escrow_transactions')
        .update({
          transfer_failure_reason: stripeError instanceof Error ? stripeError.message : 'Unknown error'
        })
        .eq('id', escrowTransaction.id)

      return new Response(
        JSON.stringify({ 
          error: 'Failed to process escrow release',
          details: stripeError instanceof Error ? stripeError.message : 'Unknown error'
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
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 