-- Table to store metadata for handover photos (pickup & return)
create table if not exists public.handover_photos (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  uploader_id uuid not null references auth.users(id),
  photo_type text not null check (photo_type in ('pickup','return')),
  file_path text not null,
  created_at timestamptz not null default now()
);

-- Index for fast look-up
create index if not exists idx_handover_photos_booking on public.handover_photos(booking_id);

-- Enable RLS
alter table public.handover_photos enable row level security;

-- Policy: only involved renter or owner can insert during correct phase
create policy "insert own pickup/return photo" on public.handover_photos
  for insert to authenticated
  with check (
    uploader_id = auth.uid() and
    exists (
      select 1 from public.bookings b
      where b.id = booking_id and (
        (photo_type = 'pickup' and auth.uid() = b.owner_id) or
        (photo_type = 'return' and auth.uid() = b.renter_id)
      )
    )
  );

-- Policy: involved parties & admins can select
create policy "select booking photos" on public.handover_photos
  for select using (
    exists (
      select 1 from public.bookings b where b.id = booking_id and (b.owner_id = auth.uid() or b.renter_id = auth.uid())
    ) or (
      exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
    )
  );

-- No updates / deletes except admin
create policy "admin maintain photos" on public.handover_photos
  for all using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  ); 