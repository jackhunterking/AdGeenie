"use client"

/**
 * Feature: Meta Connection Card (Reusable)
 * Purpose: Display a unified summary of Meta connection and manage actions (connect, select Ad Account, disconnect)
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API Reference: https://developers.facebook.com/docs/graph-api/reference
 *  - Business owned ad accounts: https://developers.facebook.com/docs/marketing-api/businessmanager#owned_ad_accounts
 *  - AI SDK Core: https://ai-sdk.dev/docs/introduction
 *  - AI Elements: https://ai-sdk.dev/elements/overview
 *  - Vercel AI Gateway: https://vercel.com/docs/ai-gateway
 *  - Supabase: https://supabase.com/docs
 */

import { useEffect, useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Link2, Building2, CreditCard } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { fbBusinessLoginWithSdk } from '@/lib/utils/facebook-sdk'

interface MetaSummary {
  business?: { id: string; name: string }
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
}

interface AdAccount { id: string; name?: string; currency?: string; account_status?: number }

interface MetaConnectionCardProps {
  showAdAccount?: boolean
  onEdit?: () => void
  actionLabel?: string
}

export function MetaConnectionCard({ showAdAccount = false, onEdit, actionLabel }: MetaConnectionCardProps) {
  const { campaign, loadCampaign } = useCampaignContext()
  const [summary, setSummary] = useState<MetaSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentConnected, setPaymentConnected] = useState<boolean>(false)
  const [adAcctDialogOpen, setAdAcctDialogOpen] = useState(false)
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [adAccountsLoading, setAdAccountsLoading] = useState(false)
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string>("")

  useEffect(() => {
    const hydrate = async () => {
      if (!campaign?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json() as {
          status?: string
          business?: { id: string; name: string }
          page?: { id: string; name: string }
          instagram?: { id: string; username: string } | null
          adAccount?: { id: string; name: string }
          paymentConnected?: boolean
        }
        setSummary({ business: j.business, page: j.page, instagram: j.instagram ?? null, adAccount: j.adAccount })
        setPaymentConnected(Boolean(j.paymentConnected))
      } finally {
        setLoading(false)
      }
    }

    hydrate()

    // Refresh when returning from Meta dialog (?meta=connected) and when tab becomes visible
    const onVisibility = () => { if (document.visibilityState === 'visible') hydrate() }
    const onPopstate = () => { hydrate() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('popstate', onPopstate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('popstate', onPopstate)
    }
  }, [campaign?.id])

  const connectionState: 'not_connected' | 'assets_selected' | 'connected' = useMemo(() => {
    if (!summary?.page) return 'not_connected'
    if (showAdAccount && !summary.adAccount) return 'assets_selected'
    return 'connected'
  }, [summary, showAdAccount])

  const isConnected = connectionState === 'connected'

  const openConnect = useCallback(() => {
    const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID || '1352055236432179'
    // Set cookie to bring the user back to the campaign page
    if (campaign?.id) {
      const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
      document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
    }
    fbBusinessLoginWithSdk(configId)
  }, [campaign?.id])

  const connectPayment = useCallback(async () => {
    if (!summary?.adAccount?.id) return
    if (!window.FB) return
    window.FB.ui({ method: 'ads_payment', account_id: summary.adAccount.id }, async (resp: unknown) => {
      const ok = Boolean(resp)
      if (!campaign?.id) return
      await fetch('/api/meta/payment/mark', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, adAccountId: summary.adAccount?.id, connected: ok })
      })
      setPaymentConnected(ok)
    })
  }, [summary?.adAccount?.id, campaign?.id])

  const openSelectAdAccount = useCallback(async () => {
    if (!campaign?.id || !summary?.business?.id) return
    setAdAccountsLoading(true)
    try {
      const params = new URLSearchParams({
        campaignId: campaign.id,
        businessId: summary.business.id,
      })
      if (summary.page?.id) params.append('pageId', summary.page.id)
      const res = await fetch(`/api/meta/business/adaccounts?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) {
        const j = await res.json() as { adAccounts?: AdAccount[] }
        setAdAccounts(Array.isArray(j.adAccounts) ? j.adAccounts : [])
      } else {
        setAdAccounts([])
      }
      setAdAcctDialogOpen(true)
    } finally {
      setAdAccountsLoading(false)
    }
  }, [campaign?.id, summary?.business?.id, summary?.page?.id])

  const saveSelectedAdAccount = useCallback(async () => {
    if (!campaign?.id || !summary?.business?.id || !summary?.page?.id || !selectedAdAccountId) return
    const selected = adAccounts.find(a => a.id === selectedAdAccountId)
    setLoading(true)
    try {
      const res = await fetch('/api/meta/selection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          businessId: summary.business.id,
          businessName: summary.business.name,
          pageId: summary.page.id,
          pageName: summary.page.name,
          igUserId: summary.instagram?.id || null,
          igUsername: summary.instagram?.username || null,
          adAccountId: selectedAdAccountId,
          adAccountName: selected?.name || null,
        })
      })
      if (res.ok) {
        // Rehydrate
        const sel = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
        if (sel.ok) {
          const j = await sel.json() as { business?: { id: string; name: string }; page?: { id: string; name: string }; instagram?: { id: string; username: string } | null; adAccount?: { id: string; name: string }; paymentConnected?: boolean }
          setSummary({ business: j.business, page: j.page, instagram: j.instagram ?? null, adAccount: j.adAccount })
          setPaymentConnected(Boolean(j.paymentConnected))
        }
        setAdAcctDialogOpen(false)
        setSelectedAdAccountId("")
        if (campaign?.id) await loadCampaign(campaign.id)
      }
    } finally {
      setLoading(false)
    }
  }, [adAccounts, campaign?.id, loadCampaign, selectedAdAccountId, summary?.business?.id, summary?.business?.name, summary?.instagram?.id, summary?.instagram?.username, summary?.page?.id, summary?.page?.name])

  const disconnect = useCallback(async () => {
    if (!campaign?.id) return
    const ok = window.confirm('Disconnect Meta from this campaign? You can reconnect anytime.')
    if (!ok) return
    setLoading(true)
    try {
      const res = await fetch('/api/meta/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: campaign.id }) })
      if (res.ok) {
        setSummary(null)
        setPaymentConnected(false)
        if (campaign?.id) await loadCampaign(campaign.id)
      }
    } finally {
      setLoading(false)
    }
  }, [campaign?.id, loadCampaign])

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Link2 className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
          <div className="inline-flex items-center gap-1 text-sm ml-2">
            {connectionState === 'connected' && (
              <span className="inline-flex items-center gap-1 text-status-green"><Check className="h-4 w-4" />Connected</span>
            )}
            {connectionState === 'assets_selected' && (
              <span className="inline-flex items-center gap-1 text-amber-500">Assets selected</span>
            )}
            {connectionState === 'not_connected' && (
              <span className="text-muted-foreground">Not connected</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connectionState === 'not_connected' && (
            <Button variant="outline" size="sm" onClick={onEdit ?? openConnect} className="h-7 px-3">{actionLabel || 'Connect with Meta'}</Button>
          )}
          {connectionState === 'assets_selected' && (
            <Button variant="outline" size="sm" onClick={openSelectAdAccount} className="h-7 px-3">Select Ad Account</Button>
          )}
          {connectionState === 'connected' && (
            <Button variant="outline" size="sm" onClick={onEdit ?? openConnect} className="h-7 px-3">{actionLabel || 'Edit Connection'}</Button>
          )}
          {(connectionState === 'assets_selected' || connectionState === 'connected') && (
            <Button variant="ghost" size="sm" onClick={disconnect} className="h-7 px-3">Disconnect</Button>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm rounded-lg border panel-surface p-3">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
            {summary?.business && (
              <div className="flex items-center gap-2">
                <div className="icon-tile-muted rounded-md">
                  <Building2 className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <span className="text-muted-foreground">Business:</span> <span className="font-medium">{summary.business.name}</span>
                </div>
              </div>
            )}
            {summary?.page && (
              <div className="flex items-center gap-2">
                <div className="icon-tile-muted rounded-md">
                  {/* Facebook brand logo (filled) */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div>
                  <span className="text-muted-foreground">Facebook:</span> <span className="font-medium">{summary.page.name}</span>
                </div>
              </div>
            )}
            {summary?.instagram && (
              <div className="flex items-center gap-2">
                <div className="icon-tile-muted rounded-md">
                  {/* Instagram gradient logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="ig-grad-meta-card" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FD1D1D" />
                        <stop offset="50%" stopColor="#E1306C" />
                        <stop offset="100%" stopColor="#833AB4" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#ig-grad-meta-card)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM18.406 4.155a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <div>
                  <span className="text-muted-foreground">Instagram:</span> <span className="font-medium">@{summary.instagram.username}</span>
                </div>
              </div>
            )}
            {showAdAccount && summary?.adAccount && (
              <div className="flex items-center gap-2">
                <div className="icon-tile-muted rounded-md">
                  <Building2 className="h-4 w-4 text-brand-blue" />
                </div>
                <div>
                  <span className="text-muted-foreground">Ad Account:</span> <span className="font-medium">{summary.adAccount.name}</span> <span className="text-muted-foreground">({summary.adAccount.id})</span>
                </div>
              </div>
            )}
            {showAdAccount && summary?.adAccount && !paymentConnected && (
              <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-blue-900 dark:text-blue-200">Payment method required</span>
                  </div>
                  <Button size="sm" onClick={connectPayment} className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white">Add Payment</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Select Ad Account Dialog */}
      <Dialog open={adAcctDialogOpen} onOpenChange={setAdAcctDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle>Select Ad Account</DialogTitle>
          </DialogHeader>
          <div className="px-4 pb-2">
            {adAccountsLoading ? (
              <div className="text-sm text-muted-foreground">Loading ad accounts…</div>
            ) : adAccounts.length === 0 ? (
              <div className="text-sm text-muted-foreground">No ad accounts available for the selected business.</div>
            ) : (
              <div className="max-w-sm">
                <Select value={selectedAdAccountId} onValueChange={setSelectedAdAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an ad account" />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name || a.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="p-4 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setAdAcctDialogOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!selectedAdAccountId || adAccountsLoading} onClick={saveSelectedAdAccount}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}


