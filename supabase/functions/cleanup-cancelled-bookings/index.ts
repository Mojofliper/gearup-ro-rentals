import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate the cutoff time (30 minutes ago)
    const cutoffTime = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    console.log('Cleaning up cancelled bookings older than:', cutoffTime)

    // Find cancelled bookings older than 30 minutes
    const { data: cancelledBookings, error: fetchError } = await supabaseClient
      .from('bookings')
      .select('id, status, updated_at, created_at')
      .eq('status', 'cancelled')
      .lt('updated_at', cutoffTime)

    if (fetchError) {
      console.error('Error fetching cancelled bookings:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch cancelled bookings' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!cancelledBookings || cancelledBookings.length === 0) {
      console.log('No cancelled bookings to clean up')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No cancelled bookings to clean up',
          deletedCount: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Found ${cancelledBookings.length} cancelled bookings to delete`)

    // Get the booking IDs to delete
    const bookingIds = cancelledBookings.map(booking => booking.id)

    // Delete related records first (due to foreign key constraints)
    // Delete escrow transactions
    const { error: escrowError } = await supabaseClient
      .from('escrow_transactions')
      .delete()
      .in('booking_id', bookingIds)

    if (escrowError) {
      console.error('Error deleting escrow transactions:', escrowError)
    }

    // Delete transactions
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .delete()
      .in('booking_id', bookingIds)

    if (transactionError) {
      console.error('Error deleting transactions:', transactionError)
    }

    // Delete messages
    const { error: messageError } = await supabaseClient
      .from('messages')
      .delete()
      .in('booking_id', bookingIds)

    if (messageError) {
      console.error('Error deleting messages:', messageError)
    }

    // Delete claims
    const { error: claimError } = await supabaseClient
      .from('claims')
      .delete()
      .in('booking_id', bookingIds)

    if (claimError) {
      console.error('Error deleting claims:', claimError)
    }

    // Delete handover photos
    const { error: photoError } = await supabaseClient
      .from('handover_photos')
      .delete()
      .in('booking_id', bookingIds)

    if (photoError) {
      console.error('Error deleting handover photos:', photoError)
    }

    // Delete reviews related to these bookings
    const { error: reviewError } = await supabaseClient
      .from('reviews')
      .delete()
      .in('booking_id', bookingIds)

    if (reviewError) {
      console.error('Error deleting reviews:', reviewError)
    }

    // Finally, delete the bookings themselves
    const { error: bookingError } = await supabaseClient
      .from('bookings')
      .delete()
      .in('id', bookingIds)

    if (bookingError) {
      console.error('Error deleting bookings:', bookingError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete cancelled bookings',
          details: bookingError.message
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Successfully deleted ${cancelledBookings.length} cancelled bookings and related data`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully cleaned up ${cancelledBookings.length} cancelled bookings`,
        deletedCount: cancelledBookings.length,
        deletedBookings: cancelledBookings.map(b => ({
          id: b.id,
          cancelledAt: b.updated_at,
          createdAt: b.created_at
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Cleanup cancelled bookings error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to cleanup cancelled bookings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 