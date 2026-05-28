import { createClient } from '@supabase/supabase-js'

// Shared Supabase service-role client — used by all backend routes and services.
// Service role bypasses RLS (intentional — RLS protects direct anon-key frontend calls).
// All backend auth is handled by requireAuth middleware before touching Supabase.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env')
}

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)
