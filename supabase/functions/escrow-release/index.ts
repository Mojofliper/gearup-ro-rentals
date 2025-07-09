// @ts-ignore: Deno Deploy/Supabase Edge Functions remote import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno Deploy/Supabase Edge Functions remote import
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore: Deno Deploy/Supabase Edge Functions remote import
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
    // Validate content type
    const contentType = req.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      return new Response(
        JSON.stringify({ error: 'Content-Type must be application/json' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body with proper error handling
    let requestBody
    try {
      const bodyText = await req.text()
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'Request body is empty' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
      requestBody = JSON.parse(bodyText)
    } catch (parseError) {
      console.error('JSON parsing error:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { booking_id, release_type, deposit_to_owner = false } = requestBody

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
        owner:users!bookings_owner_id_fkey(*)
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

    // Validate amounts
    if (!escrowTransaction.rental_amount || escrowTransaction.rental_amount <= 0) {
      console.error('Invalid rental amount:', escrowTransaction.rental_amount)
      return new Response(
        JSON.stringify({ error: 'Invalid rental amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!escrowTransaction.deposit_amount || escrowTransaction.deposit_amount < 0) {
      console.error('Invalid deposit amount:', escrowTransaction.deposit_amount)
      return new Response(
        JSON.stringify({ error: 'Invalid deposit amount' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Escrow transaction details:', {
      rental_amount: escrowTransaction.rental_amount,
      deposit_amount: escrowTransaction.deposit_amount,
      platform_fee: escrowTransaction.platform_fee,
      stripe_payment_intent_id: escrowTransaction.stripe_payment_intent_id,
      escrow_status: escrowTransaction.escrow_status
    })

    // Get owner's connected account
    const { data: connectedAccount } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', booking.owner_id)
      .single()

    if (!connectedAccount) {
      console.error('Owner connected account not found for owner_id:', booking.owner_id)
      return new Response(
        JSON.stringify({ error: 'Owner connected account not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check actual Stripe account status instead of relying on database
    try {
      const stripeAccount = await stripe.accounts.retrieve(connectedAccount.stripe_account_id)
      console.log('Retrieved Stripe account status:', {
        id: stripeAccount.id,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted
      })

      if (!stripeAccount.charges_enabled) {
        console.error('Stripe account not ready for transfers:', stripeAccount)
        return new Response(
          JSON.stringify({ error: 'Owner account not ready for transfers' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Update our database with the current Stripe account status
      await supabaseClient
        .from('connected_accounts')
        .update({
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          account_status: stripeAccount.charges_enabled ? 'active' : 'pending',
          requirements: stripeAccount.requirements || {},
          capabilities: stripeAccount.capabilities || {},
          business_profile: stripeAccount.business_profile || {},
          company: stripeAccount.company || {},
          individual: stripeAccount.individual || {}
        })
        .eq('stripe_account_id', connectedAccount.stripe_account_id)

    } catch (stripeError) {
      console.error('Error retrieving Stripe account:', stripeError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify Stripe account status' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Connected account found:', {
      owner_id: booking.owner_id,
      stripe_account_id: connectedAccount.stripe_account_id,
      charges_enabled: connectedAccount.charges_enabled,
      payouts_enabled: connectedAccount.payouts_enabled
    })

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
            
            try {
              // Get the payment intent to find the charge ID
              const paymentIntent = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
              const chargeId = paymentIntent.latest_charge
              
              if (!chargeId) {
                throw new Error('No charge found in payment intent')
              }
              
              // Create a transfer to the connected account using the charge as source
              transfer = await stripe.transfers.create({
                amount: Math.round(escrowTransaction.rental_amount * 100), // Convert RON to cents for Stripe
                currency: 'ron',
                destination: connectedAccount.stripe_account_id,
                source_transaction: chargeId,
                description: `Rental payment for booking ${booking_id}`,
                metadata: {
                  booking_id: booking_id,
                  transfer_type: 'rental_payment',
                  release_type: release_type
                }
              })
              transferId = transfer.id
              console.log('Rental transfer created:', JSON.stringify(transfer, null, 2))

              // Update escrow transaction
              await supabaseClient
                .from('escrow_transactions')
                .update({
                  rental_released_at: new Date().toISOString(),
                  rental_transfer_id: transfer.id,
                  transfer_id: transfer.id // Always set transfer_id for webhook compatibility
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
                  type: 'payment_received',
                  data: { 
                    bookingId: booking_id, 
                    amount: escrowTransaction.rental_amount,
                    gearTitle: booking.gear.title
                  },
                  is_read: false
                })
            } catch (transferError) {
              console.error('Error creating rental transfer:', JSON.stringify(transferError, null, 2))
              throw new Error(`Failed to create rental transfer: ${transferError.message}`)
            }
          }

          // Release deposit back to renter (if not already returned)
          if (!booking.deposit_returned) {
            console.log('Returning deposit to renter:', escrowTransaction.deposit_amount)
            
            try {
              depositRefund = await stripe.refunds.create({
                payment_intent: escrowTransaction.stripe_payment_intent_id,
                amount: Math.round(escrowTransaction.deposit_amount * 100), // Convert RON to cents for Stripe
                metadata: {
                  booking_id: booking_id,
                  refund_type: 'deposit_return',
                  release_type: release_type
                }
              })
              refundId = depositRefund.id
              console.log('Deposit refund created:', JSON.stringify(depositRefund, null, 2))

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
                  type: 'payment_received',
                  data: { 
                    bookingId: booking_id, 
                    amount: escrowTransaction.deposit_amount,
                    gearTitle: booking.gear.title
                  },
                  is_read: false
                })
            } catch (refundError) {
              console.error('Error creating deposit refund:', JSON.stringify(refundError, null, 2))
              throw new Error(`Failed to create deposit refund: ${refundError.message}`)
            }
          }
          
          // Final update: Set booking status to completed after both rental and deposit are processed
          await supabaseClient
            .from('bookings')
            .update({
              status: 'completed'
            })
            .eq('id', booking_id)
          break

        case 'completed':
          console.log('Processing completed release (deposit only)')
          // Release deposit back to renter
          if (!booking.deposit_returned) {
            console.log('Returning deposit to renter:', escrowTransaction.deposit_amount)
            try {
              depositRefund = await stripe.refunds.create({
                payment_intent: escrowTransaction.stripe_payment_intent_id,
                amount: Math.round(escrowTransaction.deposit_amount * 100), // Convert RON to cents for Stripe
                metadata: {
                  booking_id: booking_id,
                  refund_type: 'deposit_return',
                  release_type: release_type
                }
              })
              refundId = depositRefund.id
              console.log('Deposit refund created:', JSON.stringify(depositRefund, null, 2))

              // Update escrow transaction
              await supabaseClient
                .from('escrow_transactions')
                .update({
                  deposit_returned_at: new Date().toISOString(),
                  deposit_refund_id: refundId,
                  escrow_status: 'released',
                  release_reason: 'Deposit returned to renter'
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
                  type: 'payment_received',
                  data: { 
                    bookingId: booking_id, 
                    amount: escrowTransaction.deposit_amount,
                    gearTitle: booking.gear.title
                  },
                  is_read: false
                })
            } catch (refundError) {
              console.error('Error creating deposit refund:', JSON.stringify(refundError, null, 2))
              throw new Error(`Failed to create deposit refund: ${refundError.message}`)
            }
          }
          break

        case 'claim_owner':
          console.log('Processing claim_owner release (owner wins)')
          // Owner wins claim - release rental amount and deposit to owner (minus platform fee)
          
          try {
            // Get the payment intent to find the charge ID
            const paymentIntent = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
            const chargeId = paymentIntent.latest_charge
            
            if (!chargeId) {
              throw new Error('No charge found in payment intent')
            }
            
            // Calculate total amount to transfer to owner (rental + deposit - platform fee)
            const totalAmountToOwner = escrowTransaction.rental_amount + escrowTransaction.deposit_amount - (escrowTransaction.platform_fee || 0)
            
            transfer = await stripe.transfers.create({
              amount: Math.round(totalAmountToOwner * 100), // Convert RON to cents for Stripe
              currency: 'ron',
              destination: connectedAccount.stripe_account_id,
              source_transaction: chargeId,
              description: `Owner claim win for booking ${booking_id}`,
              metadata: {
                booking_id: booking_id,
                transfer_type: 'claim_owner_win',
                release_type: release_type,
                rental_amount: escrowTransaction.rental_amount,
                deposit_amount: escrowTransaction.deposit_amount,
                platform_fee: escrowTransaction.platform_fee || 0
              }
            })
            transferId = transfer.id;
            console.log('Owner claim transfer created:', JSON.stringify(transfer, null, 2))

            // Update escrow transaction
            await supabaseClient
              .from('escrow_transactions')
              .update({
                escrow_status: 'released',
                released_at: new Date().toISOString(),
                transfer_id: transfer.id,
                release_reason: 'Owner claim approved - rental and deposit transferred to owner'
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
              
            // Send notification to owner about claim win
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: booking.owner_id,
                title: 'Cerere aprobată',
                message: `Cererea ta pentru "${booking.gear.title}" a fost aprobată. Ai primit plata și depozitul.`,
                type: 'claim_approved',
                data: { 
                  bookingId: booking_id, 
                  amount: totalAmountToOwner,
                  gearTitle: booking.gear.title
                },
                is_read: false
              })
              
            // Send notification to renter about claim loss
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: booking.renter_id,
                title: 'Cerere respinsă',
                message: `Cererea pentru "${booking.gear.title}" a fost respinsă. Depozitul nu va fi returnat.`,
                type: 'claim_denied',
                data: { 
                  bookingId: booking_id, 
                  gearTitle: booking.gear.title
                },
                is_read: false
              })
          } catch (transferError) {
            console.error('Error creating owner claim transfer:', JSON.stringify(transferError, null, 2))
            throw new Error(`Failed to create owner claim transfer: ${transferError.message}`)
          }
          break

        case 'claim_denied':
          console.log('Processing claim_denied release (owner loses)')
          // Owner loses claim - return deposit to renter, rental amount to owner (minus platform fee)
          
          try {
            // Get the payment intent to find the charge ID
            const paymentIntent2 = await stripe.paymentIntents.retrieve(escrowTransaction.stripe_payment_intent_id)
            const chargeId2 = paymentIntent2.latest_charge
            
            if (!chargeId2) {
              throw new Error('No charge found in payment intent')
            }
            
            // Calculate rental amount to owner (rental - platform fee)
            const rentalAmountToOwner = escrowTransaction.rental_amount - (escrowTransaction.platform_fee || 0)
            
            rentalTransfer = await stripe.transfers.create({
              amount: Math.round(rentalAmountToOwner * 100), // Convert RON to cents for Stripe
              currency: 'ron',
              destination: connectedAccount.stripe_account_id,
              source_transaction: chargeId2,
              description: `Rental payment for booking ${booking_id} (claim denied)`,
              metadata: {
                booking_id: booking_id,
                transfer_type: 'rental_payment',
                release_type: release_type,
                platform_fee: escrowTransaction.platform_fee || 0
              }
            })

            depositRefund = await stripe.refunds.create({
              payment_intent: escrowTransaction.stripe_payment_intent_id,
              amount: Math.round(escrowTransaction.deposit_amount * 100), // Convert RON to cents for Stripe
              metadata: {
                booking_id: booking_id,
                refund_type: 'deposit_return',
                release_type: release_type
              }
            })

            transferId = rentalTransfer.id;
            refundId = depositRefund.id;
            console.log('Claim denied transfers created - rental:', JSON.stringify(rentalTransfer, null, 2), 'deposit refund:', JSON.stringify(depositRefund, null, 2))

            // Update escrow transaction
            await supabaseClient
              .from('escrow_transactions')
              .update({
                escrow_status: 'released',
                released_at: new Date().toISOString(),
                transfer_id: rentalTransfer.id,
                refund_id: depositRefund.id,
                release_reason: 'Owner claim denied - rental to owner, deposit returned to renter'
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
              
            // Send notification to owner about claim loss
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: booking.owner_id,
                title: 'Cerere respinsă',
                message: `Cererea pentru "${booking.gear.title}" a fost respinsă. Ai primit doar plata pentru închiriere.`,
                type: 'claim_denied',
                data: { 
                  bookingId: booking_id, 
                  amount: rentalAmountToOwner,
                  gearTitle: booking.gear.title
                },
                is_read: false
              })
              
            // Send notification to renter about claim win
            await supabaseClient
              .from('notifications')
              .insert({
                user_id: booking.renter_id,
                title: 'Cerere aprobată',
                message: `Cererea ta pentru "${booking.gear.title}" a fost aprobată. Depozitul a fost returnat.`,
                type: 'claim_approved',
                data: { 
                  bookingId: booking_id, 
                  amount: escrowTransaction.deposit_amount,
                  gearTitle: booking.gear.title
                },
                is_read: false
              })
          } catch (error) {
            console.error('Error creating claim denied transfers:', JSON.stringify(error, null, 2))
            throw new Error(`Failed to create claim denied transfers: ${error.message}`)
          }
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