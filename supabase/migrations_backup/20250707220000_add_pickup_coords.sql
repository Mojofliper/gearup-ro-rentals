-- Add latitude & longitude columns for pickup location
alter table if exists public.bookings add column if not exists pickup_lat numeric;
alter table if exists public.bookings add column if not exists pickup_lng numeric; 