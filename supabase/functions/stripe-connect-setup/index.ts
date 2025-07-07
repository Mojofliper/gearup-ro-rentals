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
    const { userId, email, country = 'RO' } = await req.json()

    if (!userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email' }),
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

    // Check if user already has a connected account
    const { data: existingAccount } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', userId)
      .single()

    if (existingAccount) {
      // If account is active – nothing to do, just return status
      if (existingAccount.account_status === 'active') {
      return new Response(
        JSON.stringify({ 
          accountId: existingAccount.stripe_account_id,
            accountStatus: existingAccount.account_status,
        }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

      // For pending / restricted accounts we need a fresh onboarding link so the user can complete verification
      try {
        const isLiveMode = (stripe._apiKey || '').startsWith('sk_live_')
        const appBaseUrl = isLiveMode
          ? 'https://gearup.ro' // TODO: replace with your prod domain
          : 'http://localhost:5173'

        const accountLink = await stripe.accountLinks.create({
          account: existingAccount.stripe_account_id,
          refresh_url: `${appBaseUrl}/dashboard?refresh=true`,
          return_url: `${appBaseUrl}/dashboard?success=true`,
          type: 'account_onboarding',
          collection_options: { fields: 'eventually_due' },
        })

        return new Response(
          JSON.stringify({
            accountId: existingAccount.stripe_account_id,
            accountStatus: existingAccount.account_status,
            onboardingUrl: accountLink.url,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (_) {
        // Fall through to trying to create a brand-new account below
      }
    }

    try {
      // Try to create Stripe Connect Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      business_profile: {
        url: 'https://gearup.ro',
        mcc: '7399', // Business Services - Not Elsewhere Classified
      },
    })

      // Store or update connected account in database
      const { error: upsertError } = await supabaseClient
      .from('connected_accounts')
        .upsert({
        owner_id: userId,
        stripe_account_id: account.id,
          account_status: 'pending',
          charges_enabled: false,
          payouts_enabled: false,
        }, { onConflict: 'owner_id' })

      if (upsertError) {
        console.error('Error storing connected account:', upsertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store connected account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create account link for onboarding
    const isLiveMode = (stripe._apiKey || '').startsWith('sk_live_')
    const appBaseUrl = isLiveMode
      ? 'https://gearup.ro' // TODO: replace with your prod domain
      : 'http://localhost:5173'

    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${appBaseUrl}/dashboard?refresh=true`,
      return_url: `${appBaseUrl}/dashboard?success=true`,
      type: 'account_onboarding',
      collection_options: { fields: 'eventually_due' },
    })

    return new Response(
      JSON.stringify({
        accountId: account.id,
          accountStatus: 'pending',
        onboardingUrl: accountLink.url,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

    } catch (stripeError: any) {
      console.error('Stripe Connect setup error:', stripeError)
      
      // If Connect is not enabled, create a placeholder account
      if (stripeError.message?.includes('signed up for Connect')) {
        // Create a placeholder connected account for now
        const placeholderAccountId = `placeholder_${userId}_${Date.now()}`
        
        const { error: insertError } = await supabaseClient
          .from('connected_accounts')
          .insert({
            owner_id: userId,
            stripe_account_id: placeholderAccountId,
            account_status: 'connect_required',
            charges_enabled: false,
            payouts_enabled: false,
          })

        if (insertError) {
          console.error('Error storing placeholder account:', insertError)
          return new Response(
            JSON.stringify({ error: 'Failed to store placeholder account' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        return new Response(
          JSON.stringify({
            accountId: placeholderAccountId,
            accountStatus: 'connect_required',
            error: 'Stripe Connect needs to be enabled in your Stripe dashboard. Please contact support.',
            requiresConnectSetup: true,
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Re-throw other Stripe errors
      throw stripeError
    }

  } catch (error) {
    console.error('Stripe Connect setup error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to setup Stripe Connect account',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 