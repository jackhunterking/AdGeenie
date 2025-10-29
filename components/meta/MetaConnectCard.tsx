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

    const numericId = adAccountId.replace(/^act_/i, '')

    // Log comprehensive debug info
    console.info('[MetaConnect] Opening payment dialog:', {
      accountId: numericId,
      accountStatus: accountValidation?.status,
      isActive: accountValidation?.isActive,
      hasFunding: accountValidation?.hasFunding,
      hasBusiness: accountValidation?.hasBusiness,
      capabilities: accountValidation?.capabilities,
      sdkReady,
    })

    setPaymentStatus('opening')

    const params = {
      method: 'ads_payment',
      account_id: numericId,
      display: 'popup'
    }

    fb.ui(params, (response: AdsPaymentResponse) => {
      setPaymentStatus('processing')

      // Log full response for debugging
      console.info('[FB.ui][ads_payment] Raw callback response:', JSON.stringify(response, null, 2))

      // Check if response is undefined/null (indicates dialog internal error)
      if (response === undefined || response === null) {
        setPaymentStatus('error')
        console.error('[FB.ui][ads_payment] Response is null/undefined - dialog failed to load')
        window.alert(
          'Facebook payment dialog failed to load properly.\n\n' +
          'Possible reasons:\n' +
          '• Ad account may not be fully accessible\n' +
          '• Browser popup blocker\n' +
          '• Missing Facebook permissions\n\n' +
          'Please add payment method directly in Facebook Ads Manager:\n' +
          `https://business.facebook.com/settings/ad-accounts/${numericId}/payment_methods`
        )
        return
      }

      // Check for error in response
      if (response?.error_message) {
        setPaymentStatus('error')
        console.error('[FB.ui][ads_payment] Error response:', {
          error_message: response.error_message,
          error_code: response.error_code,
          accountId: numericId,
          accountValidation: accountValidation,
        })
        window.alert(
          `Facebook payment setup failed:\n${response.error_message}\n\n` +
          `Please add payment method directly in Facebook Ads Manager:\n` +
          `https://business.facebook.com/settings/ad-accounts/${numericId}/payment_methods`
        )
        return
      }

      // Success - poll for payment status
      console.info('[FB.ui][ads_payment] Dialog completed, polling for payment status...')
      setPaymentStatus('success')

      // Poll payment status
      const pollPaymentStatus = async () => {
        try {
          const statusRes = await fetch(
            `/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(adAccountId)}`,
            { cache: 'no-store' }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            if (statusData.connected) {
              console.info('[MetaConnect] Payment connected successfully')
              void hydrate() // Refresh summary
            }
          }
        } catch (error) {
          console.error('[MetaConnect] Error polling payment status:', error)
        } finally {
          setPaymentStatus('idle')
        }
      }

      // Poll after a short delay
      setTimeout(() => {
        void pollPaymentStatus()
      }, 2000)
    })
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


