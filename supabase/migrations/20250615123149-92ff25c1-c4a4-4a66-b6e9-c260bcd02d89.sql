
-- Create a bucket for templates
insert into storage.buckets (id, name, public)
values ('templates', 'templates', false);

-- Create a bucket for csv files
insert into storage.buckets (id, name, public)
values ('csv_files', 'csv_files', false);

-- RLS Policies for the 'templates' bucket
-- This ensures users can only access files within a folder matching their user ID.
-- We will store files like: /templates/{user_id}/{template_file_name}.pptx

-- 1. Allow authenticated users to view their own templates
CREATE POLICY "Allow authenticated view on templates"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Allow authenticated users to upload templates
CREATE POLICY "Allow authenticated insert on templates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Allow authenticated users to update their own templates
CREATE POLICY "Allow authenticated update on templates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Allow authenticated users to delete their own templates
CREATE POLICY "Allow authenticated delete on templates"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);


-- RLS Policies for the 'csv_files' bucket
-- This ensures users can only access files within a folder matching their user ID.
-- We will store files like: /csv_files/{user_id}/{csv_file_name}.csv

-- 1. Allow authenticated users to view their own csv files
CREATE POLICY "Allow authenticated view on csv_files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'csv_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Allow authenticated users to upload csv files
CREATE POLICY "Allow authenticated insert on csv_files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'csv_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Allow authenticated users to update their own csv files
CREATE POLICY "Allow authenticated update on csv_files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'csv_files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Allow authenticated users to delete their own csv files
CREATE POLICY "Allow authenticated delete on csv_files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'csv_files' AND auth.uid()::text = (storage.foldername(name))[1]);
