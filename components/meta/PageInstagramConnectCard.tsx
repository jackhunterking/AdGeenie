"use client"

/**
 * Feature: Card A – Connect Facebook Page & Instagram
 * Purpose: Authenticate (token), pick Business and Page, auto-resolve IG, persist selection
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - Page → IG linked: https://developers.facebook.com/docs/instagram-api/reference/page#linked_ig_account
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { fbLogin } from '@/lib/utils/facebook-sdk'
import { Loader2, Check, Link2, Building2 } from 'lucide-react'

interface Business { id: string; name?: string }
interface Page { id: string; name?: string; instagram_business_account?: { id: string; username?: string } }

export function PageInstagramConnectCard({ onComplete }: { onComplete?: (state: { businessId: string; pageId: string; igUserId: string | null }) => void }) {
  const { campaign } = useCampaignContext()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [hasToken, setHasToken] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [pages, setPages] = useState<Page[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>("")
  const [selectedPage, setSelectedPage] = useState<string>("")
  const [igUsername, setIgUsername] = useState<string | null>(null)

  const tokenReady = hasToken
  const cardComplete = Boolean(selectedBusiness && selectedPage)

  const connect = useCallback(async () => {
    if (!campaign?.id) return
    try {
      setLoading(true)
      setError(null)
      const response = await fbLogin([
        'public_profile','email','business_management','pages_show_list','pages_read_engagement','pages_manage_metadata','instagram_basic','ads_read','ads_management'
      ])
      const res = await fetch('/api/meta/auth/callback', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: campaign.id, accessToken: response.accessToken, userID: response.userID })
      })
      if (!res.ok) throw new Error('Could not finalize Meta token exchange')
      setHasToken(true)
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
    setPages(Array.isArray(j.pages) ? j.pages : [])
  }, [campaign?.id])

  const handleBusinessChange = async (value: string) => {
    setSelectedBusiness(value)
    setSelectedPage("")
    setIgUsername(null)
    if (value) await loadPages(value)
  }

  const handlePageChange = (value: string) => {
    setSelectedPage(value)
    const p = pages.find(p => p.id === value)
    const ig = p?.instagram_business_account
    setIgUsername(ig?.username || null)
  }

  const persistSelection = useCallback(async () => {
    if (!campaign?.id || !selectedBusiness || !selectedPage) return
    const page = pages.find(p => p.id === selectedPage)
    const ig = page?.instagram_business_account
    const res = await fetch('/api/meta/selection', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId: campaign.id,
        businessId: selectedBusiness,
        businessName: businesses.find(b => b.id === selectedBusiness)?.name || null,
        pageId: selectedPage,
        pageName: page?.name || null,
        igUserId: ig?.id || null,
        igUsername: ig?.username || null,
        // ad account not set here
      })
    })
    if (!res.ok) throw new Error('Failed to save selection')
    onComplete?.({ businessId: selectedBusiness, pageId: selectedPage, igUserId: ig?.id || null })
  }, [campaign?.id, selectedBusiness, selectedPage, pages, businesses, onComplete])

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
        {cardComplete && (
          <div className="flex items-center gap-2 text-status-green">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Connected</span>
          </div>
        )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Business
              </label>
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook Page
              </label>
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
          
          {selectedPage && (
            <div className="rounded-md bg-accent/20 border border-border p-3 flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="ig-grad-card-a" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FD1D1D" />
                    <stop offset="50%" stopColor="#E1306C" />
                    <stop offset="100%" stopColor="#833AB4" />
                  </linearGradient>
                </defs>
                <path fill="url(#ig-grad-card-a)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM18.406 4.155a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              <div className="text-sm">
                <span className="text-muted-foreground">Instagram:</span>{' '}
                <span className="font-medium">{igUsername ? `@${igUsername}` : 'Not linked to this page'}</span>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <Button onClick={persistSelection} disabled={!cardComplete || loading} className="bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Saving...</>) : 'Save Connection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}


