-- Allow admins to insert applications for any user
create policy "Admins can insert applications."
  on public.applications
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow admins to update any application
create policy "Admins can update applications."
  on public.applications
  for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Allow admins to delete any application
create policy "Admins can delete applications."
  on public.applications
  for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
