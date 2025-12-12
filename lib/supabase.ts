import { createClient } from '@supabase/supabase-js';

// We provide a fallback for build time.
// If the env vars are missing at runtime (when data is actually fetched),
// the client will be created with these placeholders and connection will fail gracefully (or log an error),
// rather than crashing the entire app build process at module load time.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key';

// This client uses the Service Role Key, granting it admin access.
// specificially for bypassing RLS during migration and API creation.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// If you need a public client later (using Anon key), you can add it here.
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);
