-- Create settings table
create table public.settings (
  key text primary key,
  value text not null
);

-- Insert default hourly rate
insert into public.settings (key, value) values ('hourly_rate', '1500')
on conflict (key) do nothing;

-- Enable RLS
alter table public.settings enable row level security;

-- Policies
-- Everyone can read settings
create policy "Settings are viewable by everyone." on public.settings for select using (true);

-- Only admins can update settings
create policy "Admins can update settings." on public.settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Only admins can insert settings (if needed)
create policy "Admins can insert settings." on public.settings for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
