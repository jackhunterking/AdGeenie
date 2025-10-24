"use client"

/**
 * Feature: Meta OAuth Start Page
 * Purpose: Fallback page for Meta Business Login using Promise-based SDK utilities
 * References:
 *  - Medium Article: https://innocentanyaele.medium.com/how-to-use-facebook-js-sdk-for-login-on-react-or-next-js-5b988e7971df
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
 *  - Embedded Signup: https://developers.facebook.com/docs/business-apps/embedded-signup
 *  - Next.js Suspense for useSearchParams: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { initFacebookSdk, fbBusinessLogin } from '@/lib/utils/facebook-sdk'

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

  const startBusinessLogin = useCallback(async () => {
    if (!campaignId) {
      setError('Missing campaignId parameter.')
      setStatus('error')
      return
    }

    if (!sdkReady) {
      setError('Facebook SDK is not ready yet. Please wait.')
      setStatus('error')
      return
    }

    try {
      setError(null)
      setStatus('launching')

      // Use Promise-based business login
      const response = await fbBusinessLogin(campaignId, [
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'instagram_basic',
        'ads_read',
        'ads_management'
      ])

      setStatus('exchanging')

      const res = await fetch('/api/meta/business-login/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          signedRequest: response.signed_request,
          requestId: response.request_id,
        })
      })

      const json = await res.json()
      
      if (!res.ok) {
        console.error('[META OAUTH] business-login callback failed', json)
        throw new Error('Could not finalize the Meta connection')
      }

      setStatus('success')
      redirectTimeoutRef.current = setTimeout(() => {
        redirectBack()
      }, 1200)
    } catch (err) {
      console.error('[META OAUTH] business-login error', err)
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Meta.')
      setStatus('error')
    }
  }, [campaignId, redirectBack, sdkReady])

  useEffect(() => {
    if (!campaignId) {
      setError('Missing campaignId parameter.')
      setStatus('error')
      return
    }

    console.log('[META OAUTH] Initializing Facebook SDK...')

    initFacebookSdk()
      .then(() => {
        console.log('[META OAUTH] SDK ready')
        setSdkReady(true)
        setStatus('loading-sdk')
      })
      .catch((error) => {
        console.error('[META OAUTH] SDK initialization failed:', error)
        setError(error.message || 'Failed to load the Facebook SDK. Please refresh and try again.')
        setStatus('error')
      })
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
