/**
 * Feature: Google OAuth callback handler
 * Purpose: Exchanges the OAuth "code" for a Supabase session and redirects back to the app
 * References:
 *  - Supabase (Login with Google → Next.js): https://supabase.com/docs/guides/auth/social-login/auth-google#signing-users-in
 *  - Supabase (Server-side client): https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  // We'll collect cookies set by Supabase and attach them to the redirect response
  const cookiesToSet: { name: string; value: string; options: Parameters<NextResponse['cookies']['set']>[2] }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(newCookies) {
          newCookies.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options })
          })
        },
      },
    }
  )

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Build final redirect URL (handle load balancer header if present)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocal = process.env.NODE_ENV === 'development'
      let redirectUrl = isLocal
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`

      // Add auth success indicator to trigger client-side session refresh
      redirectUrl += (redirectUrl.includes('?') ? '&' : '?') + 'auth=success'

      const response = NextResponse.redirect(redirectUrl)
      
      // Set cookies with proper production attributes
      cookiesToSet.forEach(({ name, value, options }) => {
        const productionOptions = {
          ...options,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          path: '/',
        }
        response.cookies.set(name, value, productionOptions)
      })
      
      return response
    }
  }

  const errorResponse = NextResponse.redirect(`${origin}/auth/auth-code-error`)
  cookiesToSet.forEach(({ name, value, options }) => errorResponse.cookies.set(name, value, options))
  return errorResponse
}


