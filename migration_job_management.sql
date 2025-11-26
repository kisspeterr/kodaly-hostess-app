-- Add is_active column to jobs table
alter table public.jobs add column is_active boolean default true;

-- Allow admins to update jobs (already covered by fix_policies but ensuring specific column access if needed, though RLS is row-based)
-- The existing policy "Admins can update jobs." covers this.

-- Ensure existing jobs are active
update public.jobs set is_active = true where is_active is null;

-- Make is_active not null
alter table public.jobs alter column is_active set not null;
