// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://zbdvghqxsuegsphcisfm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiZHZnaHF4c3VlZ3NwaGNpc2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjIwNDcsImV4cCI6MjA2NTQ5ODA0N30.A_ox5BAS8pmeBBmTTcYWzjhG8QTF5u6K3-8sW3jDwi0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);