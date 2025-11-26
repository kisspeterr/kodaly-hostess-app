-- Update applications status check constraint to include 'invited'
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check 
  check (status in ('pending', 'approved', 'rejected', 'invited'));

-- Create notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  message text not null,
  type text check (type in ('invite', 'info', 'alert')) default 'info',
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  related_job_id uuid references public.jobs
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Policies
create policy "Users can view own notifications." on public.notifications for select using (auth.uid() = user_id);
create policy "Admins can insert notifications." on public.notifications for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Users can update own notifications (mark read)." on public.notifications for update using (auth.uid() = user_id);
