/**
 * Feature: Facebook JS SDK Types
 * Purpose: Provide typed globals for window.FB and fbAsyncInit used by the loader and components.
 * References:
 *  - FB JS SDK Reference: https://developers.facebook.com/docs/javascript/reference/FB
 *  - FB.login Reference: https://developers.facebook.com/docs/javascript/reference/FB.login
 *  - FB.ui Reference: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - JavaScript Ads Dialog for Payments: https://developers.facebook.com/docs/marketing-apis/guides/javascript-ads-dialog-for-payments/
 */

interface FBAuthResponse {
  accessToken: string
  expiresIn: string | number
  signedRequest: string
  userID: string
  data_access_expiration_time?: number
  graphDomain?: string
  // Scopes granted by the user (returned when return_scopes: true in FB.login)
  grantedScopes?: string // Comma-separated list of granted permissions
}

interface FBLoginStatusResponse {
  status: 'connected' | 'not_authorized' | 'unknown'
  authResponse?: FBAuthResponse
}

/**
 * Parameters for FB.ui ads_payment dialog
 * References: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */
export interface AdsPaymentParams {
  method: 'ads_payment'
  account_id: string // Numeric ad account ID (without 'act_' prefix)
  display: 'popup' // Required for popup display
  app_id?: string // Optional but recommended
  fallback_redirect_uri?: string // For when popup fails or user redirects
}

/**
 * Response from FB.ui ads_payment dialog callback
 */
export interface AdsPaymentResponse {
  status?: 'connected' | 'not_authorized' | 'unknown'
  error_message?: string
  error_code?: number
  // Additional response fields may be present
  [key: string]: unknown
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
   * Supports ads_payment dialog with proper typing.
   * https://developers.facebook.com/docs/javascript/reference/FB.ui/
   */
  ui: (
    params: AdsPaymentParams | ({ method: string } & Record<string, unknown>),
    callback?: (response: AdsPaymentResponse | unknown) => void
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
  FBAuthResponse,
  AdsPaymentParams,
  AdsPaymentResponse
}


