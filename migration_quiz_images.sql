-- Add image_url to quiz_questions
alter table public.quiz_questions add column image_url text;

-- Allow admins to insert/update/delete quiz questions
create policy "Admins can insert questions." on public.quiz_questions for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update questions." on public.quiz_questions for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete questions." on public.quiz_questions for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
