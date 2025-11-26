-- Add timestamp column for giveaway requests
alter table public.applications 
add column if not exists give_away_requested_at timestamp with time zone;

-- Update the claim_giveaway_spot function to prioritize the earliest request
create or replace function public.claim_giveaway_spot(job_id_param uuid)
returns json
language plpgsql
security definer
as $$
declare
  target_app_id uuid;
  new_user_id uuid;
begin
  -- Get the ID of the user calling the function
  new_user_id := auth.uid();

  -- Check if the user already has an application for this job
  if exists (select 1 from public.applications where job_id = job_id_param and user_id = new_user_id) then
    return json_build_object('success', false, 'message', 'Már jelentkeztél erre a munkára.');
  end if;

  -- Find the EARLIEST giveaway spot (prioritize by give_away_requested_at)
  select id into target_app_id
  from public.applications
  where job_id = job_id_param 
    and (give_away_requested = true or emergency_giveaway_requested = true) -- Check both types
  order by give_away_requested_at asc nulls last -- Earliest first
  limit 1
  for update skip locked;

  if target_app_id is null then
    return json_build_object('success', false, 'message', 'Nincs elérhető átadó hely.');
  end if;

  -- Update the application to the new user
  update public.applications
  set user_id = new_user_id,
      give_away_requested = false,
      emergency_giveaway_requested = false,
      give_away_requested_at = null, -- Reset timestamp
      status = 'approved' -- Ensure it stays approved
  where id = target_app_id;

  return json_build_object('success', true, 'message', 'Sikeresen átvetted a helyet!');
end;
$$;
