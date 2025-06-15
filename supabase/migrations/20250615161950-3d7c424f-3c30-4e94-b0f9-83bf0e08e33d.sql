
-- Add foreign key relationship from jobs to templates
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES public.templates(id)
ON DELETE CASCADE;

-- Add foreign key relationship from jobs to csv_uploads
ALTER TABLE public.jobs
ADD CONSTRAINT jobs_csv_id_fkey
FOREIGN KEY (csv_id)
REFERENCES public.csv_uploads(id)
ON DELETE CASCADE;
