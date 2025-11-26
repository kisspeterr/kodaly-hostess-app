-- Ensure the function exists and is security definer
create or replace function public.update_slots_taken()
returns trigger as $$
begin
  if (TG_OP = 'DELETE') then
    update public.jobs
    set slots_taken = (
      select count(*)
      from public.applications
      where job_id = OLD.job_id and status = 'approved'
    )
    where id = OLD.job_id;
    return OLD;
  else
    update public.jobs
    set slots_taken = (
      select count(*)
      from public.applications
      where job_id = NEW.job_id and status = 'approved'
    )
    where id = NEW.job_id;
    return NEW;
  end if;
end;
$$ language plpgsql security definer;

-- Re-create the trigger to be sure
drop trigger if exists on_application_change on public.applications;
create trigger on_application_change
  after insert or update or delete on public.applications
  for each row execute procedure public.update_slots_taken();

-- Force recalculation of all jobs right now
update public.jobs j
set slots_taken = (
  select count(*)
  from public.applications a
  where a.job_id = j.id and a.status = 'approved'
);
