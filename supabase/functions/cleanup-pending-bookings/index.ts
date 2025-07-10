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
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting cleanup of stale pending bookings...')

    const startTime = Date.now()

    // Calculate the cutoff time (48 hours ago)
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    
    console.log(`Cutoff time: ${cutoffTime}`)

    // Find all pending bookings older than 48 hours
    const { data: staleBookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, created_at, gear_id, renter_id, owner_id')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime)

    if (fetchError) {
      console.error('Error fetching stale bookings:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch stale bookings' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!staleBookings || staleBookings.length === 0) {
      console.log('No stale pending bookings found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No stale pending bookings found',
          deletedCount: 0 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${staleBookings.length} stale pending bookings to delete`)

    // Get the IDs of bookings to delete
    const bookingIds = staleBookings.map(booking => booking.id)

    // Delete related data first (to maintain referential integrity)
    
    // 1. Delete conversations for these bookings
    const { error: conversationError } = await supabaseClient
      .from('conversations')
      .delete()
      .in('booking_id', bookingIds)

    if (conversationError) {
      console.error('Error deleting conversations:', conversationError)
    } else {
      console.log(`Deleted conversations for ${bookingIds.length} bookings`)
    }

    // 2. Delete messages for these bookings
    const { error: messageError } = await supabaseClient
      .from('messages')
      .delete()
      .in('booking_id', bookingIds)

    if (messageError) {
      console.error('Error deleting messages:', messageError)
    } else {
      console.log(`Deleted messages for ${bookingIds.length} bookings`)
    }

    // 3. Delete claims for these bookings
    const { error: claimError } = await supabaseClient
      .from('claims')
      .delete()
      .in('booking_id', bookingIds)

    if (claimError) {
      console.error('Error deleting claims:', claimError)
    } else {
      console.log(`Deleted claims for ${bookingIds.length} bookings`)
    }

    // 4. Delete handover photos for these bookings
    const { error: photoError } = await supabaseClient
      .from('handover_photos')
      .delete()
      .in('booking_id', bookingIds)

    if (photoError) {
      console.error('Error deleting handover photos:', photoError)
    } else {
      console.log(`Deleted handover photos for ${bookingIds.length} bookings`)
    }

    // 5. Delete escrow transactions for these bookings
    const { error: escrowError } = await supabaseClient
      .from('escrow_transactions')
      .delete()
      .in('booking_id', bookingIds)

    if (escrowError) {
      console.error('Error deleting escrow transactions:', escrowError)
    } else {
      console.log(`Deleted escrow transactions for ${bookingIds.length} bookings`)
    }

    // 6. Finally, delete the bookings themselves
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .delete()
      .in('id', bookingIds)

    if (bookingError) {
      console.error('Error deleting bookings:', bookingError)
      return new Response(
        JSON.stringify({ error: 'Failed to delete stale bookings' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully deleted ${bookingIds.length} stale pending bookings`)

    // Log the cleanup operation
    try {
      const { error: logError } = await supabaseClient.rpc('log_cleanup_operation', {
        p_deleted_count: bookingIds.length,
        p_cutoff_time: cutoffTime,
        p_deleted_booking_ids: bookingIds,
        p_execution_time_ms: Date.now() - startTime
      })

      if (logError) {
        console.error('Error logging cleanup operation:', logError)
      } else {
        console.log('Cleanup operation logged successfully')
      }
    } catch (logError) {
      console.error('Error in cleanup logging:', logError)
    }

    // Send notifications to affected users (optional)
    try {
      const notifications = []
      
      for (const booking of staleBookings) {
        // Notify renter
        notifications.push({
          user_id: booking.renter_id,
          title: 'Rezervare anulată automat',
          message: 'Rezervarea ta a fost anulată automat pentru că proprietarul nu a răspuns în 48 de ore.',
          type: 'booking_cancelled',
          data: { 
            bookingId: booking.id,
            reason: 'auto_cancelled_no_response'
          },
          is_read: false
        })

        // Notify owner
        notifications.push({
          user_id: booking.owner_id,
          title: 'Rezervare anulată automat',
          message: 'O rezervare a fost anulată automat pentru că nu ai răspuns în 48 de ore.',
          type: 'booking_cancelled',
          data: { 
            bookingId: booking.id,
            reason: 'auto_cancelled_no_response'
          },
          is_read: false
        })
      }

      if (notifications.length > 0) {
        const { error: notificationError } = await supabaseClient
          .from('notifications')
          .insert(notifications)

        if (notificationError) {
          console.error('Error sending notifications:', notificationError)
        } else {
          console.log(`Sent ${notifications.length} notifications to affected users`)
        }
      }
    } catch (notificationError) {
      console.error('Error in notification process:', notificationError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${bookingIds.length} stale pending bookings`,
        deletedCount: bookingIds.length,
        cutoffTime: cutoffTime,
        deletedBookings: staleBookings.map(b => ({
          id: b.id,
          created_at: b.created_at,
          gear_id: b.gear_id
        }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
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