/**
 * Feature: Facebook JS SDK Types
 * Purpose: Provide typed globals for window.FB and fbAsyncInit used by the loader and components.
 * References:
 *  - FB JS SDK Reference: https://developers.facebook.com/docs/javascript/reference/FB
 */

interface FBAuthResponse {
  accessToken: string
  expiresIn: string | number
  signedRequest: string
  userID: string
}

interface FBLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown'
  authResponse?: FBAuthResponse
}

interface FBBusinessLoginResponse {
  signed_request: string
  request_id: string
}

interface FBNamespace {
  init: (opts: { appId?: string; version?: string; cookie?: boolean; xfbml?: boolean }) => void
  ui: (
    params: Record<string, unknown>,
    cb?: (response: unknown) => void
  ) => void
  login?: (
    cb: (res: FBLoginStatusResponse) => void,
    opts?: { scope?: string }
  ) => void
  getLoginStatus?: (cb: (res: FBLoginStatusResponse) => void) => void
  api?: (path: string, cb: (res: unknown) => void) => void
  AppEvents?: { logPageView?: () => void }
}

declare global {
  interface Window {
    FB?: FBNamespace
    fbAsyncInit?: () => void
  }
}

export type { FBLoginStatusResponse, FBBusinessLoginResponse, FBAuthResponse }


