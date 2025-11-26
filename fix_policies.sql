-- Allow admins to update applications (Approve/Reject)
create policy "Admins can update applications." on public.applications 
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Allow admins to delete jobs if needed
create policy "Admins can delete jobs." on public.jobs 
  for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Allow admins to update any profile (e.g. for strikes)
create policy "Admins can update any profile." on public.profiles 
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
