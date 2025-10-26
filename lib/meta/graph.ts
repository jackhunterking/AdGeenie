/**
 * Feature: Meta Graph helpers
 * Purpose: Utilities for Graph API versioning and Page access token derivation
 * References:
 *  - Access tokens (Page from User): https://developers.facebook.com/docs/graph-api/reference/user/accounts/
 *  - Page Access Tokens: https://developers.facebook.com/docs/pages/access-tokens/
 */

export function getGraphVersion(): string {
  return process.env.FB_GRAPH_VERSION || process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'
}

export async function getPageAccessToken(graphVersion: string, userToken: string, pageId: string): Promise<string | null> {
  const res = await fetch(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}?fields=access_token`, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: 'no-store',
  })
  const json: unknown = await res.json()
  if (
    json &&
    typeof json === 'object' &&
    json !== null &&
    typeof (json as { access_token?: unknown }).access_token === 'string' &&
    (json as { access_token: string }).access_token.length > 0
  ) {
    return (json as { access_token: string }).access_token
  }

  // Fallback: enumerate all pages for the user and find access_token for selected page
  const pagesRes = await fetch(`https://graph.facebook.com/${graphVersion}/me/accounts?fields=id,access_token&limit=500`, {
    headers: { Authorization: `Bearer ${userToken}` },
    cache: 'no-store',
  })
  const pagesJson: unknown = await pagesRes.json()
  if (!pagesRes.ok || !pagesJson || typeof pagesJson !== 'object' || pagesJson === null) return null
  const data = (pagesJson as { data?: Array<{ id: string; access_token?: string }> }).data
  const page = Array.isArray(data) ? data.find((p) => p.id === pageId) : undefined
  return page?.access_token || null
}


/**
 * Feature: Page ↔ AdAccount compatibility guard
 * Purpose: Verify that a given ad account is allowed to advertise for a given Page
 * References:
 *  - Page → adaccounts: https://developers.facebook.com/docs/marketing-api/reference/page/adaccounts
 *  - User Accounts → Pages: https://developers.facebook.com/docs/graph-api/reference/user/accounts/
 */
export async function assertAdAccountCanAdvertiseForPage(params: {
  graphVersion?: string
  userToken: string
  pageId: string
  adAccountId: string
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const gv = params.graphVersion || getGraphVersion()
  const { userToken, pageId, adAccountId } = params

  // Fetch Page → adaccounts and verify membership
  const url = `https://graph.facebook.com/${gv}/${encodeURIComponent(pageId)}/adaccounts?fields=id,name,account_status&limit=500`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` }, cache: 'no-store' })
  const json: unknown = await res.json()
  if (!res.ok) {
    const message = (json && typeof json === 'object' && json !== null && 'error' in json)
      ? String((json as { error?: { message?: string } }).error?.message || 'Graph error')
      : 'Graph error'
    return { ok: false, reason: message }
  }

  const data = (json as { data?: Array<{ id: string }> }).data || []
  const allowed = Array.isArray(data) && data.some(a => a && typeof a.id === 'string' && a.id === adAccountId)
  if (!allowed) {
    return { ok: false, reason: 'Selected ad account is not allowed to advertise for the selected Page.' }
  }
  return { ok: true }
}

/**
 * Helper: List ad accounts allowed to advertise for a Page
 */
export async function listPageAdAccounts(graphVersion: string, userToken: string, pageId: string): Promise<Array<{ id: string; name?: string; account_status?: number; currency?: string }>> {
  const url = `https://graph.facebook.com/${graphVersion}/${encodeURIComponent(pageId)}/adaccounts?fields=id,name,account_status,currency&limit=500`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${userToken}` }, cache: 'no-store' })
  const json: unknown = await res.json()
  if (!res.ok || !json || typeof json !== 'object' || json === null) return []
  const data = (json as { data?: Array<{ id: string; name?: string; account_status?: number; currency?: string }> }).data
  return Array.isArray(data) ? data : []
}


