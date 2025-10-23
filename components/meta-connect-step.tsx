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
import { Facebook, Check, Loader2, Building2 } from 'lucide-react'
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

  const handleConnect = async () => {
    if (!window.FB) return
    setConnecting(true)
    window.FB.login(async (response: { authResponse?: { accessToken?: string } }) => {
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
          }
        }
      } finally {
        setConnecting(false)
      }
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
            <Facebook className="h-10 w-10 text-blue-600" />
          </div>
          <div className="text-center space-y-2 flex-1 flex flex-col justify-start mb-4">
            <h3 className="text-xl font-semibold">Connect Facebook & Instagram</h3>
            <p className="text-sm text-muted-foreground">Authenticate and select your Page and Ad Account</p>
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
                <Facebook className="h-4 w-4" />
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


