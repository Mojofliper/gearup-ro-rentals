// @ts-ignore: Deno Deploy/Supabase Edge Functions remote import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore: Deno Deploy/Supabase Edge Functions remote import
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
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting cleanup of pending bookings...')

    // Calculate the cutoff time (30 minutes ago)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    
    console.log('Cutoff time for cleanup:', thirtyMinutesAgo)

    // Find pending bookings older than 30 minutes
    const { data: pendingBookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select(`
        id,
        status,
        payment_status,
        created_at,
        owner_id,
        renter_id,
        gear:gear_id(title)
      `)
      .eq('status', 'pending')
      .lt('created_at', thirtyMinutesAgo)

    if (fetchError) {
      console.error('Error fetching pending bookings:', fetchError)
      throw fetchError
    }

    console.log(`Found ${pendingBookings?.length || 0} pending bookings older than 30 minutes`)

    if (!pendingBookings || pendingBookings.length === 0) {
      console.log('No pending bookings to clean up')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No pending bookings to clean up',
          cleanedCount: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Delete the pending bookings
    const bookingIds = pendingBookings.map(booking => booking.id)
    
    const { error: deleteError } = await supabaseClient
      .from('bookings')
      .delete()
      .in('id', bookingIds)

    if (deleteError) {
      console.error('Error deleting pending bookings:', deleteError)
      throw deleteError
    }

    console.log(`Successfully deleted ${pendingBookings.length} pending bookings`)

    // Log cleanup details for monitoring
    const cleanupLog = {
      timestamp: new Date().toISOString(),
      action: 'cleanup_pending_bookings',
      cleaned_count: pendingBookings.length,
      cutoff_time: thirtyMinutesAgo,
      booking_details: pendingBookings.map(booking => ({
        id: booking.id,
        created_at: booking.created_at,
        owner_id: booking.owner_id,
        renter_id: booking.renter_id,
        gear_title: booking.gear?.title
      }))
    }

    console.log('Cleanup log:', JSON.stringify(cleanupLog, null, 2))

    // Optionally store cleanup log in database for monitoring
    try {
      await supabaseClient
        .from('cleanup_logs')
        .insert({
          action: 'cleanup_pending_bookings',
          details: cleanupLog,
          cleaned_count: pendingBookings.length,
          cutoff_time: thirtyMinutesAgo
        })
    } catch (logError) {
      console.error('Error logging cleanup (non-critical):', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully cleaned up ${pendingBookings.length} pending bookings`,
        cleanedCount: pendingBookings.length,
        cutoffTime: thirtyMinutesAgo
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 