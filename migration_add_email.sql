-- Add email column to profiles
alter table public.profiles add column email text;

-- Populate existing profiles with email from auth.users
-- Note: This requires permissions to read auth.users, which you have in the SQL Editor
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id;

-- Update the handle_new_user function to include email for future users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (new.id, new.raw_user_meta_data->>'full_name', 'hostess', new.email);
  return new;
end;
$$ language plpgsql security definer;
