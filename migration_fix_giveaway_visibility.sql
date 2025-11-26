-- Allow anyone to view applications that are marked for giveaway
-- This ensures that other users can see when a job has a giveaway request and "Switch Places"
create policy "Anyone can view giveaway requests"
on public.applications
for select
using (give_away_requested = true or emergency_giveaway_requested = true);
