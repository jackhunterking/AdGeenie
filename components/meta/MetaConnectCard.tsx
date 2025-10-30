"use client"

import { Button } from "@/components/ui/button"
import { Link2, CreditCard, AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useCampaignContext } from "@/lib/context/campaign-context"

export function MetaConnectCard({ mode = 'launch' }: { mode?: 'launch' | 'step' }) {
  const enabled = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_ENABLE_META === 'true' : false
  const { campaign } = useCampaignContext()
  const [adAccountId, setAdAccountId] = useState<string | null>(null)
  const [addingPayment, setAddingPayment] = useState(false)
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
      const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
      if (!res.ok) return
      const j: Summary = await res.json()
      setSummary(j)
      setAdAccountId(j?.adAccount?.id ?? null)

      // Validate account status if ad account is selected
      if (j?.adAccount?.id) {
        setValidatingAccount(true)
        try {
          const statusRes = await fetch(
            `/api/meta/adaccount/status?campaignId=${encodeURIComponent(campaign.id)}&accountId=${encodeURIComponent(j.adAccount.id)}`,
            { cache: 'no-store' }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            setAccountValidation(statusData)
            console.log('[MetaConnect] Account validation:', statusData)
          } else {
            console.warn('[MetaConnect] Failed to validate account status')
          }
        } catch (error) {
          console.error('[MetaConnect] Account validation error:', error)
        } finally {
          setValidatingAccount(false)
        }
      }
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

  const onConnect = useCallback(() => {
    if (!enabled) return
    if (!campaign?.id) {
      window.alert('Missing campaign id')
      return
    }
    const fb = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as { login?: (cb: (r: unknown)=>void, opts: Record<string, unknown>) => void } | null
    if (!fb || typeof fb.login !== 'function') {
      window.alert('Facebook SDK is not ready yet. Please wait and try again.')
      return
    }
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!configId) {
      window.alert('Missing NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID')
      return
    }
    // Invoke SDK immediately on user gesture (per Facebook docs)
    fb.login(() => {}, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      return_scopes: true,
    } as unknown as Record<string, unknown>)
    // Perform side-effects after calling the SDK
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
  }, [enabled, campaign?.id])

  const onAddPayment = useCallback(() => {
    if (!enabled || !adAccountId || !campaign?.id) return

    const numericId = adAccountId.replace(/^act_/i, '')
    const campaignId = campaign.id
    const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${numericId}`

    // Validate account ID
    if (!numericId || !/^\d+$/.test(numericId)) {
      window.alert('Invalid ad account ID format. Please reconnect your Meta account.')
      return
    }

    // Get Facebook SDK
    const FB = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as { 
      ui?: (params: Record<string, unknown>, cb: (response: AdsPaymentResponse) => void) => void 
    } | null

    if (!FB || typeof FB.ui !== 'function') {
      window.alert('Facebook SDK is not ready yet. Please wait and try again.')
      return
    }

    if (!sdkReady) {
      window.alert('Facebook SDK is still loading. Please wait a moment and try again.')
      return
    }

    console.info('[MetaConnect] Opening payment dialog for account:', numericId)
    setPaymentStatus('opening')

    // CRITICAL: Use ONLY these 3 parameters per Facebook's official 2018 blog post
    // Reference: https://developers.facebook.com/blog/post/2018/05/24/add-payment-methods-with-facebook-javascript-sdk/
    // Adding extra parameters (like fallback_redirect_uri) forces redirect mode instead of popup mode
    const params = {
      method: 'ads_payment',
      account_id: numericId,
      display: 'popup'
    }

    console.info('[MetaConnect] FB.ui params (minimal):', params)

    // Call FB.ui with minimal parameters to ensure popup mode
    FB.ui(params, function(response: AdsPaymentResponse) {
      console.info('[FB.ui][ads_payment] Response:', response)

      // Handle no response (dialog closed or blocked)
      if (!response) {
        console.error('[FB.ui][ads_payment] No response received')
        setPaymentStatus('error')

        const adsManagerUrl = `https://business.facebook.com/settings/ad-accounts/${numericId}/payment_methods`
        window.alert(
          'Payment dialog was closed or blocked.\n\n' +
          'Please ensure popups are enabled, then try again.\n\n' +
          'Alternative: Add payment directly at:\n' + adsManagerUrl
        )
        return
      }

      // Handle error response
      if (response.error_code || response.error_message) {
        console.error('[FB.ui][ads_payment] Error:', response.error_code, response.error_message)
        setPaymentStatus('error')

        const adsManagerUrl = `https://business.facebook.com/settings/ad-accounts/${numericId}/payment_methods`
        window.alert(
          `Payment setup error: ${response.error_message || 'Unknown error'}\n\n` +
          'Add payment directly at:\n' + adsManagerUrl
        )
        return
      }

      // Success - start polling for payment
      console.info('[FB.ui][ads_payment] Success, polling for payment...')
      setPaymentStatus('processing')

      // Poll for payment status
      pollForPayment()
    })

    // Polling function
    function pollForPayment() {
      const poll = async (): Promise<boolean> => {
        try {
          const url = `/api/meta/payment/status?campaignId=${encodeURIComponent(campaignId)}&adAccountId=${encodeURIComponent(actId)}`
          const res = await fetch(url, { cache: 'no-store' })
          if (!res.ok) return false

          const json = await res.json()
          if (json.connected) {
            setPaymentStatus('success')
            await hydrate()
            return true
          }
        } catch (err) {
          console.warn('[MetaConnect] Poll error:', err)
        }
        return false
      }

      // Poll immediately
      void (async () => {
        if (await poll()) return

        // Then poll every 3 seconds for up to 2 minutes
        let attempts = 0
        const interval = setInterval(async () => {
          attempts++
          const success = await poll()

          if (success || attempts >= 40) {
            clearInterval(interval)
            if (!success) {
              setPaymentStatus('idle')
            }
          }
        }, 3000)
      })()
    }
  }, [enabled, adAccountId, campaign?.id, sdkReady, hydrate])

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
                ? `Business: ${summary?.business?.name ?? '—'} · Page: ${summary?.page?.name ?? '—'} · Ad Account: ${summary?.adAccount?.id ?? '—'}`
                : 'Click to start Business Login (disabled until rebuild completes).'}
            </p>
          </div>
          <Button size="sm" type="button" disabled={!enabled} onClick={onConnect} className="h-8 px-4">
            Connect with Meta
          </Button>
        </div>

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


