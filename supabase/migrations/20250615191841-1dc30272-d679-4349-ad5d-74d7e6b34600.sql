
-- Create a bucket for generated output files
insert into storage.buckets (id, name, public)
values ('outputs', 'outputs', false);

-- RLS Policies for the 'outputs' bucket
-- This ensures users can only access files within a folder matching their user ID.
-- The edge function will store files like: /outputs/{user_id}/{job_id}/{filename}.pptx

-- 1. Allow authenticated users to view their own output files (required for generating download links)
CREATE POLICY "Allow authenticated view on outputs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Allow authenticated users to upload to their folder in the outputs bucket
CREATE POLICY "Allow authenticated insert on outputs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Allow authenticated users to update their own output files
CREATE POLICY "Allow authenticated update on outputs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Allow authenticated users to delete their own output files
CREATE POLICY "Allow authenticated delete on outputs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

