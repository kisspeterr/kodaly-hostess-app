-- Ensure users can view their own applications
drop policy if exists "Users can view own applications" on public.applications;
create policy "Users can view own applications"
on public.applications
for select
using (auth.uid() = user_id);

-- Ensure users can update their own applications (needed for cancelling giveaway)
drop policy if exists "Users can update own applications" on public.applications;
create policy "Users can update own applications"
on public.applications
for update
using (auth.uid() = user_id);

-- Ensure users can delete their own applications (if needed)
drop policy if exists "Users can delete own applications" on public.applications;
create policy "Users can delete own applications"
on public.applications
for delete
using (auth.uid() = user_id);
