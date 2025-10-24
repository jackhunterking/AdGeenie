"use client"

/**
 * Feature: Meta Connect Step UI
 * Purpose: UI step to connect Facebook (and optional IG), select Page and Ad Account, matching existing card styles
 * References:
 *  - Facebook Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - JS SDK Quickstart: https://developers.facebook.com/docs/javascript/quickstart
 *  - FB.login: https://developers.facebook.com/docs/reference/javascript/FB.login/
 */

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Facebook, Check, Loader2, Building2, Link2 } from 'lucide-react'
import { useCampaignContext } from '@/lib/context/campaign-context'

declare global {
  interface Window { FB?: FBNamespace }
}

interface FBNamespace {
  init: (opts: { appId?: string; version?: string; cookie?: boolean }) => void;
  login: (
    callback: (response: { authResponse?: { accessToken?: string } }) => void,
    opts?: { scope?: string }
  ) => void;
}

interface PageItem { id: string; name: string; access_token?: string }
interface AdAccountItem { id: string; name: string }

export function MetaConnectStep() {
  const { campaign, saveCampaignState } = useCampaignContext()
  const [loadingSDK, setLoadingSDK] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [pages, setPages] = useState<PageItem[]>([])
  const [adAccounts, setAdAccounts] = useState<AdAccountItem[]>([])
  const [selectedPage, setSelectedPage] = useState<PageItem | null>(null)
  const [igAccount, setIgAccount] = useState<{ id: string; username: string } | null>(null)
  const [selectedAdAccount, setSelectedAdAccount] = useState<AdAccountItem | null>(null)
  const [saving, setSaving] = useState(false)
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID

  const canContinue = useMemo(() => Boolean(selectedPage && selectedAdAccount), [selectedPage, selectedAdAccount])

  useEffect(() => {
    if (!appId) return
    if (window.FB) return
    setLoadingSDK(true)
    const s = document.createElement('script')
    s.src = 'https://connect.facebook.net/en_US/sdk.js'
    s.async = true
    s.onload = () => {
      window.FB?.init({ appId, version: process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v20.0', cookie: true })
      setLoadingSDK(false)
    }
    document.body.appendChild(s)
  }, [appId])

  useEffect(() => {
    const run = async () => {
      if (!campaign?.id) return
      const res = await fetch(`/api/meta/assets?campaignId=${campaign.id}`)
      if (res.ok) {
        const json = await res.json()
        setPages(json.pages || [])
        setAdAccounts(json.adAccounts || [])
      }
    }
    run()
  }, [campaign?.id])

  const handleConnect = () => {
    if (!window.FB) return
    setConnecting(true)
    try {
      window.FB.login((response: { authResponse?: { accessToken?: string } }) => {
        ;(async () => {
          try {
            if (response?.authResponse?.accessToken && campaign?.id) {
              const res = await fetch('/api/meta/auth/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shortLivedToken: response.authResponse.accessToken, campaignId: campaign.id })
              })
              const json = await res.json()
              if (res.ok) {
                setPages(json.pages || [])
                setAdAccounts(json.adAccounts || [])
              } else {
                console.error('[META] Exchange failed', json)
              }
            }
          } catch (err) {
            console.error('[META] FB.login callback error', err)
          } finally {
            setConnecting(false)
          }
        })()
      }, {
        scope: [
          'public_profile',
          'email',
          'pages_show_list',
          'pages_read_engagement',
          'pages_manage_metadata',
          'instagram_basic',
          'ads_read',
          'ads_management',
          'business_management'
        ].join(',')
      })
    } catch (err) {
      console.error('[META] FB.login invocation error', err)
      setConnecting(false)
    }
  }

  const onSelectPage = async (page: PageItem) => {
    setSelectedPage(page)
    setIgAccount(null)
    if (!campaign?.id) return
    const res = await fetch(`/api/meta/page-ig?campaignId=${campaign.id}&pageId=${page.id}`)
    if (res.ok) {
      const json = await res.json()
      setIgAccount(json.instagram || null)
    }
  }

  const handleSave = async () => {
    if (!campaign?.id || !selectedPage || !selectedAdAccount) return
    setSaving(true)
    try {
      const res = await fetch('/api/meta/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          igUserId: igAccount?.id,
          igUsername: igAccount?.username,
          adAccountId: selectedAdAccount.id,
          adAccountName: selectedAdAccount.name,
        })
      })
      if (res.ok) {
        await saveCampaignState('meta_connect_data', {
          status: 'completed',
          pageId: selectedPage.id,
          igUserId: igAccount?.id || null,
          adAccountId: selectedAdAccount.id,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="group relative flex flex-col items-center p-8 rounded-2xl border-2 border-border hover:border-blue-500 hover:bg-blue-500/5 transition-all duration-300">
          <div className="h-20 w-20 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors mb-4">
            <Link2 className="h-10 w-10 text-blue-600" />
          </div>
          <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
            <h3 className="text-xl font-semibold">Connect Facebook & Instagram</h3>
            <p className="text-sm text-muted-foreground">Authenticate and select your Page and Ad Account</p>
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
          <Button
            size="lg"
            onClick={handleConnect}
            disabled={connecting || loadingSDK}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 mt-auto"
          >
            {connecting || loadingSDK ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Connect
              </span>
            )}
          </Button>
        </div>

        {pages.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Select Facebook Page</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {pages.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPage(p)}
                  className={`p-3 rounded-lg border ${selectedPage?.id === p.id ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:bg-muted'} text-left`}
                >
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">ID: {p.id}</div>
                </button>
              ))}
            </div>
            {selectedPage && (
              <div className="mt-3 text-sm text-muted-foreground">
                {igAccount ? (
                  <span className="inline-flex items-center gap-2 text-green-600"><Check className="h-4 w-4" /> IG linked: @{igAccount.username}</span>
                ) : (
                  <span>No linked Instagram. You can continue without IG.</span>
                )}
              </div>
            )}
          </div>
        )}

        {adAccounts.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Facebook className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Select Ad Account</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {adAccounts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAdAccount(a)}
                  className={`p-3 rounded-lg border ${selectedAdAccount?.id === a.id ? 'border-blue-500 bg-blue-500/5' : 'border-border hover:bg-muted'} text-left`}
                >
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {(pages.length > 0 || adAccounts.length > 0) && (
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleSave}
              disabled={!canContinue || saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8"
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Continue'
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}


