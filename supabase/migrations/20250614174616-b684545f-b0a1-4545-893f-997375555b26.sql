
-- Enable RLS on all tables
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- RLS policies for templates table
CREATE POLICY "Users can insert their own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own templates" ON templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates" ON templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates" ON templates
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for csv_uploads table
CREATE POLICY "Users can insert their own csv_uploads" ON csv_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own csv_uploads" ON csv_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own csv_uploads" ON csv_uploads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own csv_uploads" ON csv_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for jobs table
CREATE POLICY "Users can insert their own jobs" ON jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own jobs" ON jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" ON jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Storage policies for templates bucket
CREATE POLICY "Users can upload their own templates" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own templates" ON storage.objects
  FOR SELECT USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own templates" ON storage.objects
  FOR UPDATE USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own templates" ON storage.objects
  FOR DELETE USING (bucket_id = 'templates' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for csvs bucket
CREATE POLICY "Users can upload their own csvs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'csvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own csvs" ON storage.objects
  FOR SELECT USING (bucket_id = 'csvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own csvs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'csvs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own csvs" ON storage.objects
  FOR DELETE USING (bucket_id = 'csvs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for outputs bucket
CREATE POLICY "Users can upload their own outputs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own outputs" ON storage.objects
  FOR SELECT USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own outputs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own outputs" ON storage.objects
  FOR DELETE USING (bucket_id = 'outputs' AND auth.uid()::text = (storage.foldername(name))[1]);
