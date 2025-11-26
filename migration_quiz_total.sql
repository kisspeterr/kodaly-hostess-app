-- Add quiz_total column to profiles table to store the max possible score
alter table public.profiles add column if not exists quiz_total integer default 0;

-- Update existing profiles to have 0 total if null
update public.profiles set quiz_total = 0 where quiz_total is null;
