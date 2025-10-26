"use client"

/**
 * Feature: Card B – Connect or Create Ad Account
 * Purpose: Select existing or create new ad account, validate, and handle payment
 * References:
 *  - Page → adaccounts: https://developers.facebook.com/docs/marketing-api/reference/page/adaccounts
 *  - FB.ui payments: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { useBudget } from '@/lib/context/budget-context'
import { Building2, CreditCard, Loader2, ShieldCheck, Check } from 'lucide-react'

interface Props { businessId: string; pageId: string }
interface AdAccount { id: string; name?: string; currency?: string }

export function AdAccountConnectCard({ businessId, pageId }: Props) {
  const { campaign, saveCampaignState } = useCampaignContext()
  const { setIsConnected, setSelectedAdAccount } = useBudget()
  const [loading, setLoading] = useState(false)
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([])
  const [selected, setSelected] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [paymentOk, setPaymentOk] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState("")
  const [creatingId, setCreatingId] = useState<string>("")

  const cardEnabled = Boolean(businessId && pageId)
  const completed = Boolean(selected && paymentOk)

  const loadAdAccounts = useCallback(async () => {
    if (!campaign?.id || !businessId) return
    const r = await fetch(`/api/meta/business/adaccounts?campaignId=${encodeURIComponent(campaign.id)}&businessId=${encodeURIComponent(businessId)}`)
    if (!r.ok) return
    const j = await r.json() as { adAccounts?: AdAccount[] }
    setAdAccounts(Array.isArray(j.adAccounts) ? j.adAccounts : [])
  }, [campaign?.id, businessId])

  useEffect(() => { loadAdAccounts() }, [loadAdAccounts])

  const validate = useCallback(async (accountId: string) => {
    if (!campaign?.id) return false
    const res = await fetch('/api/meta/adaccount/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: campaign.id, pageId, adAccountId: accountId, businessId })
    })
    const j = await res.json() as { ok?: boolean; reason?: string }
    if (!res.ok || !j.ok) {
      setError(j.reason || 'Validation failed')
      return false
    }
    setError(null)
    return true
  }, [campaign?.id, pageId, businessId])

  const handleSelect = useCallback(async (value: string) => {
    setSelected(value)
    const ok = await validate(value)
    if (!ok) return
    setSelectedAdAccount(value)
    await saveCampaignState('budget_data', { isConnected: false, selectedAdAccount: value })
  }, [validate, setSelectedAdAccount, saveCampaignState])

  const createNew = useCallback(async () => {
    if (!campaign?.id || !newName) return
    setCreating(true)
    try {
      const res = await fetch('/api/meta/adaccount/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, businessId, name: newName })
      })
      const j = await res.json() as { adAccountId?: string; error?: string }
      if (!res.ok || !j.adAccountId) throw new Error(j.error || 'Create failed')
      setCreatingId(j.adAccountId)
      await loadAdAccounts()
      setSelected(j.adAccountId)
      setSelectedAdAccount(j.adAccountId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }, [campaign?.id, newName, businessId, loadAdAccounts, setSelectedAdAccount])

  const openPayment = useCallback(async () => {
    const accountId = selected || creatingId
    if (!accountId) return
    if (!window.FB) { setError('Facebook SDK not loaded'); return }
    setLoading(true)
    setError(null)
    window.FB.ui({ method: 'ads_payment', account_id: accountId }, async (resp: unknown) => {
      setLoading(false)
      const success = Boolean(resp)
      if (!campaign?.id) return
      await fetch('/api/meta/payment/mark', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, adAccountId: accountId, connected: success })
      })
      setPaymentOk(success)
      if (success) {
        setIsConnected(true)
        await saveCampaignState('budget_data', { isConnected: true, selectedAdAccount: accountId })
      }
    })
  }, [selected, creatingId, campaign?.id, setIsConnected, saveCampaignState])

  return (
    <div className={`rounded-lg border-2 border-border bg-card p-6 transition-all duration-300 ${!cardEnabled ? 'opacity-50 pointer-events-none' : 'hover:border-blue-500/20'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-tile-muted rounded-xl h-12 w-12 flex items-center justify-center">
            <Building2 className="h-6 w-6"/>
          </div>
          <div>
            <h3 className="font-semibold text-lg">Connect or Create Ad Account</h3>
            <p className="text-sm text-muted-foreground">Step 2: Set up your advertising account</p>
          </div>
        </div>
        {completed && (
          <div className="flex items-center gap-2 text-status-green">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Ready</span>
          </div>
        )}
      </div>

      {!cardEnabled && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Complete Step 1 first to continue</p>
        </div>
      )}

      {cardEnabled && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Select existing ad account
            </label>
            <Select onValueChange={handleSelect} value={selected}>
              <SelectTrigger><SelectValue placeholder="Choose an ad account" /></SelectTrigger>
              <SelectContent>
                {adAccounts.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No ad accounts found</div>
                ) : (
                  adAccounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{a.name || a.id}</span>
                        {a.currency && <span className="text-xs text-muted-foreground ml-2">({a.currency})</span>}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-border"></div>
            <span className="px-3 text-xs text-muted-foreground bg-card">OR</span>
            <div className="flex-1 border-t border-border"></div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Create new ad account</label>
            <div className="flex gap-3">
              <Input 
                placeholder="Enter ad account name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createNew} disabled={!newName || creating} variant="outline" className="shrink-0">
                {creating ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Creating...</>) : 'Create Account'}
              </Button>
            </div>
          </div>

          {(selected || creatingId) && !paymentOk && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
              <div className="flex gap-3">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Payment method required</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Connect a payment method to activate your ad account and start advertising.</p>
                  <Button onClick={openPayment} disabled={loading} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
                    {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Opening...</>) : (<><CreditCard className="h-4 w-4 mr-2"/>Connect Payment Method</>)}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {paymentOk && (
            <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <ShieldCheck className="h-5 w-5"/>
                <span className="text-sm font-medium">Payment method connected successfully</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


