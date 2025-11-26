-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  full_name text,
  role text default 'hostess' check (role in ('hostess', 'admin')),
  strikes int default 0,
  quiz_passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create jobs table
create table public.jobs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  location text,
  date timestamp with time zone not null,
  slots_total int not null,
  slots_taken int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create applications table
create table public.applications (
  id uuid default uuid_generate_v4() primary key,
  job_id uuid references public.jobs not null,
  user_id uuid references public.profiles not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(job_id, user_id)
);

-- Create quiz_questions table
create table public.quiz_questions (
  id uuid default uuid_generate_v4() primary key,
  question text not null,
  answers jsonb not null, -- Array of strings
  correct_answer_index int not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create quiz_results table
create table public.quiz_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles not null,
  score int not null,
  passed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_results enable row level security;

-- Policies
-- Profiles: Users can view their own profile. Admins can view all.
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Jobs: Everyone can view jobs. Only admins can insert/update/delete.
create policy "Jobs are viewable by everyone." on public.jobs for select using (true);
create policy "Admins can insert jobs." on public.jobs for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admins can update jobs." on public.jobs for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Applications: Users can view their own applications. Admins can view all.
create policy "Users can view own applications." on public.applications for select using (auth.uid() = user_id);
create policy "Admins can view all applications." on public.applications for select using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Users can apply." on public.applications for insert with check (auth.uid() = user_id);

-- Quiz: Everyone can view questions.
create policy "Questions are viewable by everyone." on public.quiz_questions for select using (true);

-- Quiz Results: Users can view own results.
create policy "Users can view own results." on public.quiz_results for select using (auth.uid() = user_id);
create policy "Users can insert results." on public.quiz_results for insert with check (auth.uid() = user_id);

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'hostess');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
