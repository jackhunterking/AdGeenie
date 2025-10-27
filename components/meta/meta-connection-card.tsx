"use client"

/**
 * Feature: Meta Connection Card (Reusable)
 * Purpose: Display a unified, read-only summary of connected Meta assets
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API Reference: https://developers.facebook.com/docs/graph-api/reference
 */

import { useEffect, useMemo, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Check, Link2, Building2, CreditCard } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"
import { fbBusinessLoginWithSdk } from '@/lib/utils/facebook-sdk'

interface MetaSummary {
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
}

interface MetaConnectionCardProps {
  showAdAccount?: boolean
  onEdit?: () => void
  actionLabel?: string
}

export function MetaConnectionCard({ showAdAccount = false, onEdit, actionLabel }: MetaConnectionCardProps) {
  const { campaign } = useCampaignContext()
  const [summary, setSummary] = useState<MetaSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentConnected, setPaymentConnected] = useState<boolean>(false)

  useEffect(() => {
    const hydrate = async () => {
      if (!campaign?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/meta/selection?campaignId=${encodeURIComponent(campaign.id)}`, { cache: 'no-store' })
        if (!res.ok) return
        const j = await res.json() as {
          status?: string
          page?: { id: string; name: string }
          instagram?: { id: string; username: string } | null
          adAccount?: { id: string; name: string }
          paymentConnected?: boolean
        }
        setSummary({ page: j.page, instagram: j.instagram ?? null, adAccount: j.adAccount })
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

  const isConnected = useMemo(() => Boolean(summary?.page && (summary?.adAccount || !showAdAccount)), [summary, showAdAccount])

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

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="icon-tile-muted">
            <Link2 className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
          <div className="inline-flex items-center gap-1 text-sm ml-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-status-green"><Check className="h-4 w-4" />Connected</span>
            ) : (
              <span className="text-muted-foreground">Not connected</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onEdit ?? openConnect} className="h-7 px-3">{actionLabel || (isConnected ? 'Edit Connection' : 'Connect with Meta')}</Button>
        </div>
      </div>

      <div className="space-y-1 text-sm rounded-lg border panel-surface p-3">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
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

    </div>
  )
}


