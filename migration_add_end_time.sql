-- Add end_time column to jobs table
alter table public.jobs add column end_time timestamp with time zone;

-- Update existing jobs to have an end_time (default to 4 hours after start)
update public.jobs set end_time = date + interval '4 hours' where end_time is null;

-- Make end_time not null after population
alter table public.jobs alter column end_time set not null;
