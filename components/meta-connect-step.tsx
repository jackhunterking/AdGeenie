"use client"

/**
 * Feature: Meta Connect Step UI
 * Purpose: Use Meta Embedded Signup (business_login) to connect assets; show compact summary with Disconnect
 * References:
 *  - Embedded Signup: https://developers.facebook.com/docs/business-apps/embedded-signup
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
 *  - JS SDK: https://developers.facebook.com/docs/javascript
 *  - FB.ui business_login: https://developers.facebook.com/docs/javascript/reference/FB.ui
 */

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Facebook, Check, Loader2, Link2 } from 'lucide-react'
import { useCampaignContext } from '@/lib/context/campaign-context'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { loadFacebookSDK } from '@/lib/utils/load-fb-sdk'

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID as string | undefined
const FB_GRAPH_VERSION = (process.env.NEXT_PUBLIC_FB_GRAPH_VERSION as string | undefined) || 'v24.0'

interface SummaryData {
  businessId?: string
  page?: { id: string; name: string }
  instagram?: { id: string; username: string } | null
  adAccount?: { id: string; name: string }
  pixel?: { id: string; name: string } | null
}

// Shape of meta_connect_data as stored in campaign state
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
  const [connecting, setConnecting] = useState(false)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading-sdk' | 'launching' | 'exchanging' | 'success' | 'error'>(
    'idle'
  )
  const [error, setError] = useState<string | null>(null)

  const isConnected = useMemo(() => Boolean(summary?.page && summary?.adAccount), [summary])

  const statusMessage = useMemo(() => {
    switch (status) {
      case 'loading-sdk':
        return 'Loading the Meta SDK...'
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

  // Load saved connection summary from campaign state if available
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
        }
      } catch {}
    }
    hydrate()
  }, [campaign?.id])

  const handleConnect = useCallback(async () => {
    try {
      if (!campaign?.id) {
        console.error('[META] No campaign id available.')
        return
      }
      if (!FB_APP_ID) {
        setError('Missing Facebook app configuration. Please contact support.')
        setStatus('error')
        setDialogOpen(true)
        return
      }
      setConnecting(true)
      setDialogOpen(true)
      setStatus('loading-sdk')

      const FB = await loadFacebookSDK({ appId: FB_APP_ID, version: FB_GRAPH_VERSION, cookie: true, xfbml: false })

      setStatus('launching')
      FB.ui(
        {
          method: 'business_login',
          display: 'popup',
          permissions: [
            'business_management',
            'pages_show_list',
            'pages_read_engagement',
            'pages_manage_metadata',
            'instagram_basic',
            'ads_read',
            'ads_management',
          ],
          payload: { campaignId: campaign.id },
        },
        (response: unknown) => {
          const resp = response as { signed_request?: string; request_id?: string }
          if (!resp?.signed_request || !resp?.request_id) {
            setError('The Meta login was cancelled or did not return any data.')
            setStatus('error')
            setConnecting(false)
            return
          }

          setStatus('exchanging')
          ;(async () => {
            try {
              const res = await fetch('/api/meta/business-login/callback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  campaignId: campaign.id,
                  signedRequest: resp.signed_request,
                  requestId: resp.request_id,
                }),
              })
              const json = await res.json()
              if (!res.ok) {
                console.error('[META] business-login callback failed', json)
                setError('We could not finalize the Meta connection. Please try again.')
                setStatus('error')
                setConnecting(false)
                return
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
              }

              setStatus('success')
              setConnecting(false)
            } catch (err) {
              console.error('[META] business-login error', err)
              setError('A network error occurred while finalizing the Meta connection.')
              setStatus('error')
              setConnecting(false)
            }
          })()
        }
      )
    } catch (e) {
      console.error('[META] Error launching Meta connect', e)
      setError('Failed to launch Meta connection.')
      setStatus('error')
      setConnecting(false)
    }
  }, [campaign?.id])

  const handleDisconnect = async () => {
    if (!campaign?.id) return
    setSummary(null)
    await saveCampaignState('meta_connect_data', { status: 'disconnected' })
  }

  // No local save button; Meta dialog drives selection and we persist via callback

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
          <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
            <Link2 className="h-10 w-10 text-blue-600" />
          </div>
          <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
            <h3 className="text-xl font-semibold">Connect Facebook & Instagram</h3>
            <p className="text-sm text-muted-foreground">Authenticate your Facebook, Instagram, and Ad Account to advertise with Meta.</p>
            {/* Brand logos row */}
            <div className="flex items-center justify-center gap-2 mt-1">
              {/* Facebook native logo */}
              <div className="h-6 w-6 rounded-md overflow-hidden bg-white flex items-center justify-center border border-border">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              {/* Instagram native logo */}
              <div className="h-6 w-6 rounded-md overflow-hidden bg-white flex items-center justify-center border border-border">
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <defs>
                    <linearGradient id="instagram-gradient-metaconnect" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#FD1D1D" />
                      <stop offset="50%" stop-color="#E1306C" />
                      <stop offset="100%" stop-color="#833AB4" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#instagram-gradient-metaconnect)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </div>
            </div>
          </div>
          {!isConnected && (
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
          )}
        </div>

        {isConnected && summary && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Facebook className="h-4 w-4 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg">Connected</h3>
              </div>
              <div className="inline-flex items-center gap-2 text-green-600 text-sm">
                <Check className="h-4 w-4" /> Connected
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {summary.page && <div>Page: <span className="font-medium">{summary.page.name}</span></div>}
              {summary.instagram && <div>Instagram: <span className="font-medium">@{summary.instagram.username}</span></div>}
              {summary.adAccount && <div>Ad Account: <span className="font-medium">{summary.adAccount.name}</span> <span className="text-muted-foreground">({summary.adAccount.id})</span></div>}
              {summary.pixel && <div>Pixel: <span className="font-medium">{summary.pixel.name}</span> <span className="text-muted-foreground">({summary.pixel.id})</span></div>}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={handleDisconnect}>Disconnect</Button>
            </div>
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


