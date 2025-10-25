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


