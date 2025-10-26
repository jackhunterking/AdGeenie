"use client"

/**
 * Feature: Meta Connect Step UI
 * Purpose: Use standard Facebook Login with business permissions
 * References:
 *  - Facebook Login for Web: https://developers.facebook.com/docs/facebook-login/web
 *  - FB.login Reference: https://developers.facebook.com/docs/javascript/reference/FB.login
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Facebook, Check, Loader2, Link2 } from 'lucide-react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { useBudget } from '@/lib/context/budget-context'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fbLogin } from '@/lib/utils/facebook-sdk'
import { MetaConnectionCard } from '@/components/meta/meta-connection-card'

interface SummaryData {
  businessId?: string
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
  pixel?: { id: string; name: string } | null
}

interface RawMetaConnectData {
  status?: string
  businessId?: string
  page?: { id: string; name: string }
  pageId?: string
  pageName?: string
  instagram?: { id: string; username: string } | null
  igUserId?: string
  igUsername?: string
  adAccount?: { id: string; name: string }
  adAccountId?: string
  adAccountName?: string
  pixel?: { id: string; name: string } | null
}

export function MetaConnectStep() {
  const { campaign, saveCampaignState } = useCampaignContext()
  const { setIsConnected, setSelectedAdAccount } = useBudget()
  const [connecting, setConnecting] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'launching' | 'exchanging' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const isConnected = useMemo(() => Boolean(summary?.page && summary?.adAccount), [summary])

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'launching':
        return 'Opening Meta to select your business assets...'
      case 'exchanging':
        return 'Finalizing your Meta connection...'
      case 'success':
        return 'Meta connection complete!'
      case 'error':
        return error || 'Something went wrong while connecting to Meta.'
      default:
        return ''
    }
  }, [status, error])

  useEffect(() => {
    const hydrate = async () => {
      if (!campaign?.id) return
      try {
        const res = await fetch(`/api/campaigns/${campaign.id}/state`)
        if (!res.ok) return
        const { state } = await res.json()
        const data = state?.meta_connect_data as RawMetaConnectData | undefined
        if (data?.status === 'connected') {
          setSummary({
            businessId: typeof data.businessId === 'string' ? data.businessId : undefined,
            page: data.page || (data.pageId ? { id: data.pageId, name: data.pageName || 'Page' } : undefined),
            instagram: data.instagram ?? (data.igUserId ? { id: data.igUserId, username: data.igUsername || '' } : null),
            adAccount: data.adAccount || (data.adAccountId ? { id: data.adAccountId, name: data.adAccountName || 'Ad Account' } : undefined),
            pixel: data.pixel ?? null,
          })
          // Keep budget UI in sync so later steps can enable Next immediately
          if (data.adAccountId) setSelectedAdAccount(data.adAccountId)
          if (data.adAccount?.id) setSelectedAdAccount(data.adAccount.id)
          setIsConnected(true)
        }
      } catch {}
    }
    hydrate()
  }, [campaign?.id])

  const handleConnect = useCallback(async () => {
    if (!campaign?.id) return

    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh the page.')
      setStatus('error')
      setDialogOpen(true)
      return
    }

    try {
      setConnecting(true)
      setDialogOpen(true)
      setStatus('launching')

      // Use standard FB.login() with business permissions
      const response = await fbLogin([
        'public_profile',
        'email',
        'business_management',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
        'instagram_basic',
        'ads_read',
        'ads_management',
      ])

      setStatus('exchanging')

      // Send access token to backend to fetch business assets
      const res = await fetch('/api/meta/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          accessToken: response.accessToken,
          userID: response.userID,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Could not finalize Meta connection')
      }

      const data = json?.summary as SummaryData | undefined
      if (data) {
        setSummary({
          businessId: data.businessId,
          page: data.page,
          instagram: data.instagram ?? null,
          adAccount: data.adAccount,
          pixel: data.pixel ?? null,
        })
        // Reflect connection in budget context for UI completion checks
        if (data.adAccount?.id) setSelectedAdAccount(data.adAccount.id)
        setIsConnected(true)
        // Auto-advance to next step per product requirement
        window.dispatchEvent(new CustomEvent('autoAdvanceStep'))
      }

      setStatus('success')
      setConnecting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while connecting to Meta.')
      setStatus('error')
      setConnecting(false)
    }
  }, [campaign?.id])

  const handleDisconnect = async () => {
    if (!campaign?.id) return
    setSummary(null)
    await saveCampaignState('meta_connect_data', { status: 'disconnected' })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-2xl w-full space-y-8">
        {isConnected && summary ? (
          <MetaConnectionCard showAdAccount onEdit={handleDisconnect} actionLabel="Disconnect" />
        ) : (
          <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:bg-accent/20 transition-all duration-300">
            <div className="icon-tile-muted rounded-2xl h-20 w-20 flex items-center justify-center mb-4">
              <Link2 className="h-10 w-10" />
            </div>
            <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
              <h3 className="text-xl font-semibold">Connect Facebook & Instagram</h3>
              <p className="text-sm text-muted-foreground">Authenticate your Facebook, Instagram, and Ad Account to advertise with Meta.</p>
            </div>
            <Button
              size="lg"
              onClick={handleConnect}
              disabled={connecting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 mt-auto"
            >
              {connecting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Connect with Meta
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
      
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>Meta Business Login</DialogTitle>
            <DialogDescription>{statusMessage}</DialogDescription>
          </DialogHeader>
          <div className="p-6 pt-2">
            <div className="flex items-center gap-3">
              {status === 'error' ? (
                <Loader2 className="h-5 w-5 text-destructive" />
              ) : status === 'success' ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              <span className="text-sm text-muted-foreground">{statusMessage}</span>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0">
            {status === 'error' ? (
              <Button variant="outline" onClick={handleConnect}>Retry</Button>
            ) : status === 'success' ? (
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
            ) : (
              <Button variant="outline" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
