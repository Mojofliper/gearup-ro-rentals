import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@15.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-12-18.acacia',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  console.log('stripe-upload-identity: Request received', { method: req.method, url: req.url })
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('stripe-upload-identity: Handling OPTIONS request')
    return new Response(null, { 
      status: 200,
      headers: {
        ...corsHeaders,
        'Access-Control-Max-Age': '86400',
      }
    })
  }

  try {
    const { userId, documentType, documentData, documentPurpose } = await req.json()

    if (!userId || !documentType || !documentData) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, documentType, documentData' }),
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

    // Get the user's connected account
    const { data: connectedAccount, error: accountError } = await supabaseClient
      .from('connected_accounts')
      .select('*')
      .eq('owner_id', userId)
      .single()

    if (accountError || !connectedAccount) {
      return new Response(
        JSON.stringify({ error: 'No connected account found for user' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Upload the document to Stripe
    try {
      const file = await stripe.files.create({
        purpose: documentPurpose || 'identity_document',
        file: Buffer.from(documentData, 'base64'),
        file_link_data: {
          create: true,
        },
      })

      // Create a file link for the uploaded document
      const fileLink = await stripe.fileLinks.create({
        file: file.id,
      })

      // Update the connected account with the document information
      const updateData = {}
      
      if (documentType === 'identity_document') {
        updateData.individual = {
          verification: {
            document: {
              front: fileLink.url,
            },
          },
        }
      } else if (documentType === 'identity_document_back') {
        updateData.individual = {
          verification: {
            document: {
              back: fileLink.url,
            },
          },
        }
      } else if (documentType === 'address_document') {
        updateData.individual = {
          verification: {
            additional_document: {
              front: fileLink.url,
            },
          },
        }
      }

      // Update the Stripe account with the document
      const updatedAccount = await stripe.accounts.update(
        connectedAccount.stripe_account_id,
        updateData
      )

      // Update our database with the new account status
      const { error: updateError } = await supabaseClient
        .from('connected_accounts')
        .update({
          account_status: updatedAccount.charges_enabled ? 'active' : 'pending',
          charges_enabled: updatedAccount.charges_enabled,
          payouts_enabled: updatedAccount.payouts_enabled,
          requirements: updatedAccount.requirements,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', userId)

      if (updateError) {
        console.error('Error updating connected account:', updateError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          fileId: file.id,
          fileUrl: fileLink.url,
          accountStatus: updatedAccount.charges_enabled ? 'active' : 'pending',
          requirements: updatedAccount.requirements,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } catch (stripeError: unknown) {
      console.error('Stripe upload error:', stripeError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to upload document to Stripe',
          details: stripeError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Identity upload error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process identity document upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 