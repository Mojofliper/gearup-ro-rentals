-- Create claims table
create table if not exists public.claims (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid,
  -- other columns will be added below if they don't exist
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure required columns exist (safe even if they already exist)
alter table public.claims add column if not exists booking_id uuid not null references public.bookings(id) on delete cascade;
alter table public.claims add column if not exists owner_id uuid references auth.users(id);
alter table public.claims add column if not exists renter_id uuid references auth.users(id);
alter table public.claims add column if not exists claim_status text not null default 'pending' check (claim_status in ('pending','approved','rejected'));
alter table public.claims add column if not exists description text;
alter table public.claims add column if not exists evidence_urls text[];
alter table public.claims add column if not exists admin_notes text;

-- Enable Row Level Security
alter table public.claims enable row level security;

-- Policies
-- Initial lightweight policies so later migrations can modify them

-- Owners can insert their own claims (lightweight placeholder)
drop policy if exists "owners insert claims" on public.claims;
create policy "owners insert claims" on public.claims
  for insert to authenticated
  with check (auth.uid() = owner_id);

-- Owners can read their own claims (placeholder)
drop policy if exists "select own claims" on public.claims;
create policy "select own claims" on public.claims
  for select using (owner_id = auth.uid());

-- Trigger to update updated_at
create or replace function public.update_timestamp() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_timestamp on public.claims;
create trigger set_timestamp before update on public.claims
for each row execute function public.update_timestamp(); 