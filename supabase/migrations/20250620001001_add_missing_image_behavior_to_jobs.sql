
-- Add missing_image_behavior column to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS missing_image_behavior TEXT DEFAULT 'placeholder';

-- Add check constraint to ensure valid values
ALTER TABLE public.jobs 
ADD CONSTRAINT jobs_missing_image_behavior_check 
CHECK (missing_image_behavior IN ('placeholder', 'fail', 'skip'));

-- Update the column comment
COMMENT ON COLUMN public.jobs.missing_image_behavior IS 'How to handle missing images: placeholder, fail, or skip';
