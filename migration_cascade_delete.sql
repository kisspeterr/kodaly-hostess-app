-- Enable cascading deletes for applications when a job is deleted
ALTER TABLE public.applications
DROP CONSTRAINT IF EXISTS applications_job_id_fkey;

ALTER TABLE public.applications
ADD CONSTRAINT applications_job_id_fkey
FOREIGN KEY (job_id)
REFERENCES public.jobs(id)
ON DELETE CASCADE;

-- Enable cascading deletes for notifications when a job is deleted
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_related_job_id_fkey;

ALTER TABLE public.notifications
ADD CONSTRAINT notifications_related_job_id_fkey
FOREIGN KEY (related_job_id)
REFERENCES public.jobs(id)
ON DELETE CASCADE;
