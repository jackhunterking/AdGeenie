"use client"

/**
 * Feature: Meta Connect Step – Two Card Flow
 * Purpose: Card A (Business/Page/IG) → Card B (Ad Account/Payment)
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - FB.ui payments: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { useEffect, useState } from 'react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { useBudget } from '@/lib/context/budget-context'
import { PageInstagramConnectCard } from '@/components/meta/PageInstagramConnectCard'
import { AdAccountConnectCard } from '@/components/meta/AdAccountConnectCard'

interface RawMetaConnectData {
  status?: string
  businessId?: string
  pageId?: string
  igUserId?: string | null
  adAccountId?: string
}

export function MetaConnectStep() {
  const { campaign } = useCampaignContext()
  const { setIsConnected, setSelectedAdAccount } = useBudget()

  const [businessId, setBusinessId] = useState<string>("")
  const [pageId, setPageId] = useState<string>("")
  const [igUserId, setIgUserId] = useState<string | null>(null)

  useEffect(() => {
    const hydrate = async () => {
      if (!campaign?.id) return
      const res = await fetch(`/api/campaigns/${campaign.id}/state`)
      if (!res.ok) return
      const { state } = await res.json()
      const data = state?.meta_connect_data as RawMetaConnectData | undefined
      if (data) {
        if (typeof data.businessId === 'string') setBusinessId(data.businessId)
        if (typeof data.pageId === 'string') setPageId(data.pageId)
        if (typeof data.igUserId === 'string' || data.igUserId === null) setIgUserId(data.igUserId ?? null)
        if (typeof data.adAccountId === 'string') {
          setSelectedAdAccount(data.adAccountId)
          setIsConnected(true)
        }
      }
    }
    hydrate()
  }, [campaign?.id, setIsConnected, setSelectedAdAccount])

  const cardAComplete = Boolean(businessId && pageId)

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-8">
      <div className="max-w-3xl w-full space-y-6">
        <PageInstagramConnectCard onComplete={(s) => { setBusinessId(s.businessId); setPageId(s.pageId); setIgUserId(s.igUserId) }} />
        <div className={!cardAComplete ? 'opacity-50 pointer-events-none' : ''}>
          <AdAccountConnectCard businessId={businessId} pageId={pageId} />
        </div>
      </div>
    </div>
  )
}
