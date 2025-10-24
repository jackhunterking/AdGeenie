"use client"

/**
 * Feature: Meta OAuth Start Page
 * Purpose: Load FB JS SDK and, on user click, open Business Login; finalize via API then redirect back
 * References:
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
 *  - Embedded Signup: https://developers.facebook.com/docs/business-apps/embedded-signup
 *  - JS SDK / FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui
 *  - Next.js Suspense for useSearchParams: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID
const FB_GRAPH_VERSION = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'

declare global {
  interface Window { FB?: FBNamespace }
}

interface FBNamespace {
  init: (opts: { appId?: string; version?: string; cookie?: boolean }) => void
  ui: (
    params: Record<string, unknown>,
    cb?: (response: unknown) => void
  ) => void
}

type Status = 'loading-sdk' | 'launching' | 'exchanging' | 'success' | 'error'

function MetaOauthStartContent() {
  const searchParams = useSearchParams()
  const campaignId = searchParams?.get('campaignId') ?? null
  const returnParam = searchParams?.get('return') ?? null
  const [status, setStatus] = useState<Status>('loading-sdk')
  const [error, setError] = useState<string | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const safeReturnPath = useMemo(() => {
    if (!returnParam) return '/'
    try {
      // useSearchParams().get returns decoded; still validate startsWith('/').
      return returnParam.startsWith('/') ? returnParam : '/'
    } catch {
      return '/'
    }
  }, [returnParam])

  const redirectBack = useCallback(() => {
    if (typeof window === 'undefined') return
    window.location.assign(safeReturnPath)
  }, [safeReturnPath])

  const startBusinessLogin = useCallback(() => {
    if (!campaignId) {
      setError('Missing campaignId parameter.')
      setStatus('error')
      return
    }
    if (typeof window === 'undefined' || !window.FB) {
      setError('Facebook SDK not available in this browser session.')
      setStatus('error')
      return
    }

    setError(null)
    setStatus('launching')

    window.FB.ui({
      method: 'business_login',
      display: 'popup',
      permissions: [
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'instagram_basic',
        'ads_read',
        'ads_management'
      ],
      payload: { campaignId }
    }, async (response: unknown) => {
      const resp = response as { signed_request?: string; request_id?: string }
      if (!resp?.signed_request || !resp?.request_id) {
        setError('The Meta login was cancelled or did not return any data.')
        setStatus('error')
        return
      }

      setStatus('exchanging')
      try {
        const res = await fetch('/api/meta/business-login/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            signedRequest: resp.signed_request,
            requestId: resp.request_id,
          })
        })
        const json = await res.json()
        if (!res.ok) {
          console.error('[META] business-login callback failed', json)
          setError('We could not finalize the Meta connection. Please try again.')
          setStatus('error')
          return
        }

        setStatus('success')
        redirectTimeoutRef.current = setTimeout(() => {
          redirectBack()
        }, 1200)
      } catch (err) {
        console.error('[META] business-login error', err)
        setError('A network error occurred while finalizing the Meta connection.')
        setStatus('error')
      }
    })
  }, [campaignId, redirectBack])

  useEffect(() => {
    if (!campaignId) {
      setError('Missing campaignId parameter.')
      setStatus('error')
      return
    }
    if (!FB_APP_ID) {
      setError('Missing Facebook app configuration. Please contact support.')
      setStatus('error')
      return
    }
    if (typeof window === 'undefined') return

    const initSDK = () => {
      try {
        window.FB?.init({ appId: FB_APP_ID, version: FB_GRAPH_VERSION, cookie: true })
      } catch (err) {
        console.error('[META] Failed to init FB SDK', err)
      }
      setSdkReady(true)
      setStatus((prev) => (prev === 'loading-sdk' ? 'loading-sdk' : prev))
    }

    if (window.FB) {
      initSDK()
      return
    }

    const scriptId = 'facebook-jssdk'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null

    const handleLoad = () => {
      initSDK()
    }

    const handleError = () => {
      setError('Failed to load the Facebook SDK. Check for blockers or try again later.')
      setStatus('error')
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad)
      existingScript.addEventListener('error', handleError)
      return () => {
        existingScript.removeEventListener('load', handleLoad)
        existingScript.removeEventListener('error', handleError)
      }
    }

    const script = document.createElement('script')
    script.id = scriptId
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.addEventListener('load', handleLoad)
    script.addEventListener('error', handleError)
    document.body.appendChild(script)

    return () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
  }, [campaignId])

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current)
      }
    }
  }, [])

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'loading-sdk':
        return 'Loading the Meta SDK...'
      case 'launching':
        return 'Opening Meta to select your business assets...'
      case 'exchanging':
        return 'Finalizing your Meta connection...'
      case 'success':
        return 'Meta connection complete! Redirecting back to your dashboard.'
      case 'error':
        return error || 'Something went wrong while connecting to Meta.'
      default:
        return ''
    }
  }, [status, error])

  const renderIcon = () => {
    if (status === 'success') {
      return <Check className="h-10 w-10 text-green-500" />
    }
    if (status === 'error') {
      return <AlertCircle className="h-10 w-10 text-destructive" />
    }
    return <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-10 shadow-sm text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
          {renderIcon()}
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Meta Business Login</h1>
          <p className="text-sm text-muted-foreground">{statusMessage}</p>
        </div>
        {(status === 'loading-sdk' || status === 'error') && (
          <div className="space-y-4">
            {status === 'error' && (
              <p className="text-xs text-muted-foreground">
                If the dialog closed unexpectedly, you can retry or return to your dashboard.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" onClick={redirectBack}>
                Return to dashboard
              </Button>
              {sdkReady && (
                <Button onClick={startBusinessLogin} disabled={!sdkReady}>
                  Continue to Meta
                </Button>
              )}
            </div>
          </div>
        )}
        {(status === 'launching' || status === 'exchanging') && (
          <div className="space-y-2">
            <Button disabled variant="outline">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...
            </Button>
          </div>
        )}
        {status === 'success' && (
          <>
            <p className="text-xs text-muted-foreground">
              You will be redirected automatically. If nothing happens, click the button below.
            </p>
            <Button variant="outline" onClick={redirectBack}>
              Return now
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function MetaOauthStartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card p-10 shadow-sm text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/10">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Meta Business Login</h1>
            <p className="text-sm text-muted-foreground">Preparing…</p>
          </div>
        </div>
      </div>
    }>
      <MetaOauthStartContent />
    </Suspense>
  )
}
