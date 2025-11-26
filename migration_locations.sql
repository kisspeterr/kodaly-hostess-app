-- Create locations table
create table public.locations (
  id uuid default uuid_generate_v4() primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.locations enable row level security;

-- Policies
create policy "Locations are viewable by everyone." on public.locations for select using (true);
create policy "Admins can insert locations." on public.locations for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can delete locations." on public.locations for delete using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Insert default locations
insert into public.locations (name) values 
  ('Kodály Központ'),
  ('Cella Septichora'),
  ('Művészetek és Irodalom Háza'),
  ('Zsolnay Kulturális Negyed'),
  ('Pécsi Est Café'),
  ('Egyéb / Other');
