"use client"

/**
 * Feature: Card A – Connect Facebook Page & Instagram
 * Purpose: Authenticate (token), pick Business and Page, select Instagram (multi), persist selection
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - Page → IG linked: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { fbLogin, fbBusinessLoginWithSdk } from '@/lib/utils/facebook-sdk'
import { Loader2, Check, Link2, Building2 } from 'lucide-react'

interface Business { id: string; name?: string }
interface Page { id: string; name?: string; instagram_business_account?: { id: string; username?: string } }
interface IgAccount { id: string; username?: string }

export function PageInstagramConnectCard({ onComplete }: { onComplete?: (state: { businessId: string; pageId: string; igUserId: string | null }) => void }) {
  const { campaign } = useCampaignContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasToken, setHasToken] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>("")
  const [selectedPage, setSelectedPage] = useState<string>("")
  const [igOptions, setIgOptions] = useState<IgAccount[]>([])
  const [selectedIgUserId, setSelectedIgUserId] = useState<string>("")

  const tokenReady = hasToken
  const cardComplete = Boolean(selectedBusiness && selectedPage)

  const connect = useCallback(async () => {
    if (!campaign?.id) return
    try {
      setLoading(true)
      setError(null)
      // Business Login for Business (System User token) using config_id (SDK popup)
      // Persist campaignId in a short-lived cookie for the GET callback to read
      const expires = new Date(Date.now() + 10 * 60 * 1000).toUTCString()
      document.cookie = `meta_cid=${encodeURIComponent(campaign.id)}; Path=/; Expires=${expires}; SameSite=Lax`
      const configId = process.env.NEXT_PUBLIC_FB_BIZ_LOGIN_CONFIG_ID || '1352055236432179'
      fbBusinessLoginWithSdk(configId)
      return
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect to Meta')
    } finally {
      setLoading(false)
    }
  }, [campaign?.id])

  useEffect(() => {
    const loadInitial = async () => {
      if (!campaign?.id || !tokenReady) return
      const r = await fetch(`/api/meta/businesses?campaignId=${encodeURIComponent(campaign.id)}`)
      if (!r.ok) return
      const j = await r.json() as { businesses?: Business[] }
      setBusinesses(Array.isArray(j.businesses) ? j.businesses : [])
    }
    loadInitial()
  }, [campaign?.id, tokenReady])

  const loadPages = useCallback(async (bizId: string) => {
    if (!campaign?.id) return
    const r = await fetch(`/api/meta/assets?campaignId=${encodeURIComponent(campaign.id)}&businessId=${encodeURIComponent(bizId)}`)
    const j = await r.json() as { pages?: Page[] }
    const newPages = Array.isArray(j.pages) ? j.pages : []
    setPages(newPages)
    // derive IG options (unique across returned pages)
    const uniq = new Map<string, IgAccount>()
    for (const p of newPages) {
      const ig = p?.instagram_business_account
      if (ig?.id && !uniq.has(ig.id)) {
        uniq.set(ig.id, { id: ig.id, username: ig.username })
      }
    }
    setIgOptions(Array.from(uniq.values()))
  }, [campaign?.id])

  const handleBusinessChange = async (value: string) => {
    setSelectedBusiness(value)
    setSelectedPage("")
    setSelectedIgUserId("")
    if (value) await loadPages(value)
  }

  const handlePageChange = (value: string) => {
    setSelectedPage(value)
    const p = pages.find(p => p.id === value)
    const ig = p?.instagram_business_account
    setSelectedIgUserId(ig?.id || "")
  }

  // find ig username for selected selection
  const selectedIg = useMemo(() => {
    return igOptions.find(o => o.id === selectedIgUserId) || null
  }, [igOptions, selectedIgUserId])

  const persistSelection = useCallback(async () => {
    if (!campaign?.id || !selectedBusiness || !selectedPage) return
    setLoading(true)
    setError(null)
    try {
      const page = pages.find(p => p.id === selectedPage)
      // prefer explicit selection; fallback to page-linked ig
      const igId = selectedIgUserId || page?.instagram_business_account?.id || null
      const igName = (selectedIg?.username) || page?.instagram_business_account?.username || null
      const res = await fetch('/api/meta/selection', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          businessId: selectedBusiness,
          businessName: businesses.find(b => b.id === selectedBusiness)?.name || null,
          pageId: selectedPage,
          pageName: page?.name || null,
          igUserId: igId,
          igUsername: igName,
          // ad account not set here
        })
      })
      if (!res.ok) {
        let message = 'Failed to save selection'
        try {
          const j = await res.json()
          if (j && typeof j === 'object' && 'error' in j) message = String(j.error)
          if (j && typeof j === 'object' && 'details' in j && j.details) message += `: ${String(j.details)}`
        } catch {
          // ignore
        }
        setError(message)
        return
      }
      onComplete?.({ businessId: selectedBusiness, pageId: selectedPage, igUserId: igId })
    } finally {
      setLoading(false)
    }
  }, [campaign?.id, selectedBusiness, selectedPage, pages, businesses, selectedIgUserId, selectedIg, onComplete])

  const disconnect = useCallback(async () => {
    if (!campaign?.id) return
    const ok = window.confirm('Disconnect Meta from this campaign? You can reconnect anytime.')
    if (!ok) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/meta/disconnect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id })
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error || 'Failed to disconnect')
      }
      // Reset local state
      setHasToken(false)
      setBusinesses([])
      setPages([])
      setSelectedBusiness("")
      setSelectedPage("")
      setSelectedIgUserId("")
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect')
    } finally {
      setLoading(false)
    }
  }, [campaign?.id])

  // Deprecated from the main flow. Kept for internal/legacy use. Not rendered by default.
  return (
    <div className="rounded-lg border-2 border-border bg-card p-6 transition-all duration-300 hover:border-blue-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="icon-tile-muted rounded-xl h-12 w-12 flex items-center justify-center">
            <Link2 className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Connect your Facebook Page & Instagram</h3>
            <p className="text-sm text-muted-foreground">Step 1: Select your business assets</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cardComplete && (
            <div className="flex items-center gap-2 text-status-green">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          )}
          {hasToken && (
            <Button variant="outline" size="sm" onClick={disconnect} disabled={loading}>Disconnect</Button>
          )}
        </div>
      </div>

      {!tokenReady ? (
        <div className="space-y-4 text-center py-6">
          <p className="text-sm text-muted-foreground">Authenticate with Meta to access your Business and Pages</p>
          <Button onClick={connect} disabled={loading} size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Connecting...</>) : (<><Link2 className="h-4 w-4 mr-2" />Connect Facebook & Instagram</>)}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-6">
            <label className="text-sm font-medium text-foreground flex items-center gap-2 shrink-0">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Business
            </label>
            <div className="w-full max-w-sm">
              <Select onValueChange={handleBusinessChange} value={selectedBusiness}>
                <SelectTrigger><SelectValue placeholder="Select Business" /></SelectTrigger>
                <SelectContent>
                  {businesses.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No businesses found</div>
                  ) : (
                    businesses.map(b => (<SelectItem key={b.id} value={b.id}>{b.name || b.id}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-6">
            <label className="text-sm font-medium text-foreground flex items-center gap-2 shrink-0">
              <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook Page
            </label>
            <div className="w-full max-w-sm">
              <Select onValueChange={handlePageChange} value={selectedPage} disabled={!selectedBusiness}>
                <SelectTrigger><SelectValue placeholder="Select Page" /></SelectTrigger>
                <SelectContent>
                  {pages.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">Select a business first</div>
                  ) : (
                    pages.map(p => (<SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Instagram row */}
          <div className="flex items-center justify-between gap-6">
            <label className="text-sm font-medium text-foreground flex items-center gap-2 shrink-0">
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="ig-grad-card-a" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FD1D1D" />
                    <stop offset="50%" stopColor="#E1306C" />
                    <stop offset="100%" stopColor="#833AB4" />
                  </linearGradient>
                </defs>
                <path fill="url(#ig-grad-card-a)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM18.406 4.155a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Instagram Page
            </label>
            <div className="w-full max-w-sm">
              <Select onValueChange={(v) => setSelectedIgUserId(v === 'none' ? '' : v)} value={selectedIgUserId || 'none'} disabled={!selectedBusiness}>
                <SelectTrigger><SelectValue placeholder={igOptions.length ? 'Select Instagram' : 'No Instagram found'} /></SelectTrigger>
                <SelectContent>
                  {igOptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No Instagram accounts detected</div>
                  ) : (
                    <>
                      <SelectItem value="none">None</SelectItem>
                      {igOptions.map(ig => (
                        <SelectItem key={ig.id} value={ig.id}>{ig.username ? `@${ig.username}` : ig.id}</SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {selectedIg && selectedIg.username && (
                <p className="text-xs text-muted-foreground mt-1">Selected: @{selectedIg.username}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-end pt-2">
            <Button onClick={persistSelection} disabled={!cardComplete || loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving...</>) : 'Save Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


