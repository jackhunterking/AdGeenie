import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// Frontend Supabase client (uses anon key)
// This is safe to use in browser/client components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createBrowserClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      storageKey: 'adpilot-auth',
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    cookieOptions: {
      name: 'adpilot-auth',
      domain: process.env.NODE_ENV === 'production' 
        ? '.adpilot.studio' 
        : 'localhost',
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }
  }
)

