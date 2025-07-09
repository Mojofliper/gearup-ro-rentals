import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const body = await req.text()
    console.log('Test webhook received:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body: body.substring(0, 200) // First 200 chars
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Test webhook working',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Test webhook error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 