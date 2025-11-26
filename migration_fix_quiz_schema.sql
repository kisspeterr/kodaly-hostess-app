-- Consolidated migration to fix missing quiz columns
-- Run this in Supabase SQL Editor

-- Add quiz_score column if it doesn't exist
alter table public.profiles add column if not exists quiz_score integer default 0;

-- Add quiz_total column if it doesn't exist
alter table public.profiles add column if not exists quiz_total integer default 0;

-- Update null values to 0
update public.profiles set quiz_score = 0 where quiz_score is null;
update public.profiles set quiz_total = 0 where quiz_total is null;
