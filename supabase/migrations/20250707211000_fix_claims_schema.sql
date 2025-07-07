-- Fix claims table schema in case it existed before without the full set of columns
-- Run only if the table already existed (safe to run multiple times)

-- Add missing columns
alter table if exists public.claims add column if not exists owner_id uuid references auth.users(id);
alter table if exists public.claims add column if not exists renter_id uuid references auth.users(id);
alter table if exists public.claims add column if not exists claim_status text not null default 'pending' check (claim_status in ('pending','approved','rejected'));
alter table if exists public.claims add column if not exists description text;
alter table if exists public.claims add column if not exists evidence_urls text[];
alter table if exists public.claims add column if not exists admin_notes text;
alter table if exists public.claims add column if not exists created_at timestamptz not null default now();
alter table if exists public.claims add column if not exists updated_at timestamptz not null default now();

-- Ensure primary key
alter table if exists public.claims add column if not exists id uuid primary key default uuid_generate_v4();

-- Enable RLS if not enabled
alter table if exists public.claims enable row level security;

-- Drop existing conflicting policies and recreate correct ones

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

drop policy if exists "select own claims" on public.claims;
create policy "select own claims" on public.claims
  for select using (
    owner_id = auth.uid() or (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    )
  );

drop policy if exists "owners cannot update" on public.claims;
create policy "owners cannot update" on public.claims
  for update using (false);

drop policy if exists "admins update claims" on public.claims;
create policy "admins update claims" on public.claims
  for update using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  ); 