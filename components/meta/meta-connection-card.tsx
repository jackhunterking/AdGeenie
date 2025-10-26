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
import { Facebook, Check, Link2 } from "lucide-react"
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
            <Facebook className="h-4 w-4 text-blue-600" />
          </div>
          <h3 className="font-semibold">Meta Connection</h3>
        </div>
        <div className="flex items-center gap-3">
          {onEdit && (
            <button onClick={onEdit} className="text-xs text-blue-500 hover:underline">Edit</button>
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
              <div><span className="text-muted-foreground">Page:</span> <span className="font-medium">{summary.page.name}</span></div>
            )}
            {summary?.instagram && (
              <div><span className="text-muted-foreground">Instagram:</span> <span className="font-medium">@{summary.instagram.username}</span></div>
            )}
            {showAdAccount && summary?.adAccount && (
              <div><span className="text-muted-foreground">Ad Account:</span> <span className="font-medium">{summary.adAccount.name}</span> <span className="text-muted-foreground">({summary.adAccount.id})</span></div>
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


