"use client"

import { Button } from "@/components/ui/button"
import { Link2, CreditCard } from "lucide-react"
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
  }
  const [summary, setSummary] = useState<Summary | null>(null)

  const hydrate = useCallback(async () => {
    if (!enabled || !campaign?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
      if (!res.ok) return
      const j: Summary = await res.json()
      setSummary(j)
      setAdAccountId(j?.adAccount?.id ?? null)
    } finally {
      setLoading(false)
    }
  }, [enabled, campaign?.id])

  useEffect(() => { void hydrate() }, [hydrate])

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
    // Set short-lived cookie for callback to associate campaign
    const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
    document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID
    if (!configId) {
      window.alert('Missing NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID')
      return
    }
    fb.login(() => {}, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      return_scopes: true,
    } as unknown as Record<string, unknown>)
  }, [enabled, campaign?.id])

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

        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs">Payment method{summary?.paymentConnected ? ' · Connected' : ''}</span>
          </div>
          <Button size="sm" type="button" disabled={!enabled || !adAccountId} onClick={() => {
            if (!enabled || !adAccountId) return
            const fb = (typeof window !== 'undefined' ? (window as unknown as { FB?: unknown }).FB : null) as unknown as { ui?: (params: Record<string, unknown>) => void } | null
            if (!fb || typeof fb.ui !== 'function') { window.alert('Facebook SDK not ready'); return }
            const numericId = adAccountId.replace(/^act_/i, '')
            fb.ui({ method: 'ads_payment', account_id: numericId, display: 'popup' })
          }}>
            Add Payment
          </Button>
        </div>

        {!enabled && (
          <p className="text-[11px] text-muted-foreground">
            Meta integration is disabled. Set NEXT_PUBLIC_ENABLE_META=true to begin the clean rebuild.
          </p>
        )}
    </div>
  )
}


