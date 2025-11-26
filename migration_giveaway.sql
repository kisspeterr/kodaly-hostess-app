-- Add give_away_requested column to applications
alter table public.applications add column if not exists give_away_requested boolean default false;

-- RPC to claim a giveaway spot
-- This function finds an application for the given job that is marked for giveaway,
-- and transfers it to the new user (claiming_user_id).
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

  -- Find a giveaway spot (lock the row to prevent race conditions)
  select id into target_app_id
  from public.applications
  where job_id = job_id_param and give_away_requested = true
  limit 1
  for update skip locked;

  if target_app_id is null then
    return json_build_object('success', false, 'message', 'Nincs elérhető átadó hely.');
  end if;

  -- Update the application to the new user
  update public.applications
  set user_id = new_user_id,
      give_away_requested = false,
      status = 'approved' -- Ensure it stays approved
  where id = target_app_id;

  return json_build_object('success', true, 'message', 'Sikeresen átvetted a helyet!');
end;
$$;
