import { createClient } from '@supabase/supabase-js';

// We provide a fallback for build time.
// If the env vars are missing at runtime (when data is actually fetched),
// the client will be created with these placeholders and connection will fail gracefully (or log an error),
// rather than crashing the entire app build process at module load time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Public client for client-side operations (auth, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
