import { createClient } from '@supabase/supabase-js';

// Frontend client - anon key, safe to expose to browser
// Subject to Row Level Security policies
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);