"use client"

/**
 * Feature: Meta Connect Card (clean state machine)
 * Purpose: Deterministic popup flow → persist in callback → hydrate once → show assets
 * References:
 *  - Facebook Business Login: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - FB.ui Documentation: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - JavaScript Ads Dialog for Payments: https://developers.facebook.com/docs/marketing-apis/guides/javascript-ads-dialog-for-payments/
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Link2, Check, Building2, CreditCard, Loader2 } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import type { AdsPaymentParams, AdsPaymentResponse, FBLoginStatusResponse } from "@/lib/types/facebook"

type Status = 'idle' | 'authorizing' | 'finalizing' | 'connected' | 'error'
type PaymentStatus = 'idle' | 'opening' | 'processing' | 'success' | 'error'

interface Summary {
  business?: { id: string; name: string }
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
  paymentConnected?: boolean
  status?: string
}

export function MetaConnectCard({ mode = 'launch' }: { mode?: 'launch' | 'step' }) {
  const { campaign } = useCampaignContext()
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [popupRef, setPopupRef] = useState<Window | null>(null)
  const [timeoutId, setTimeoutId] = useState<number | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle')
  const [fbLoginStatus, setFbLoginStatus] = useState<'connected' | 'not_authorized' | 'unknown' | null>(null)

  const hydrate = useCallback(async () => {
    if (!campaign?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json() as Summary
      setSummary(j)
      if (j?.status === 'connected') setStatus('connected')
      // Reset payment status after successful hydration
      if (paymentStatus === 'success' && j?.paymentConnected) {
        setPaymentStatus('idle')
      }
    } finally {
      setLoading(false)
    }
  }, [campaign?.id, paymentStatus])

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (new URL(window.location.href).searchParams.get('meta') === 'connected') {
      setStatus('finalizing')
      void hydrate()
    }
  }, [hydrate])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Accept only same-origin messages for security
      if (typeof window !== 'undefined' && e.origin !== window.location.origin) return
      const data = (e && typeof e.data === 'object' && e.data !== null) ? (e.data as { type?: string; status?: string }) : null
      if (data?.type === 'meta-connected') {
        // eslint-disable-next-line no-console
        console.info('[MetaConnect] message received', { status: data.status })
        
        // Handle payment bridge messages
        if (data.status === 'payment-added') {
          setPaymentStatus('success')
          setStatus('finalizing')
          void hydrate()
        } else {
          // Handle other meta-connected messages (e.g., login completion)
          setStatus('finalizing')
          void hydrate()
        }
        
        if (timeoutId) { window.clearTimeout(timeoutId); setTimeoutId(null) }
      }
    }
    window.addEventListener('message', onMessage)
    const poll = window.setInterval(() => {
      try {
        if (popupRef && popupRef.closed && (status === 'authorizing' || status === 'finalizing')) {
          setStatus('idle')
          if (timeoutId) { window.clearTimeout(timeoutId); setTimeoutId(null) }
          window.clearInterval(poll)
        }
      } catch {}
    }, 500)
    return () => {
      window.removeEventListener('message', onMessage)
      window.clearInterval(poll)
    }
  }, [hydrate, popupRef, status, timeoutId])

  const onConnect = useCallback(() => {
    if (!campaign?.id) return
    setStatus('authorizing')
    // eslint-disable-next-line no-console
    console.info('[MetaConnect] opening login dialog')
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID || '1352055236432179'
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID
    const gv = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    const redirectUri = `${window.location.origin}/api/meta/auth/callback`
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
    const url = new URL(`https://www.facebook.com/${gv}/dialog/oauth`)
    url.searchParams.set('client_id', String(appId || ''))
    url.searchParams.set('config_id', configId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    const w = 720, h = 800
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2)
    const win = window.open(url.toString(), 'fb-login', `popup=yes,width=${w},height=${h},left=${left},top=${top}`)
    setPopupRef(win || null)
  }, [campaign?.id])

  // Facebook SDK type for payment dialog
  type FacebookSDK = {
    ui: (
      params: AdsPaymentParams,
      cb?: (response: AdsPaymentResponse) => void,
    ) => void
    getLoginStatus?: (cb: (res: FBLoginStatusResponse) => void, forceRefresh?: boolean) => void
    login?: (
      cb: (res: FBLoginStatusResponse) => void,
      opts?: { scope?: string; return_scopes?: boolean }
    ) => void
  }

  const waitForFacebookSDK = useCallback(async (): Promise<FacebookSDK | null> => {
    if (typeof window === 'undefined') return null
    const getFB = (): FacebookSDK | null => {
      const maybe = (window as unknown as { FB?: unknown }).FB
      if (maybe && typeof maybe === 'object' && maybe !== null && typeof (maybe as { ui?: unknown }).ui === 'function') {
        return maybe as FacebookSDK
      }
      return null
    }
    const existing = getFB()
    if (existing) return existing
    // Poll up to ~5s for SDK readiness
    return await new Promise<FacebookSDK | null>((resolve) => {
      let attempts = 0
      const iv = window.setInterval(() => {
        attempts += 1
        const fb = getFB()
        if (fb) {
          window.clearInterval(iv)
          resolve(fb)
        } else if (attempts >= 25) {
          window.clearInterval(iv)
          resolve(null)
        }
      }, 200)
    })
  }, [])

  // Detect FB SDK readiness early and check user login status
  // This ensures proper session handling for FB.ui dialogs
  useEffect(() => {
    if (typeof window === 'undefined') return
    const getFB = (): FacebookSDK | null => {
      const maybe = (window as unknown as { FB?: unknown }).FB
      if (maybe && typeof maybe === 'object' && maybe !== null && typeof (maybe as { ui?: unknown }).ui === 'function') {
        return maybe as FacebookSDK
      }
      return null
    }
    const checkSDK = () => {
      const fb = getFB()
      if (fb) {
        setSdkReady(true)
        // Check user login status for proper session handling
        if (typeof fb.getLoginStatus === 'function') {
          try {
            fb.getLoginStatus((response: FBLoginStatusResponse) => {
              setFbLoginStatus(response.status)
            }, false)
          } catch {
            // SDK ready but getLoginStatus failed, that's ok
          }
        }
        return true
      }
      return false
    }
    if (checkSDK()) return
    const iv = window.setInterval(() => {
      if (checkSDK()) { window.clearInterval(iv) }
    }, 200)
    return () => { window.clearInterval(iv) }
  }, [])

  /**
   * Open Facebook payment dialog using native FB.ui() method
   * Uses existing Business Login session (config_id flow) - no additional FB.login() needed
   * 
   * References: 
   *  - FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
   *  - Ads Payment Dialog: https://developers.facebook.com/docs/marketing-apis/guides/javascript-ads-dialog-for-payments/
   */
  const onAddPayment = useCallback(() => {
    if (!campaign?.id || !summary?.adAccount?.id) return

    // Proactively clear any legacy client-side state that might force a direct ads_payment URL open
    // instead of FB.ui dialog. This keeps the flow clean per Facebook's documentation.
    try {
      if (typeof window !== 'undefined') {
        const tryRemove = (store: Storage, key: string) => {
          try { store.removeItem(key) } catch {}
        }
        // Known or likely legacy keys from earlier experiments
        const legacyKeys = [
          'fb_access_token',
          'facebook_access_token',
          'meta_access_token',
          'meta_payment_url',
          'meta_ads_payment_url',
        ]
        legacyKeys.forEach((k) => {
          tryRemove(window.localStorage, k)
          tryRemove(window.sessionStorage, k)
        })
      }
    } catch {}

    // Get Facebook SDK instance
    const fb = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as FacebookSDK | null
    
    // Validate SDK is ready
    if (!fb || typeof fb.ui !== 'function') {
      window.alert('Facebook SDK is not ready yet. Please wait a moment and try again.')
      return
    }

    setPaymentStatus('opening')

    // Validate account ID and extract numeric ID (FB.ui requires numeric ID without 'act_' prefix)
    const accountIdStr = summary.adAccount.id
    const numericId = accountIdStr.replace(/^act_/i, '')
    if (!numericId || !/^\d+$/.test(numericId)) {
      window.alert('Invalid ad account ID. Please select a valid ad account.')
      return
    }

    // Capture values needed for nested functions to avoid TypeScript null issues
    const campaignId = campaign.id
    const adAccountId = summary.adAccount.id
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${numericId}`

    // Open payment dialog directly using FB.ui()
    // The Business Login (config_id flow) already authenticated the user with required permissions
    // Do NOT call FB.login() as it creates conflicts and loses user gesture context
    try {
      const appId = process.env.NEXT_PUBLIC_FB_APP_ID
      const fallbackUri = `${window.location.origin}/meta/payment-bridge`

      // Prepare FB.ui parameters per Facebook documentation
      // IMPORTANT: Do NOT include access_token - FB.ui uses session cookies automatically
      const params: AdsPaymentParams = {
        method: 'ads_payment',
        account_id: numericId,
        display: 'popup',
      }
      
      // Only add fallback_redirect_uri for error/cancel handling, not app_id
      // app_id is set via FB.init() and should not be passed again to avoid token conflicts
      if (fallbackUri) {
        params.fallback_redirect_uri = fallbackUri
      }

      console.info('[MetaConnect] Opening payment dialog with params:', { account_id: numericId, app_id: appId })

      // Open payment dialog using native FB.ui method
      // This uses the existing Business Login session automatically
      fb.ui(params, (response: AdsPaymentResponse) => {
        setPaymentStatus('processing')
        
        console.info('[FB.ui][ads_payment] Callback response:', response)
        
        // Handle response from Facebook dialog
        if (response?.error_message) {
          // Dialog returned an error
          setPaymentStatus('error')
          console.error('[FB.ui][ads_payment] Error:', response.error_message, response.error_code)
          
          // Provide user-friendly error message
          const errorMsg = response.error_message.includes('popup')
            ? 'Popup was blocked. Please allow popups for this site and try again.'
            : response.error_message.includes('login') || response.error_message.includes('session')
            ? 'Please ensure you are logged into Facebook and try again.'
            : `Failed to open payment dialog: ${response.error_message}`
          
          window.alert(errorMsg)
          return
        }

        // Success or user completed dialog (dialog may redirect to fallback_redirect_uri)
        // Note: FB.ui callback may fire before or after redirect depending on dialog flow
        if (response?.status === 'connected' || !response?.error_message) {
          setPaymentStatus('success')
          // Start polling for payment status immediately
          startPaymentStatusPolling()
        } else {
          // User cancelled or dialog closed without completion
          setPaymentStatus('idle')
          console.info('[FB.ui][ads_payment] Dialog closed without completion')
        }
      })
    } catch (error) {
      setPaymentStatus('error')
      console.error('[FB.ui][ads_payment] Exception:', error)
      window.alert('Failed to open payment dialog. Please try again or add payment method directly in Facebook Ads Manager.')
    }

    // Poll for payment connection status after dialog interaction
    function startPaymentStatusPolling() {
      const pollOnce = async (): Promise<boolean> => {
        try {
          const url = `/api/meta/payment/status?campaignId=${encodeURIComponent(campaignId)}&adAccountId=${encodeURIComponent(actId)}`
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) return false
          const json: unknown = await res.json()
          const connected = Boolean((json as { connected?: boolean } | null)?.connected)
          if (connected) {
            setPaymentStatus('success')
            await hydrate()
            return true
          }
        } catch (error) {
          console.warn('[MetaConnect] Payment status poll error:', error)
        }
        return false
      }

      // Start polling immediately with faster initial check
      void (async () => {
        // Immediate check
        if (await pollOnce()) return
        
        // Then poll every 1s (faster than before) up to 15 attempts (15s total)
        let attempts = 0
        const iv = window.setInterval(async () => {
          attempts += 1
          const ok = await pollOnce()
          if (ok || attempts >= 15) {
            window.clearInterval(iv)
            if (!ok) {
              setPaymentStatus('idle')
              console.warn('[MetaConnect] Payment status polling timed out')
            }
          }
        }, 1000)
      })()
    }
  }, [campaign?.id, hydrate, summary?.adAccount?.id])

  const _disconnect = useCallback(async () => {
    if (!campaign?.id) return
    const ok = window.confirm('Disconnect Meta from this campaign?')
    if (!ok) return
    setLoading(true)
    try {
      await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: campaign.id }) })
      setSummary(null)
      setStatus('idle')
    } finally { setLoading(false) }
  }, [campaign?.id])

  const isConnected = useMemo(() => (summary?.status === 'connected') && !!summary?.page, [summary?.status, summary?.page])
  const isSelectedAssets = useMemo(() => (summary?.status === 'selected_assets') && !!summary?.page, [summary?.status, summary?.page])

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {(isConnected || isSelectedAssets) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="icon-tile-muted">
              <Link2 className="h-4 w-4" />
            </div>
            <h3 className="font-semibold">Meta Connection</h3>
            {isConnected && <span className="inline-flex items-center gap-1 text-status-green ml-2"><Check className="h-4 w-4" />Connected</span>}
          </div>
          {isConnected && (
            mode === 'launch' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.dispatchEvent(new CustomEvent('gotoStep', { detail: { id: 'meta-connect' } }))}
                className="h-7 px-3"
              >
                Edit
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={_disconnect}
                className="h-7 px-3"
              >
                Disconnect
              </Button>
            )
          )}
        </div>
      )}

      {!isConnected && !isSelectedAssets && (
        <div className="rounded-lg border panel-surface p-3">
          {(status === 'authorizing' || status === 'finalizing') && loading ? (
            <div className="flex items-center gap-3">
              <div className="icon-tile-muted rounded-md flex items-center justify-center shrink-0">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Finalizing your Meta assets…</p>
                <p className="text-xs text-muted-foreground">This usually takes a few seconds.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="icon-tile-muted rounded-md flex items-center justify-center shrink-0">
                <Link2 className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Connect Facebook & Instagram</p>
                <p className="text-xs text-muted-foreground">Authenticate to pick your Business and Page</p>
              </div>
              <Button size="sm" onClick={onConnect} className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                Connect with Meta
              </Button>
            </div>
          )}
        </div>
      )}

      {(isConnected || isSelectedAssets) && summary && (
        <div className="space-y-1 text-sm rounded-lg border panel-surface p-3">
          {summary.business && (
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted rounded-md"><Building2 className="h-4 w-4 text-brand-blue" /></div>
              <div><span className="text-muted-foreground">Business:</span> <span className="font-medium">{summary.business.name}</span></div>
            </div>
          )}
          {summary.page && (
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted rounded-md"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></div>
              <div><span className="text-muted-foreground">Facebook:</span> <span className="font-medium">{summary.page.name}</span></div>
            </div>
          )}
          {summary.instagram && (
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted rounded-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24"><defs><linearGradient id="ig-grad-clean" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FD1D1D" /><stop offset="50%" stopColor="#E1306C" /><stop offset="100%" stopColor="#833AB4" /></linearGradient></defs><path fill="url(#ig-grad-clean)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM18.406 4.155a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </div>
              <div><span className="text-muted-foreground">Instagram:</span> <span className="font-medium">@{summary.instagram.username}</span></div>
            </div>
          )}
          {summary.adAccount && (
            <div className="flex items-center gap-2">
              <div className="icon-tile-muted rounded-md"><Building2 className="h-4 w-4 text-brand-blue" /></div>
              <div><span className="text-muted-foreground">Ad Account:</span> <span className="font-medium">{summary.adAccount.name}</span> <span className="text-muted-foreground">({summary.adAccount.id})</span></div>
            </div>
          )}
          {summary.adAccount && !summary.paymentConnected && (
            <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs text-blue-900 dark:text-blue-200">
                    {paymentStatus === 'opening' || paymentStatus === 'processing'
                      ? 'Opening payment dialog...'
                      : paymentStatus === 'success'
                      ? 'Payment method added successfully'
                      : 'Payment method required'}
                  </span>
                </div>
                <Button 
                  size="sm" 
                  onClick={onAddPayment} 
                  disabled={!sdkReady || paymentStatus === 'opening' || paymentStatus === 'processing'} 
                  className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentStatus === 'opening' || paymentStatus === 'processing' ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    'Add Payment'
                  )}
                </Button>
              </div>
              {/* Popup help and Ads Manager fallback per Facebook native guidance */}
              <div className="mt-2 text-[11px] leading-relaxed text-blue-900/80 dark:text-blue-200/80">
                <p>
                  If the popup doesn’t appear, allow popups for this site and facebook.com, then try again.
                </p>
                {summary?.adAccount?.id && (
                  <p className="mt-1">
                    Or add it directly in Ads Manager: {(() => {
                      const actId = summary.adAccount.id
                      const url = `https://business.facebook.com/settings/ad_accounts/${encodeURIComponent(actId)}/payment_methods`
                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-blue-700 dark:text-blue-300 hover:text-blue-900"
                        >
                          Open payment methods
                        </a>
                      )
                    })()}
                  </p>
                )}
              </div>
            </div>
          )}
          {!summary.adAccount && (
            <div className="pt-2">
              <Button variant="outline" size="sm" className="h-8 px-3">Select Ad Account</Button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}


