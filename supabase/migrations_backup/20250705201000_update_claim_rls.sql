-- Ensure owners can only create claims after payment and while escrow is held

-- Ensure payment_status enum includes 'paid'
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_type t
--       JOIN pg_enum e ON t.oid = e.enumtypid
--     WHERE t.typname = 'payment_status' AND e.enumlabel = 'paid'
--   ) THEN
--     ALTER TYPE payment_status ADD VALUE 'paid';
--   END IF;
-- END$$;

-- Add columns to bookings if missing (used by claim policy checks)
alter table public.bookings add column if not exists payment_status payment_status default 'pending';
alter table public.bookings add column if not exists escrow_status escrow_status default 'pending';

-- Now recreate policies

drop policy if exists "owners insert claims" on public.claims;

create policy "owners insert claims" on public.claims
  for insert to authenticated
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.payment_status = 'completed'
        and b.escrow_status = 'held'
    )
  );

-- Restrict select policy: owner or admin only

drop policy if exists "select own claims" on public.claims;

create policy "select own claims" on public.claims
  for select using (
    owner_id = auth.uid() or (
      exists (
        select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
      )
    )
  ); 