import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

serve(async () => {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // bookings confirmed but no pickup coords and start_date older than 48h
  const { data: overdue, error } = await supabase.rpc('get_overdue_pickups', { cutoff_date: cutoff });

  if (error) {
    console.error('Error fetching overdue bookings', error);
    return new Response('error', { status: 500 });
  }

  for (const booking of overdue) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/escrow-release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: JSON.stringify({ booking_id: booking.id, release_type: 'auto_refund', deposit_to_owner: false })
      });

      // mark notification
      await supabase.from('notifications').insert({
        user_id: booking.renter_id,
        type: 'dispute_opened',
        title: 'Rezervare anulată, fonduri rambursate',
        message: `Rezervarea pentru ${booking.gear_title} a fost anulată automat deoarece proprietarul nu a confirmat predarea.`
      });
      await supabase.from('notifications').insert({
        user_id: booking.owner_id,
        type: 'dispute_opened',
        title: 'Rezervare anulată',
        message: `Rezervarea pentru ${booking.gear_title} a fost anulată automat deoarece nu ai confirmat predarea.`
      });
    } catch (err) {
      console.error('Auto refund error', err);
    }
  }

  return new Response('ok');
}); 