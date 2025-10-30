"use client"

/**
 * Feature: Meta connect and payments
 * Purpose: Open FB.ui `ads_payment` with correct params and verify result
 * References:
 *  - Facebook JS SDK FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Ad Account fields: https://developers.facebook.com/docs/marketing-api/reference/ad-account
 */

import { Button } from "@/components/ui/button"
import { Link2, CreditCard, AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { buildBusinessLoginUrl, generateRandomState } from "@/lib/meta/login"

export function MetaConnectCard({ mode = 'launch' }: { mode?: 'launch' | 'step' }) {
  const enabled = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_META === 'true' : false
  const { campaign } = useCampaignContext()
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  type Summary = {
    business?: { id: string; name?: string }
    page?: { id: string; name?: string }
    instagram?: { id: string; username?: string } | null
    adAccount?: { id: string; name?: string }
    paymentConnected?: boolean
    status?: string
    accountStatus?: number
    accountActive?: boolean
  }
  
  type AdsPaymentResponse = {
    error_message?: string
    error_code?: number
    success?: boolean
  }

  const [summary, setSummary] = useState<Summary | null>(null)
  const [sdkReady, setSdkReady] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'opening' | 'processing' | 'error' | 'success'>('idle')
  const [accountValidation, setAccountValidation] = useState<{
    isActive: boolean
    status: number | null
    disableReason?: string
    hasFunding?: boolean
    hasToSAccepted?: boolean
    hasBusiness?: boolean
    capabilities?: string[]
    error?: string
  } | null>(null)
  const [validatingAccount, setValidatingAccount] = useState(false)

  const hydrate = useCallback(async () => {
    if (!enabled || !campaign?.id) return
    setLoading(true)
    try {
      console.log('[MetaConnectCard] Hydrating meta connection for campaign:', campaign.id)
      const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
      if (!res.ok) {
        console.error('[MetaConnectCard] Failed to fetch selection:', {
          status: res.status,
          statusText: res.statusText,
          campaignId: campaign.id,
        })
        return
      }
      const j: Summary = await res.json()
      console.log('[MetaConnectCard] Selection data received:', {
        hasBusinessId: !!j?.business?.id,
        hasPageId: !!j?.page?.id,
        hasAdAccountId: !!j?.adAccount?.id,
        hasInstagram: !!j?.instagram?.id,
        paymentConnected: j?.paymentConnected,
        status: j?.status,
      })
      setSummary(j)
      setAdAccountId(j?.adAccount?.id ?? null)

      // Validate account status if ad account is selected
      if (j?.adAccount?.id) {
        setValidatingAccount(true)
        try {
          console.log('[MetaConnectCard] Validating ad account:', j.adAccount.id)
          const statusRes = await fetch(
            `/api/meta/adaccount/status?campaignId=${encodeURIComponent(campaign.id)}&accountId=${encodeURIComponent(j.adAccount.id)}`,
            { cache: 'no-store' }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            setAccountValidation(statusData)
            console.log('[MetaConnectCard] Account validation result:', {
              isActive: statusData.isActive,
              status: statusData.status,
              disableReason: statusData.disableReason,
              hasFunding: statusData.hasFunding,
            })
          } else {
            console.error('[MetaConnectCard] Account validation failed:', {
              status: statusRes.status,
              statusText: statusRes.statusText,
              accountId: j.adAccount.id,
            })
          }
        } catch (error) {
          console.error('[MetaConnectCard] Account validation error:', {
            error: error instanceof Error ? error.message : String(error),
            accountId: j.adAccount.id,
          })
        } finally {
          setValidatingAccount(false)
        }
      }
    } catch (error) {
      console.error('[MetaConnectCard] Hydration error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        campaignId: campaign.id,
      })
    } finally {
      setLoading(false)
    }
  }, [enabled, campaign?.id])

  useEffect(() => { void hydrate() }, [hydrate])

  // SDK Readiness Detection
  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => {
      const fb = (window as unknown as { FB?: { init?: unknown } }).FB
      if (fb && typeof fb.init === 'function') {
        setSdkReady(true)
      }
    }
    check()
    const interval = setInterval(check, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (url.searchParams.get('meta') === 'connected') {
      void hydrate()
      try {
        url.searchParams.delete('meta')
        window.history.replaceState(null, '', url.toString())
      } catch {}
    }
  }, [hydrate])

  // Listen for popup → parent postMessage from bridge page
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handler = (event: MessageEvent) => {
      try {
        if (event.origin !== window.location.origin) return
        const data = event.data as unknown
        const t = (data && typeof data === 'object' && data !== null ? (data as { type?: string }).type : undefined)
        if (t === 'META_CONNECTED' || t === 'meta-connected') {
          console.log('[MetaConnectCard] Received META_CONNECTED message; hydrating')
          void hydrate()
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [hydrate])

  const onConnect = useCallback(() => {
    console.log('[MetaConnectCard] Connect button clicked')
    if (!enabled) {
      console.error('[MetaConnectCard] Meta integration is disabled')
      return
    }
    if (!campaign?.id) {
      console.error('[MetaConnectCard] Missing campaign ID')
      window.alert('Missing campaign id')
      return
    }
    // We no longer depend on FB.login for Business Login; we build and open the URL manually
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!configId) {
      console.error('[MetaConnectCard] Missing Facebook config ID')
      window.alert('Missing NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID')
      return
    }
    
    const redirectUri = `${window.location.origin}/api/meta/auth/callback`
    const appId = process.env.NEXT_PUBLIC_FB_APP_ID as string | undefined
    const graphVersion = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
    if (!appId) {
      console.error('[MetaConnectCard] Missing NEXT_PUBLIC_FB_APP_ID')
      window.alert('Missing Facebook App ID')
      return
    }

    const state = generateRandomState(32)
    try { sessionStorage.setItem('meta_oauth_state', state) } catch {}

    const url = buildBusinessLoginUrl({
      appId,
      configId,
      redirectUri,
      graphVersion,
      state,
    })

    console.log('[MetaConnectCard] Initiating Meta login (manual URL):', {
      configId,
      graphVersion,
      redirectUri,
      campaignId: campaign.id,
      response_type: 'code',
      state_length: state.length,
      // Avoid logging full URL; show a redacted preview for diagnostics
      preview: url.replace(/state=[^&]+/, 'state=***'),
    })

    try {
      window.open(url, 'fb_biz_login', 'width=720,height=760')
    } catch (e) {
      console.error('[MetaConnectCard] Failed to open login popup:', e)
      window.location.href = url
    }

    // Perform side-effects after calling the SDK
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
    console.log('[MetaConnectCard] Cookie set:', { campaignId: campaign.id, expires })
  }, [enabled, campaign?.id])

  const onDisconnect = useCallback(async () => {
    console.log('[MetaConnectCard] Disconnect button clicked')
    if (!enabled || !campaign?.id) {
      console.error('[MetaConnectCard] Cannot disconnect - meta disabled or no campaign ID')
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to disconnect your Meta account?\n\n' +
      'This will remove all connected business, page, and ad account information. ' +
      'You will need to reconnect to continue using Meta integration.'
    )

    if (!confirmed) {
      console.log('[MetaConnectCard] Disconnect cancelled by user')
      return
    }

    console.log('[MetaConnectCard] Disconnecting campaign:', campaign.id)
    setLoading(true)
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('[MetaConnectCard] Disconnect failed:', {
          status: res.status,
          error: error.error,
          campaignId: campaign.id,
        })
        window.alert(`Failed to disconnect: ${error.error || 'Unknown error'}`)
        return
      }

      // Clear local state
      setSummary(null)
      setAdAccountId(null)
      setAccountValidation(null)
      setPaymentStatus('idle')

      console.log('[MetaConnectCard] Successfully disconnected Meta account')

      // Refresh to get updated state
      await hydrate()
    } catch (error) {
      console.error('[MetaConnectCard] Error disconnecting:', {
        error: error instanceof Error ? error.message : String(error),
        campaignId: campaign.id,
      })
      window.alert('Failed to disconnect Meta account. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [enabled, campaign?.id, hydrate])

  const onAddPayment = useCallback(() => {
    if (!enabled || !adAccountId || !campaign?.id) return

    // Check SDK readiness
    const fb = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as { ui?: (params: Record<string, unknown>, cb: (response: AdsPaymentResponse) => void) => void } | null
    if (!fb || typeof fb.ui !== 'function') {
      window.alert('Facebook SDK is not ready yet. Please wait and try again.')
      return
    }

    if (!sdkReady) {
      window.alert('Facebook SDK is still loading. Please wait a moment and try again.')
      return
    }

    // Log account validation status
    console.info('[MetaConnect] Account validation before payment:', accountValidation)

    // Warn if account validation failed or shows issues
    if (accountValidation && !accountValidation.isActive) {
      const reason = accountValidation.disableReason || 'unknown reason'
      const confirmMsg = `Warning: Ad account appears to be inactive (status: ${accountValidation.status}, reason: ${reason}).\n\nThis may cause the payment dialog to fail. Do you want to try anyway?`
      if (!window.confirm(confirmMsg)) {
        return
      }
    }

    // Normalize to act_ form (FB accepts this directly in FB.ui)
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`
    const idNoPrefix = actId.replace(/^act_/i, '')

    // Verify we have the minimum required data
    if (!idNoPrefix || !/^\d+$/.test(idNoPrefix)) {
      console.error('[MetaConnect] Invalid account ID format:', actId)
      window.alert('Invalid ad account ID format. Please reconnect your Meta account.')
      return
    }

    // Log comprehensive debug info
    console.info('[MetaConnect] Opening payment dialog:', {
      accountId: idNoPrefix,
      accountStatus: accountValidation?.status,
      isActive: accountValidation?.isActive,
      hasFunding: accountValidation?.hasFunding,
      hasBusiness: accountValidation?.hasBusiness,
      capabilities: accountValidation?.capabilities,
      sdkReady,
    })

    // Log pre-flight check
    console.info('[MetaConnect] Pre-flight check passed:', {
      accountId: idNoPrefix,
      accountActive: accountValidation?.isActive,
      accountStatus: accountValidation?.status,
      hasBusiness: accountValidation?.hasBusiness,
      sdkReady,
      campaignId: campaign.id,
    })

    setPaymentStatus('opening')

    // Hard-code v3.0 dialog URL (manual open) as a test for dialog availability
    try {
      const dialogVersion = 'v3.0'
      const appId = process.env.NEXT_PUBLIC_FB_APP_ID || ''
      const bridge = `${window.location.origin}/meta/payment-bridge`
      const url = new URL(`https://www.facebook.com/${dialogVersion}/dialog/ads_payment`)
      url.searchParams.set('account_id', actId)
      if (appId) url.searchParams.set('app_id', appId)
      url.searchParams.set('display', 'popup')
      url.searchParams.set('fallback_redirect_uri', bridge)
      url.searchParams.set('locale', 'en_US')

      console.info('[MetaConnect] Opening manual ads_payment dialog:', {
        dialogVersion,
        accountId: idNoPrefix,
        url: url.toString().replace(/(app_id=)[^&]+/, '$1***'),
      })

      try {
        window.open(url.toString(), 'fb_ads_payment', 'width=720,height=760')
      } catch (e) {
        // If popup blocked, navigate current window
        window.location.href = url.toString()
      }
    } catch (e) {
      console.error('[MetaConnect] Failed to construct manual ads_payment URL:', e)
      setPaymentStatus('error')
      return
    }

    // Server-side verification fallback (works even without FB.ui callback)
    void (async () => {
      try {
        // give FB a moment to process
        await new Promise((r) => setTimeout(r, 3000))
        const verify = await fetch(`/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(actId)}`, { cache: 'no-store' })
        if (verify.ok) {
          const json = await verify.json() as { connected?: boolean }
          if (json?.connected) {
            console.info('[MetaConnect] Server verified payment connected; hydrating')
            setPaymentStatus('success')
            void hydrate()
          }
        }
      } catch {/* empty */}
    })()
  }, [enabled, adAccountId, campaign?.id, sdkReady, accountValidation, hydrate])

  return (
    <div className="rounded-lg border panel-surface p-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="icon-tile-muted rounded-md flex items-center justify-center shrink-0">
            <Link2 className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Connect Facebook & Instagram</p>
            <p className="text-xs text-muted-foreground">
              {!enabled
                ? 'This feature is currently disabled.'
                : loading
                ? 'Loading your Meta assets…'
                : (summary?.status === 'connected' || summary?.status === 'selected_assets')
                ? 'Connected - manage your connection below'
                : 'Connect to start advertising on Facebook & Instagram'}
            </p>
          </div>
          {(summary?.status === 'connected' || summary?.status === 'selected_assets' || summary?.business?.id || summary?.page?.id || summary?.adAccount?.id) ? (
            <Button 
              size="sm" 
              type="button" 
              disabled={!enabled || loading} 
              onClick={onDisconnect} 
              variant="outline"
              className="h-8 px-4"
            >
              Disconnect
            </Button>
          ) : (
            <Button 
              size="sm" 
              type="button" 
              disabled={!enabled || loading} 
              onClick={onConnect} 
              className="h-8 px-4"
            >
              Connect with Meta
            </Button>
          )}
        </div>

        {/* Business Details Card */}
        {(summary?.business?.id || summary?.page?.id || summary?.adAccount?.id) && (
          <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 space-y-2">
            <div className="text-xs font-medium text-green-900 dark:text-green-200">
              Connected Accounts
            </div>
            <div className="space-y-1.5">
              {summary.business?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Business:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.business.name || summary.business.id}
                  </span>
                </div>
              )}
              {summary.page?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Page:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.page.name || summary.page.id}
                  </span>
                </div>
              )}
              {summary.instagram?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Instagram:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    @{summary.instagram.username || summary.instagram.id}
                  </span>
                </div>
              )}
              {summary.adAccount?.id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Ad Account:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">
                    {summary.adAccount.name || summary.adAccount.id}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {summary?.adAccount && !summary?.paymentConnected ? (
          <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3 space-y-3">
            {/* Show account validation status */}
            {validatingAccount && (
              <div className="text-xs text-blue-700 dark:text-blue-300">
                Validating ad account...
              </div>
            )}
            
            {accountValidation && !accountValidation.isActive && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded">
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="h-3 w-3" />
                  Account Status Issue
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Status: {accountValidation.status} {accountValidation.disableReason && `(${accountValidation.disableReason})`}
                </div>
                <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  This may prevent payment setup.{' '}
                  <a
                    href={`https://business.facebook.com/settings/ad-accounts/${summary.adAccount.id.replace('act_', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-medium"
                  >
                    Check Business Settings →
                  </a>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-900 dark:text-blue-200">Payment method required</span>
              </div>
              <Button
                size="sm"
                onClick={onAddPayment}
                disabled={!sdkReady || paymentStatus === 'opening' || paymentStatus === 'processing'}
                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {paymentStatus === 'opening' || paymentStatus === 'processing' ? 'Opening...' : 'Add Payment'}
              </Button>
            </div>

            {/* Helper text with direct link to Ads Manager */}
            <div className="text-xs text-blue-700 dark:text-blue-300">
              If dialog fails, add payment directly in{' '}
              <a
                href={`https://business.facebook.com/settings/ad-accounts/${summary.adAccount.id.replace('act_', '')}/payment_methods`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                Facebook Ads Manager →
              </a>
            </div>
          </div>
        ) : summary?.paymentConnected ? (
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300">Payment method connected</span>
            </div>
          </div>
        ) : null}

        {!enabled && (
          <p className="text-[11px] text-muted-foreground">
            Meta integration is disabled. Set NEXT_PUBLIC_ENABLE_META=true to begin the clean rebuild.
          </p>
        )}
    </div>
  )
}


