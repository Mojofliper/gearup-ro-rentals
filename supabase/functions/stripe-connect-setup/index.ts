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

// Handle successful onboarding completion
async function handleOnboardingCompletion(userId: string, accountId: string, supabaseClient: ReturnType<typeof createClient>) {
  try {
    // Verify the account exists on Stripe
    const stripeAccount = await stripe.accounts.retrieve(accountId)
    
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

    // Check if account already exists in database (shouldn't happen with new flow, but safety check)
    const { data: existingAccount } = await supabaseClient
      .from('connected_accounts')
      .select('id')
      .eq('stripe_account_id', accountId)
      .single();

    if (existingAccount) {
      // Account already exists, just update the status
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
        .eq('stripe_account_id', accountId);

      if (updateError) {
        console.error('Error updating connected account after completion:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to update connected account after completion',
            details: updateError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    } else {
      // Now store the account in our database
      const { error: insertError } = await supabaseClient
        .from('connected_accounts')
        .insert({
          owner_id: userId,
          stripe_account_id: accountId,
          account_status: accountStatus,
          charges_enabled: stripeAccount.charges_enabled,
          payouts_enabled: stripeAccount.payouts_enabled,
          details_submitted: stripeAccount.details_submitted,
          country: stripeAccount.country,
          business_type: stripeAccount.business_type,
          capabilities: stripeAccount.capabilities || {},
          requirements: stripeAccount.requirements || {},
          business_profile: stripeAccount.business_profile || {},
          company: stripeAccount.company || {},
          individual: stripeAccount.individual || {}
        });

      if (insertError) {
        console.error('Error storing connected account after completion:', insertError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store connected account after completion',
            details: insertError.message
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        accountId: accountId,
        accountStatus: accountStatus,
        message: 'Onboarding completed successfully',
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error handling onboarding completion:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Create Supabase client
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { userId, email, country, accountId } = await req.json()

    // If accountId is provided, this is a completion request
    if (accountId) {
      return await handleOnboardingCompletion(userId, accountId, supabaseClient)
    }

    // Otherwise, this is a new setup request
    if (!userId || !email || !country) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email, country' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

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
          : 'http://localhost:8080'

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
      // Don't create Stripe account immediately - create account link that will create account on completion
      const isLiveMode = (stripe._apiKey || '').startsWith('sk_live_')
      const appBaseUrl = isLiveMode
        ? 'https://gearup.ro' // TODO: replace with your prod domain
        : 'http://localhost:8080'

      // Create account link without a pre-existing account
      // This will create the account only when user completes onboarding
      const accountLink = await stripe.accountLinks.create({
        refresh_url: `${appBaseUrl}/dashboard?refresh=true`,
        return_url: `${appBaseUrl}/dashboard?success=true`,
        type: 'account_onboarding',
        collection_options: { fields: 'eventually_due' },
      })

      return new Response(
        JSON.stringify({
          onboardingUrl: accountLink.url,
          // Flag to indicate this is a new account that will be created on completion
          isNewAccount: true,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError: unknown) {
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
            country: country,
            business_type: 'individual',
            capabilities: {},
            requirements: {}
          })

        if (insertError) {
          console.error('Error storing placeholder account:', insertError)
          console.error('Error details:', JSON.stringify(insertError, null, 2))
          return new Response(
            JSON.stringify({ 
              error: 'Failed to store placeholder account',
              details: insertError.message,
              code: insertError.code
            }),
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