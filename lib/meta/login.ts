/**
 * Feature: Meta Business Login URL builder
 * Purpose: Deterministically construct the Business Login OAuth URL using the
 *          Authorization Code grant to avoid SDK defaults to token flow.
 * References:
 *  - Facebook Login for Business (manual/SDK invocation):
 *    https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

export interface BuildBusinessLoginUrlArgs {
  appId: string
  configId: string
  redirectUri: string
  graphVersion: string
  state: string
  returnScopes?: boolean
}

export function buildBusinessLoginUrl(args: BuildBusinessLoginUrlArgs): string {
  const { appId, configId, redirectUri, graphVersion, state, returnScopes = true } = args

  const base = `https://www.facebook.com/${encodeURIComponent(graphVersion)}/dialog/oauth`
  const url = new URL(base)
  url.searchParams.set('client_id', appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('config_id', configId)
  url.searchParams.set('display', 'popup')
  url.searchParams.set('response_type', 'code')
  if (returnScopes) url.searchParams.set('return_scopes', 'true')
  url.searchParams.set('state', state)
  return url.toString()
}

export function generateRandomState(bytes: number = 32): string {
  const arr = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(arr)
  } else {
    // Node fallback (not used in browser client code path)
    for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256)
  }
  // base64url encode
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  const b64 = typeof btoa === 'function' ? btoa(str) : Buffer.from(str, 'binary').toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}


