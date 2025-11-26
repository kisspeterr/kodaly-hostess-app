-- Allow all authenticated users to view all applications
-- This is necessary for the Hostess Schedule view to show who is working on which job.

DROP POLICY IF EXISTS "Users can view own applications" ON public.applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.applications;

-- Create a new policy that allows everyone to view applications
-- We can restrict this to authenticated users if desired, but 'true' is simplest for now given the previous 'true' for profiles.
-- Better to use (auth.role() = 'authenticated') to be slightly safer than public.

CREATE POLICY "Authenticated users can view all applications"
ON public.applications
FOR SELECT
TO authenticated
USING (true);

-- Also ensure profiles are viewable (just in case)
-- The schema.sql says "Public profiles are viewable by everyone" using (true), so that should be fine.
-- But let's reinforce it just to be sure if it was changed.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone."
ON public.profiles
FOR SELECT
USING (true);
