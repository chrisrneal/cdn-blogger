import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client uses the Service Role Key, granting it admin access.
// specificially for bypassing RLS during migration and API creation.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// If you need a public client later (using Anon key), you can add it here.
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// export const supabase = createClient(supabaseUrl, supabaseAnonKey);
