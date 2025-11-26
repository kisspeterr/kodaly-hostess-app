-- Create a new storage bucket for quiz images
insert into storage.buckets (id, name, public)
values ('quiz-images', 'quiz-images', true);

-- Policy: Give public access to view images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'quiz-images' );

-- Policy: Allow admins to upload images
create policy "Admins can upload images"
  on storage.objects for insert
  with check (
    bucket_id = 'quiz-images' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Policy: Allow admins to update images
create policy "Admins can update images"
  on storage.objects for update
  using (
    bucket_id = 'quiz-images' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Policy: Allow admins to delete images
create policy "Admins can delete images"
  on storage.objects for delete
  using (
    bucket_id = 'quiz-images' 
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
