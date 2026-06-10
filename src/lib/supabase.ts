import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // The app still renders a clear setup message instead of crashing during local setup.
  console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill values.');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
