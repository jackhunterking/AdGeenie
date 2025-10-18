import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Server-side Supabase client (uses service role key)
// ONLY use this in API routes or server actions
// NEVER expose this client to the browser!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase server environment variables')
}

// This client bypasses RLS - use carefully!
export const supabaseServer = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

