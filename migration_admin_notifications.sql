-- Add related_application_id to notifications
alter table public.notifications add column if not exists related_application_id uuid references public.applications(id) on delete cascade;

-- Function to notify admins on emergency giveaway request
create or replace function public.notify_admins_on_emergency_giveaway()
returns trigger as $$
declare
  admin_record record;
  job_title text;
  user_name text;
begin
  -- Only trigger when emergency_giveaway_requested changes to true
  if (NEW.emergency_giveaway_requested = true and (OLD.emergency_giveaway_requested = false or OLD.emergency_giveaway_requested is null)) then
    
    -- Get job title
    select title into job_title from public.jobs where id = NEW.job_id;
    
    -- Get user name
    select full_name into user_name from public.profiles where id = NEW.user_id;

    -- Loop through all admins and insert notification
    for admin_record in select id from public.profiles where role = 'admin' loop
      insert into public.notifications (user_id, type, message, related_job_id, related_application_id)
      values (
        admin_record.id, 
        'emergency_giveaway', 
        'Sürgősségi leadás kérelem: ' || user_name || ' - ' || job_title, 
        NEW.job_id,
        NEW.id
      );
    end loop;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

-- Create trigger
drop trigger if exists on_emergency_giveaway on public.applications;
create trigger on_emergency_giveaway
  after update on public.applications
  for each row execute procedure public.notify_admins_on_emergency_giveaway();
