-- Function to fetch bookings confirmed, no pickup coords, start_date older than cutoff
create or replace function public.get_overdue_pickups(cutoff_date timestamptz)
returns table (
  id uuid,
  renter_id uuid,
  owner_id uuid,
  gear_title text
) language sql stable as $$
select b.id, b.renter_id, b.owner_id, g.title
from public.bookings b
join public.gear g on g.id = b.gear_id
where b.status = 'confirmed'
  and (b.pickup_lat is null or b.pickup_lng is null)
  and b.start_date < cutoff_date::date;
$$; 