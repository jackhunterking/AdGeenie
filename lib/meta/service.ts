/**
 * Feature: Meta connectivity service
 * Purpose: Centralize Graph API calls and Supabase persistence for Meta connect
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Graph API: https://developers.facebook.com/docs/graph-api
 *  - Supabase JS (server): https://supabase.com/docs/reference/javascript/installing#server-environments
 */

import { env } from '@/lib/env'
import { supabaseServer } from '@/lib/supabase/server'
import type { MetaTokens, MetaBusiness, MetaPage, MetaAdAccount, MetaAssets, CampaignMetaConnectionPayload } from './types'

export function getGraphVersion(): string {
  return env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

function redactToken(token: string | null | undefined): string {
  if (!token) return ''
  return token.slice(0, 6) + '...' + token.slice(-4)
}

export async function exchangeCodeForTokens(args: { code: string; redirectUri: string }): Promise<MetaTokens> {
  const gv = getGraphVersion()
  const appId = env.NEXT_PUBLIC_FB_APP_ID
  const appSecret = env.FB_APP_SECRET

  const res1 = await fetch(
    `https://graph.facebook.com/${gv}/oauth/access_token?client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&redirect_uri=${encodeURIComponent(args.redirectUri)}&code=${encodeURIComponent(args.code)}`,
    { cache: 'no-store' }
  )
  const json1: unknown = await res1.json()
  const shortToken = (json1 && typeof json1 === 'object' && json1 !== null && typeof (json1 as { access_token?: string }).access_token === 'string')
    ? (json1 as { access_token: string }).access_token
    : ''
  if (!shortToken) throw new Error('Failed to exchange code for short-lived token')

  const res2 = await fetch(
    `https://graph.facebook.com/${gv}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(shortToken)}`,
    { cache: 'no-store' }
  )
  const json2: unknown = await res2.json()
  const longToken = (json2 && typeof json2 === 'object' && json2 !== null && typeof (json2 as { access_token?: string }).access_token === 'string')
    ? (json2 as { access_token: string }).access_token
    : ''
  if (!longToken) throw new Error('Failed to exchange for long-lived token')

  return { shortToken, longToken }
}

export async function fetchUserId(args: { token: string }): Promise<string | null> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me?fields=id`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json: unknown = await res.json()
  const id = (json && typeof json === 'object' && json !== null && typeof (json as { id?: string }).id === 'string')
    ? (json as { id: string }).id
    : null
  return id
}

export async function fetchBusinesses(args: { token: string }): Promise<MetaBusiness[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/businesses?fields=id,name&limit=100`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: Array<{ id?: string; name?: string }> }).data
    : []
  return list.filter((b): b is MetaBusiness => typeof b.id === 'string')
}

export async function fetchPagesWithTokens(args: { token: string }): Promise<MetaPage[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/accounts?fields=id,name,access_token,instagram_business_account{username}&limit=500`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: MetaPage[] }).data
    : []
  return list.filter((p) => typeof p.id === 'string')
}

export async function fetchAdAccounts(args: { token: string }): Promise<MetaAdAccount[]> {
  const gv = getGraphVersion()
  const res = await fetch(`https://graph.facebook.com/${gv}/me/adaccounts?fields=id,name,account_status,currency&limit=500`, {
    headers: { Authorization: `Bearer ${args.token}` },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const json: unknown = await res.json()
  const list = (json && typeof json === 'object' && json !== null && Array.isArray((json as { data?: unknown[] }).data))
    ? (json as { data: MetaAdAccount[] }).data
    : []
  return list.filter((a) => typeof a.id === 'string')
}

export function chooseAssets(args: { businesses: MetaBusiness[]; pages: MetaPage[]; adAccounts: MetaAdAccount[] }): MetaAssets {
  const firstBiz = args.businesses.at(0) ?? null
  const activeAccounts = args.adAccounts.filter((a) => a.account_status === 1)
  const firstAd = (activeAccounts.at(0) ?? args.adAccounts.at(0)) ?? null
  const firstPage = args.pages.at(0) ?? null
  const ig = firstPage?.instagram_business_account?.id
    ? { id: firstPage.instagram_business_account.id, username: firstPage.instagram_business_account.username }
    : null
  return {
    business: firstBiz,
    page: firstPage,
    ig,
    adAccount: firstAd,
  }
}

export async function persistConnection(args: {
  campaignId: string
  userId: string
  fbUserId: string | null
  longToken: string
  assets: MetaAssets
}): Promise<void> {
  // System-user tokens with "Never" expiration - set far future date
  const tokenExpiresAt = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString()
  const payload: CampaignMetaConnectionPayload = {
    campaign_id: args.campaignId,
    user_id: args.userId,
    fb_user_id: args.fbUserId,
    long_lived_user_token: args.longToken,
    token_expires_at: tokenExpiresAt,
    selected_business_id: args.assets.business?.id ?? null,
    selected_business_name: args.assets.business?.name ?? null,
    selected_page_id: args.assets.page?.id ?? null,
    selected_page_name: args.assets.page?.name ?? null,
    selected_page_access_token: args.assets.page?.access_token ?? null,
    selected_ig_user_id: args.assets.ig?.id ?? null,
    selected_ig_username: args.assets.ig?.username ?? null,
    selected_ad_account_id: args.assets.adAccount?.id ?? null,
    selected_ad_account_name: args.assets.adAccount?.name ?? null,
    ad_account_payment_connected: false,
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .upsert(payload, { onConflict: 'campaign_id' })

  if (error) {
    // Do not log raw token
    console.error('[MetaService] Upsert connection failed:', {
      error,
      campaignId: args.campaignId,
      userId: args.userId,
      fbUserId: args.fbUserId,
      token: redactToken(args.longToken),
    })
    throw error
  }
}

export async function getConnection(args: { campaignId: string }): Promise<{
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_payment_connected: boolean | null
  long_lived_user_token?: string | null
} | null> {
  const { data } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected,long_lived_user_token')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  return (data as unknown as ReturnType<typeof getConnection> extends Promise<infer T> ? T : never) ?? null
}

export async function updateCampaignState(args: { campaignId: string; status: string; extra?: Record<string, unknown> }): Promise<void> {
  const meta_connect_data = { status: args.status, ...(args.extra ?? {}) }
  const { data: updatedRows, error } = await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data })
    .eq('campaign_id', args.campaignId)
    .select('campaign_id')

  if (error || !updatedRows || updatedRows.length === 0) {
    const { error: insertError } = await supabaseServer
      .from('campaign_states')
      .insert({ campaign_id: args.campaignId, meta_connect_data })
    if (insertError) throw insertError
  }
}

export async function validateAdAccount(args: { token: string; actId: string }): Promise<{
  isActive: boolean
  status: number | null
  disableReason?: string
  hasFunding?: boolean
  hasToSAccepted?: unknown
  hasBusiness?: boolean
  hasOwner?: boolean
  capabilities: string[]
  currency?: string
  rawData: Record<string, unknown>
}> {
  const gv = getGraphVersion()
  const id = args.actId.startsWith('act_') ? args.actId : `act_${args.actId}`
  const fields = 'account_status,disable_reason,capabilities,funding_source,funding_source_details,business,tos_accepted,owner,currency'
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(id)}?fields=${fields}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${args.token}` }, cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph error ${res.status}: ${text}`)
  }
  const data: unknown = await res.json()
  const obj = (data && typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {}
  return {
    isActive: obj.account_status === 1,
    status: typeof obj.account_status === 'number' ? obj.account_status : null,
    disableReason: typeof obj.disable_reason === 'string' ? obj.disable_reason : undefined,
    hasFunding: !!obj.funding_source,
    hasToSAccepted: typeof obj.tos_accepted === 'object' ? obj.tos_accepted : undefined,
    hasBusiness: !!obj.business,
    hasOwner: !!obj.owner,
    capabilities: Array.isArray(obj.capabilities) ? (obj.capabilities as string[]) : [],
    currency: typeof obj.currency === 'string' ? obj.currency : undefined,
    rawData: obj,
  }
}

export async function markPaymentConnected(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update({ ad_account_payment_connected: true })
    .eq('campaign_id', args.campaignId)
  if (error) throw error
}

export async function deleteConnection(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .delete()
    .eq('campaign_id', args.campaignId)
  if (error) throw error
}

export async function setDisconnected(args: { campaignId: string }): Promise<void> {
  const { error } = await supabaseServer
    .from('campaign_states')
    .update({ meta_connect_data: { status: 'disconnected', disconnectedAt: new Date().toISOString() } })
    .eq('campaign_id', args.campaignId)
  if (error) {
    // non-fatal
    console.error('[MetaService] setDisconnected error:', error)
  }
}

/**
 * Return only non-sensitive connection fields for client consumption.
 */
export async function getConnectionPublic(args: { campaignId: string }): Promise<{
  selected_business_id: string | null
  selected_business_name: string | null
  selected_page_id: string | null
  selected_page_name: string | null
  selected_ig_user_id: string | null
  selected_ig_username: string | null
  selected_ad_account_id: string | null
  selected_ad_account_name: string | null
  ad_account_payment_connected: boolean | null
} | null> {
  const { data, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  if (error) {
    console.error('[MetaService] getConnectionPublic error:', error)
    return null
  }
  return data as unknown as ReturnType<typeof getConnectionPublic> extends Promise<infer T> ? T : never
}

/**
 * Return connection including sensitive token for server-side use only.
 */
export async function getConnectionWithToken(args: { campaignId: string }): Promise<{
  long_lived_user_token: string | null
} & NonNullable<Awaited<ReturnType<typeof getConnectionPublic>>> | null> {
  const { data, error } = await supabaseServer
    .from('campaign_meta_connections')
    .select('selected_business_id,selected_business_name,selected_page_id,selected_page_name,selected_ig_user_id,selected_ig_username,selected_ad_account_id,selected_ad_account_name,ad_account_payment_connected,long_lived_user_token')
    .eq('campaign_id', args.campaignId)
    .maybeSingle()
  if (error) {
    console.error('[MetaService] getConnectionWithToken error:', error)
    return null
  }
  return data as unknown as ReturnType<typeof getConnectionWithToken> extends Promise<infer T> ? T : never
}

/**
 * Update selected assets in SSOT. Fetches names/tokens as needed using the stored user token.
 */
export async function setSelectedAssets(args: {
  campaignId: string
  businessId?: string | null
  pageId?: string | null
  adAccountId?: string | null
}): Promise<void> {
  const current = await getConnectionWithToken({ campaignId: args.campaignId })
  if (!current) throw new Error('No existing Meta connection to update')

  const token = current.long_lived_user_token || ''
  if (!token) throw new Error('Missing long-lived user token')

  const updates: Record<string, unknown> = {}

  // Business
  if (typeof args.businessId !== 'undefined') {
    updates.selected_business_id = args.businessId
    updates.selected_business_name = null
    if (args.businessId) {
      try {
        const gv = getGraphVersion()
        const res = await fetch(`https://graph.facebook.com/${gv}/${encodeURIComponent(args.businessId)}?fields=name`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        })
        if (res.ok) {
          const j: unknown = await res.json()
          const name = (j && typeof j === 'object' && j !== null && typeof (j as { name?: string }).name === 'string') ? (j as { name: string }).name : null
          updates.selected_business_name = name
        }
      } catch {}
    }
  }

  // Page (and IG via page)
  if (typeof args.pageId !== 'undefined') {
    updates.selected_page_id = args.pageId
    updates.selected_page_name = null
    updates.selected_page_access_token = null
    updates.selected_ig_user_id = null
    updates.selected_ig_username = null
    if (args.pageId) {
      try {
        const pages = await fetchPagesWithTokens({ token })
        const match = pages.find(p => p.id === args.pageId) || null
        if (match) {
          updates.selected_page_name = match.name ?? null
          updates.selected_page_access_token = match.access_token ?? null
          if (match.instagram_business_account?.id) {
            updates.selected_ig_user_id = match.instagram_business_account.id
            updates.selected_ig_username = match.instagram_business_account.username ?? null
          }
        }
      } catch {}
    }
  }

  // Ad Account
  if (typeof args.adAccountId !== 'undefined') {
    const rawId = args.adAccountId
    updates.selected_ad_account_id = rawId
    updates.selected_ad_account_name = null
    if (rawId) {
      try {
        const accounts = await fetchAdAccounts({ token })
        const normalized = rawId.startsWith('act_') ? rawId.replace(/^act_/, '') : rawId
        const match = accounts.find(a => a.id === normalized) || accounts.find(a => `act_${a.id}` === rawId) || null
        if (match) {
          updates.selected_ad_account_id = match.id
          updates.selected_ad_account_name = match.name ?? null
        }
      } catch {}
    }
  }

  const { error } = await supabaseServer
    .from('campaign_meta_connections')
    .update(updates)
    .eq('campaign_id', args.campaignId)
  if (error) throw error

  // Reflect status
  try {
    await updateCampaignState({ campaignId: args.campaignId, status: 'connected' })
  } catch {}
}


