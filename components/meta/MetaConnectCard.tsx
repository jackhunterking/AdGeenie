"use client"

/**
 * Feature: Meta Connect Card (clean state machine)
 * Purpose: Deterministic popup flow → persist in callback → hydrate once → show assets
 * References:
 *  - Facebook Business Login: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Link2, Check, Building2, CreditCard, Loader2 } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"

type Status = 'idle' | 'authorizing' | 'finalizing' | 'connected' | 'error'

interface Summary {
  business?: { id: string; name: string }
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
  paymentConnected?: boolean
  status?: string
}

export function MetaConnectCard() {
  const { campaign } = useCampaignContext()
  const [status, setStatus] = useState<Status>('idle')
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [popupRef, setPopupRef] = useState<Window | null>(null)
  const [timeoutId, setTimeoutId] = useState<number | null>(null)

  const hydrate = useCallback(async () => {
    if (!campaign?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
      if (!res.ok) return
      const j = await res.json() as Summary
      setSummary(j)
      if (j?.status === 'connected') setStatus('connected')
    } finally {
      setLoading(false)
    }
  }, [campaign?.id])

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
      if (e?.data && typeof e.data === 'object' && (e.data as { type?: string }).type === 'meta-connected') {
        setStatus('finalizing')
        void hydrate()
        if (timeoutId) { window.clearTimeout(timeoutId); setTimeoutId(null) }
        try { popupRef && !popupRef.closed && popupRef.close() } catch {}
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
    const id = window.setTimeout(() => {
      setStatus('idle')
      try { win && !win.closed && win.close() } catch {}
    }, 20000)
    setTimeoutId(id)
  }, [campaign?.id])

  // Minimal FB SDK surface used here
  type FacebookSDK = {
    ui: (
      params: { method: 'ads_payment'; display?: 'popup'; account_id: string },
      cb?: (response: unknown) => void,
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

  const onAddPayment = useCallback(async () => {
    if (!campaign?.id || !summary?.adAccount?.id) return
    const fb = await waitForFacebookSDK()
    if (!fb) {
      // Provide a light feedback without throwing
      window.alert('Facebook SDK did not load. Please refresh and try again.')
      return
    }

    // Numeric id for FB.ui
    const numericId = summary.adAccount.id.replace(/^act_/i, '')
    try {
      fb.ui({ method: 'ads_payment', display: 'popup', account_id: numericId })
    } catch {
      // If the SDK throws for any reason, fail softly
    }

    // Poll server for funding_source and persist when connected
    const actId = summary.adAccount.id.startsWith('act_') ? summary.adAccount.id : `act_${numericId}`
    const pollOnce = async (): Promise<boolean> => {
      try {
        const url = `/api/meta/payment/status?campaignId=${encodeURIComponent(campaign.id)}&adAccountId=${encodeURIComponent(actId)}`
        const res = await fetch(url, { cache: 'no-store' })
        if (!res.ok) return false
        const json: unknown = await res.json()
        const connected = Boolean((json as { connected?: boolean } | null)?.connected)
        if (connected) {
          await hydrate()
          return true
        }
      } catch {
        // ignore and continue polling
      }
      return false
    }

    void (async () => {
      if (await pollOnce()) return
      let attempts = 0
      const iv = window.setInterval(async () => {
        attempts += 1
        const ok = await pollOnce()
        if (ok || attempts >= 15) {
          window.clearInterval(iv)
        }
      }, 2000)
    })()
  }, [campaign?.id, hydrate, summary?.adAccount?.id, waitForFacebookSDK])

  const disconnect = useCallback(async () => {
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Link2 className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
          {isConnected && <span className="inline-flex items-center gap-1 text-status-green ml-2"><Check className="h-4 w-4" />Connected</span>}
        </div>
        {isConnected && <Button variant="ghost" size="sm" onClick={disconnect} className="h-7 px-3">Disconnect</Button>}
      </div>

      {!isConnected && !isSelectedAssets && (
        <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border">
          {(status === 'authorizing' || status === 'finalizing') && loading ? (
            <>
              <div className="icon-tile-muted rounded-2xl h-20 w-20 flex items-center justify-center mb-4">
                <Loader2 className="h-10 w-10 animate-spin" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold">Finalizing your Meta assets…</h3>
                <p className="text-sm text-muted-foreground">This usually takes a few seconds.</p>
              </div>
            </>
          ) : (
            <>
              <div className="icon-tile-muted rounded-2xl h-20 w-20 flex items-center justify-center mb-4">
                <Link2 className="h-10 w-10" />
              </div>
              <div className="text-center space-y-2 mb-4">
                <h3 className="text-xl font-semibold">Connect Facebook & Instagram</h3>
                <p className="text-sm text-muted-foreground">Authenticate to pick your Business and Page</p>
              </div>
              <Button size="lg" onClick={onConnect} className="bg-blue-600 hover:bg-blue-700 text-white px-8">Connect with Meta</Button>
            </>
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
                <div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" /><span className="text-xs text-blue-900 dark:text-blue-200">Payment method required</span></div>
                <Button size="sm" onClick={onAddPayment} className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white">Add Payment</Button>
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


