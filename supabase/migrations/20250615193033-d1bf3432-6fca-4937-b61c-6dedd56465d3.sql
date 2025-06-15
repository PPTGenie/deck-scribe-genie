
-- This enables Realtime broadcasting for the 'jobs' table
ALTER TABLE public.jobs REPLICA IDENTITY FULL;

-- This adds the 'jobs' table to the Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
