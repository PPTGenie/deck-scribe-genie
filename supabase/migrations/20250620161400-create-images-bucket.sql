
-- Create a bucket for images
insert into storage.buckets (id, name, public)
values ('images', 'images', false);

-- RLS Policies for the 'images' bucket
-- This ensures users can only access files within a folder matching their user ID.
-- We will store files like: /images/{user_id}/{template_id}/{image_file_name}

-- 1. Allow authenticated users to view their own images
CREATE POLICY "Allow authenticated view on images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 2. Allow authenticated users to upload images
CREATE POLICY "Allow authenticated insert on images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Allow authenticated users to update their own images
CREATE POLICY "Allow authenticated update on images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Allow authenticated users to delete their own images
CREATE POLICY "Allow authenticated delete on images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images' AND auth.uid()::text = (storage.foldername(name))[1]);
