-- Reset policies for applications
alter table public.applications enable row level security;

drop policy if exists "Users can view own applications" on public.applications;
drop policy if exists "Admins can view all applications" on public.applications;
drop policy if exists "Authenticated users can view all applications" on public.applications;
drop policy if exists "Anyone can view giveaway requests" on public.applications;
drop policy if exists "Users can update own applications" on public.applications;
drop policy if exists "Users can delete own applications" on public.applications;
drop policy if exists "Users can apply" on public.applications;
drop policy if exists "Admins can insert applications." on public.applications;
drop policy if exists "Admins can update applications." on public.applications;
drop policy if exists "Admins can delete applications." on public.applications;

-- 1. SELECT: Everyone (authenticated) can view ALL applications (needed for schedule, admin panel, etc.)
create policy "Authenticated users can view all applications"
on public.applications for select
to authenticated
using (true);

-- 2. INSERT: Users can insert for themselves. Admins can insert for anyone.
create policy "Users can apply (insert own)"
on public.applications for insert
with check (auth.uid() = user_id);

create policy "Admins can insert any application"
on public.applications for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3. UPDATE: Users can update their own (e.g. for giveaways). Admins can update any.
create policy "Users can update own applications"
on public.applications for update
using (auth.uid() = user_id);

create policy "Admins can update any application"
on public.applications for update
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 4. DELETE: Users can delete their own (e.g. cancel). Admins can delete any.
create policy "Users can delete own applications"
on public.applications for delete
using (auth.uid() = user_id);

create policy "Admins can delete any application"
on public.applications for delete
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- Reset policies for notifications
alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications." on public.notifications;
drop policy if exists "Admins can insert notifications." on public.notifications;
drop policy if exists "Users can update own notifications (mark read)." on public.notifications;
drop policy if exists "Users can delete own notifications." on public.notifications;

-- 1. SELECT: Users view their own.
create policy "Users can view own notifications"
on public.notifications for select
using (auth.uid() = user_id);

-- 2. INSERT: Admins can insert (send invites).
create policy "Admins can insert notifications"
on public.notifications for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- 3. UPDATE: Users can update their own (mark read).
create policy "Users can update own notifications"
on public.notifications for update
using (auth.uid() = user_id);

-- 4. DELETE: Users can delete their own (dismiss/accept).
create policy "Users can delete own notifications"
on public.notifications for delete
using (auth.uid() = user_id);
