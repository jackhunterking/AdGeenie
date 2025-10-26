"use client"

/**
 * Feature: Meta Connection Card (Reusable)
 * Purpose: Display a unified, read-only summary of connected Meta assets
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API Reference: https://developers.facebook.com/docs/graph-api/reference
 */

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Check, Link2, Building2 } from "lucide-react"
import { useCampaignContext } from "@/lib/context/campaign-context"

interface MetaSummary {
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
}

interface MetaConnectionCardProps {
  showAdAccount?: boolean
  onManage?: () => void
  onEdit?: () => void
}

export function MetaConnectionCard({ showAdAccount = false, onManage, onEdit }: MetaConnectionCardProps) {
  const { campaign } = useCampaignContext()
  const [summary, setSummary] = useState<MetaSummary | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      if (!campaign?.id) return
      setLoading(true)
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/state`)
        if (!res.ok) return
        const { state } = (await res.json()) as { state?: { meta_connect_data?: unknown } }
        const data = (state?.meta_connect_data ?? null) as Record<string, unknown> | null
        if (data && typeof data === "object") {
          // Normalize from either structured summary or legacy flat fields
          const page = (data.page as MetaSummary["page"]) || (typeof data.pageId === "string" ? { id: String(data.pageId), name: String((data as Record<string, unknown>).pageName ?? "Page") } : undefined)
          const instagram = (data.instagram as MetaSummary["instagram"]) ?? (typeof (data as Record<string, unknown>).igUserId === "string" ? { id: String((data as Record<string, unknown>).igUserId), username: String((data as Record<string, unknown>).igUsername ?? "") } : null)
          const adAccount = (data.adAccount as MetaSummary["adAccount"]) || (typeof (data as Record<string, unknown>).adAccountId === "string" ? { id: String((data as Record<string, unknown>).adAccountId), name: String((data as Record<string, unknown>).adAccountName ?? "Ad Account") } : undefined)
          setSummary({ page, instagram, adAccount })
        }
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [campaign?.id])

  const isConnected = useMemo(() => Boolean(summary?.page && (summary?.adAccount || !showAdAccount)), [summary, showAdAccount])

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Link2 className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="h-7 px-3">Edit</Button>
          )}
          <div className="inline-flex items-center gap-1 text-sm">
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-green-600"><Check className="h-4 w-4" />Connected</span>
            ) : (
              <span className="text-muted-foreground">Not connected</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        {loading ? (
          <div className="text-muted-foreground">Loading...</div>
        ) : (
          <>
            {summary?.page && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                  {/* Facebook brand logo (filled blue f) */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </div>
                <div>
                  <span className="text-muted-foreground">Page:</span> <span className="font-medium">{summary.page.name}</span>
                </div>
              </div>
            )}
            {summary?.instagram && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-pink-500/10 flex items-center justify-center">
                  {/* Instagram gradient logo */}
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stop-color="#FD1D1D" />
                        <stop offset="50%" stop-color="#E1306C" />
                        <stop offset="100%" stop-color="#833AB4" />
                      </linearGradient>
                    </defs>
                    <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </div>
                <div>
                  <span className="text-muted-foreground">Instagram:</span> <span className="font-medium">@{summary.instagram.username}</span>
                </div>
              </div>
            )}
            {showAdAccount && summary?.adAccount && (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <span className="text-muted-foreground">Ad Account:</span> <span className="font-medium">{summary.adAccount.name}</span> <span className="text-muted-foreground">({summary.adAccount.id})</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {onManage && (
        <div className="mt-4 flex justify-end">
          <Button variant="outline" className="gap-2" onClick={onManage}>
            <Link2 className="h-4 w-4" /> Manage Connection
          </Button>
        </div>
      )}
    </div>
  )
}


