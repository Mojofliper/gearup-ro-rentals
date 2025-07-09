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
    const { userId } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: userId' }),
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

    // Get the connected account from database
    const { data: connectedAccount, error: fetchError } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', userId)
      .single()

    if (fetchError || !connectedAccount) {
      return new Response(
        JSON.stringify({ error: 'Connected account not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Skip placeholder accounts
    if (connectedAccount.stripe_account_id.startsWith('placeholder_')) {
      return new Response(
        JSON.stringify({ 
          accountStatus: connectedAccount.account_status,
          message: 'Placeholder account - Stripe Connect not enabled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      // Fetch the latest account status from Stripe
      const stripeAccount = await stripe.accounts.retrieve(connectedAccount.stripe_account_id)

      // Determine the account status based on Stripe's response
      let accountStatus = 'connect_required';
      if (stripeAccount.charges_enabled && stripeAccount.payouts_enabled) {
        accountStatus = 'active';
      } else if (stripeAccount.charges_enabled && !stripeAccount.payouts_enabled) {
        accountStatus = 'charges_only';
      } else if (stripeAccount.details_submitted) {
        accountStatus = 'verification_required';
      } else if (stripeAccount.requirements && Object.keys(stripeAccount.requirements.currently_due || {}).length > 0) {
        // User has started onboarding but has requirements to complete
        accountStatus = 'pending';
      } else {
        // New account, user hasn't started onboarding yet
        accountStatus = 'connect_required';
      }

      // Update the database with the latest status
      const { error: updateError } = await supabaseClient
        .from('connected_accounts')
        .update({
          account_status: accountStatus,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          requirements: stripeAccount.requirements || {},
          capabilities: stripeAccount.capabilities || {},
          business_profile: stripeAccount.business_profile || {},
          company: stripeAccount.company || {},
          individual: stripeAccount.individual || {},
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', userId)

      if (updateError) {
        console.error('Error updating connected account status:', updateError)
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update account status',
            details: updateError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({
          accountStatus,
          chargesEnabled: stripeAccount.charges_enabled,
          payoutsEnabled: stripeAccount.payouts_enabled,
          detailsSubmitted: stripeAccount.details_submitted,
          requirements: stripeAccount.requirements,
          message: 'Account status synced successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (stripeError: unknown) {
      console.error('Error fetching Stripe account:', stripeError)
      
      // If the account doesn't exist on Stripe, mark it as invalid
      if (stripeError.code === 'resource_missing') {
        const { error: updateError } = await supabaseClient
          .from('connected_accounts')
          .update({
            account_status: 'invalid',
            charges_enabled: false,
            payouts_enabled: false,
            updated_at: new Date().toISOString()
          })
          .eq('owner_id', userId)

        return new Response(
          JSON.stringify({
            accountStatus: 'invalid',
            message: 'Stripe account not found - may have been deleted'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          error: 'Failed to sync account status',
          details: stripeError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Sync account status error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync account status',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 