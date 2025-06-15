
-- Add a column to store the user-defined filename template for each job
ALTER TABLE public.jobs
ADD COLUMN filename_template TEXT;
