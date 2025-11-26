-- Add emergency_giveaway_requested column to applications
alter table public.applications add column if not exists emergency_giveaway_requested boolean default false;
