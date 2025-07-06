import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@15.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, endpointSecret)

    // Create Supabase client with service role key for webhook operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object, supabaseClient)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object, supabaseClient)
        break
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, supabaseClient)
        break
      case 'account.updated':
        await handleAccountUpdated(event.data.object, supabaseClient)
        break
      case 'transfer.created':
        await handleTransferCreated(event.data.object, supabaseClient)
        break
      case 'transfer.failed':
        await handleTransferFailed(event.data.object, supabaseClient)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 400 }
    )
  }
})

async function handlePaymentIntentSucceeded(paymentIntent: any, supabaseClient: any) {
  console.log('Payment succeeded:', paymentIntent.id)

  try {
    // Update transaction status
    const { error } = await supabaseClient
      .from('transactions')
      .update({
        status: 'completed',
        stripe_charge_id: paymentIntent.latest_charge,
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Error updating transaction:', error)
    }

    // Update booking payment status
    const { data: transaction } = await supabaseClient
      .from('transactions')
      .select('booking_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (transaction) {
      await supabaseClient
        .from('bookings')
        .update({ payment_status: 'paid' })
        .eq('id', transaction.booking_id)
    }

  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: any, supabaseClient: any) {
  console.log('Payment failed:', paymentIntent.id)

  try {
    // Update transaction status
    const { error } = await supabaseClient
      .from('transactions')
      .update({
        status: 'failed',
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Error updating transaction:', error)
    }

    // Update booking payment status
    const { data: transaction } = await supabaseClient
      .from('transactions')
      .select('booking_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (transaction) {
      await supabaseClient
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', transaction.booking_id)
    }

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleChargeRefunded(charge: any, supabaseClient: any) {
  console.log('Charge refunded:', charge.id)

  try {
    // Find transaction by charge ID
    const { data: transaction } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('stripe_charge_id', charge.id)
      .single()

    if (transaction) {
      // Update transaction with refund details
      await supabaseClient
        .from('transactions')
        .update({
          status: 'refunded',
          refund_amount: charge.amount_refunded,
          refund_reason: 'Stripe refund',
        })
        .eq('id', transaction.id)

      // Update booking payment status
      await supabaseClient
        .from('bookings')
        .update({ payment_status: 'refunded' })
        .eq('id', transaction.booking_id)
    }

  } catch (error) {
    console.error('Error handling charge refund:', error)
  }
}

async function handleAccountUpdated(account: any, supabaseClient: any) {
  console.log('Account updated:', account.id)

  try {
    // Update connected account status
    await supabaseClient
      .from('connected_accounts')
      .update({
        account_status: account.charges_enabled ? 'active' : 'pending',
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_account_id', account.id)

  } catch (error) {
    console.error('Error handling account update:', error)
  }
}

async function handleTransferCreated(transfer: any, supabaseClient: any) {
  console.log('Transfer created:', transfer.id)

  try {
    // Update escrow transaction status
    await supabaseClient
      .from('escrow_transactions')
      .update({
        escrow_status: 'released',
        transfer_id: transfer.id,
        release_date: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', transfer.source_transaction)

    // Update booking status
    const { data: escrowTransaction } = await supabaseClient
      .from('escrow_transactions')
      .select('booking_id')
      .eq('stripe_payment_intent_id', transfer.source_transaction)
      .single()

    if (escrowTransaction) {
      await supabaseClient
        .from('bookings')
        .update({ 
          payment_status: 'completed',
          escrow_status: 'released'
        })
        .eq('id', escrowTransaction.booking_id)
    }

  } catch (error) {
    console.error('Error handling transfer created:', error)
  }
}

async function handleTransferFailed(transfer: any, supabaseClient: any) {
  console.log('Transfer failed:', transfer.id)

  try {
    // Update escrow transaction status
    await supabaseClient
      .from('escrow_transactions')
      .update({
        escrow_status: 'transfer_failed',
        transfer_failure_reason: transfer.failure_message,
      })
      .eq('stripe_payment_intent_id', transfer.source_transaction)

    // Update booking status
    const { data: escrowTransaction } = await supabaseClient
      .from('escrow_transactions')
      .select('booking_id')
      .eq('stripe_payment_intent_id', transfer.source_transaction)
      .single()

    if (escrowTransaction) {
      await supabaseClient
        .from('bookings')
        .update({ 
          payment_status: 'transfer_failed',
          escrow_status: 'transfer_failed'
        })
        .eq('id', escrowTransaction.booking_id)
    }

  } catch (error) {
    console.error('Error handling transfer failed:', error)
  }
} 