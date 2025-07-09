import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

interface BookingEmailData {
  bookingId: string;
  eventType: 'booking_confirmed' | 'booking_cancelled' | 'pickup_reminder' | 'return_reminder' | 'payment_received' | 'claim_submitted' | 'claim_updated';
  userId?: string;
}

const adminEmail = Deno.env.get('ADMIN_EMAIL');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { bookingId, eventType, userId } = await req.json() as BookingEmailData

    if (!bookingId || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bookingId, eventType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get booking details with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        gear:gear_id(title, price_per_day, deposit_amount),
        owner:owner_id(email, first_name, last_name),
        renter:renter_id(email, first_name, last_name)
      `)
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Determine recipients based on event type
    let recipients: string[] = []
    let emailData: EmailData | null = null

    switch (eventType) {
      case 'booking_confirmed':
        // Send to both owner and renter
        recipients = [booking.owner.email, booking.renter.email]
        emailData = {
          to: recipients.join(','),
          subject: `Booking Confirmed - ${booking.gear.title}`,
          template: 'booking_confirmed',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            startDate: booking.start_date,
            endDate: booking.end_date,
            totalAmount: booking.total_amount,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`,
            pickupLocation: booking.pickup_location || 'To be arranged'
          }
        }
        break

      case 'booking_cancelled':
        // Send to both owner and renter
        recipients = [booking.owner.email, booking.renter.email]
        emailData = {
          to: recipients.join(','),
          subject: `Booking Cancelled - ${booking.gear.title}`,
          template: 'booking_cancelled',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            startDate: booking.start_date,
            endDate: booking.end_date,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      case 'pickup_reminder':
        // Send to both owner and renter
        recipients = [booking.owner.email, booking.renter.email]
        emailData = {
          to: recipients.join(','),
          subject: `Pickup Reminder - ${booking.gear.title}`,
          template: 'pickup_reminder',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            startDate: booking.start_date,
            pickupLocation: booking.pickup_location || 'To be arranged',
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      case 'return_reminder':
        // Send to both owner and renter
        recipients = [booking.owner.email, booking.renter.email]
        emailData = {
          to: recipients.join(','),
          subject: `Return Reminder - ${booking.gear.title}`,
          template: 'return_reminder',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            endDate: booking.end_date,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      case 'payment_received':
        // Send to owner
        recipients = [booking.owner.email]
        emailData = {
          to: recipients.join(','),
          subject: `Payment Received - ${booking.gear.title}`,
          template: 'payment_received',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            totalAmount: booking.total_amount,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      case 'claim_submitted':
        // Send to admin and owner
        recipients = [booking.owner.email];
        // Use adminEmail from above
        if (adminEmail) {
          recipients.push(adminEmail);
        }
        emailData = {
          to: recipients.join(','),
          subject: `Damage Claim Submitted - ${booking.gear.title}`,
          template: 'claim_submitted',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      case 'claim_updated':
        // Send to both owner and renter
        recipients = [booking.owner.email, booking.renter.email]
        emailData = {
          to: recipients.join(','),
          subject: `Claim Status Updated - ${booking.gear.title}`,
          template: 'claim_updated',
          data: {
            bookingId: booking.id,
            gearTitle: booking.gear.title,
            ownerName: `${booking.owner.first_name} ${booking.owner.last_name}`,
            renterName: `${booking.renter.first_name} ${booking.renter.last_name}`
          }
        }
        break

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid event type' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }

    if (!emailData) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate email data' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // TODO: Integrate with actual email service (SendGrid, Mailgun, etc.)
    // For now, just log the email data
    console.log('Email notification data:', {
      eventType,
      recipients,
      emailData
    })

    // Store email notification in database for tracking
    const { error: notificationError } = await supabase
      .from('email_notifications')
      .insert({
        booking_id: bookingId,
        event_type: eventType,
        recipients: recipients,
        subject: emailData.subject,
        template: emailData.template,
        data: emailData.data,
        status: 'sent' // TODO: Update based on actual email service response
      })

    if (notificationError) {
      console.error('Error storing email notification:', notificationError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification processed',
        recipients,
        eventType
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in email-notification:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}) 