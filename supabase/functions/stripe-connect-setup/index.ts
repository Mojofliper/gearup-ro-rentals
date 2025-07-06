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
      return new Response(
        JSON.stringify({ 
          accountId: existingAccount.stripe_account_id,
          accountStatus: existingAccount.account_status 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Stripe Connect Express account
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

    // Store connected account in database
    const { error: insertError } = await supabaseClient
      .from('connected_accounts')
      .insert({
        owner_id: userId,
        stripe_account_id: account.id,
        account_status: account.charges_enabled ? 'active' : 'pending',
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
      })

    if (insertError) {
      console.error('Error storing connected account:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to store connected account' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?refresh=true`,
      return_url: `${Deno.env.get('FRONTEND_URL')}/dashboard?success=true`,
      type: 'account_onboarding',
    })

    return new Response(
      JSON.stringify({
        accountId: account.id,
        accountStatus: account.charges_enabled ? 'active' : 'pending',
        onboardingUrl: accountLink.url,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

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