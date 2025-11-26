-- Add quiz_score column to profiles table
alter table public.profiles add column if not exists quiz_score integer default 0;

-- Update existing profiles to have 0 score if null
update public.profiles set quiz_score = 0 where quiz_score is null;
