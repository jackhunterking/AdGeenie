/**
 * Feature: Facebook JS SDK Types
 * Purpose: Provide typed globals for window.FB and fbAsyncInit used by the loader and components.
 * References:
 *  - FB JS SDK Reference: https://developers.facebook.com/docs/javascript/reference/FB
 *  - FB.login Reference: https://developers.facebook.com/docs/javascript/reference/FB.login
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

interface FBAuthResponse {
  accessToken: string
  expiresIn: string | number
  signedRequest: string
  userID: string
  data_access_expiration_time?: number
  graphDomain?: string
}

interface FBLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown'
  authResponse?: FBAuthResponse
}

interface FBNamespace {
  init: (opts: { appId?: string; version?: string; cookie?: boolean; xfbml?: boolean }) => void
  login: (
    cb: (res: FBLoginStatusResponse) => void,
    opts?: { scope?: string; auth_type?: string; return_scopes?: boolean }
  ) => void
  getLoginStatus: (cb: (res: FBLoginStatusResponse) => void, forceRefresh?: boolean) => void
  api: (path: string, callback: (res: unknown) => void) => void
  api: (path: string, method: string, params: Record<string, unknown>, callback: (res: unknown) => void) => void
  /**
   * FB.ui dialog invocation.
   * Minimal typing to support ads payment dialog while remaining flexible.
   * https://developers.facebook.com/docs/javascript/reference/FB.ui/
   */
  ui: (
    params: { method: string } & Record<string, unknown>,
    callback?: (response: unknown) => void
  ) => void
  AppEvents?: { logPageView?: () => void }
}

declare global {
  interface Window {
    FB?: FBNamespace
    fbAsyncInit?: () => void
  }
}

export type { 
  FBLoginStatusResponse, 
  FBAuthResponse 
}


