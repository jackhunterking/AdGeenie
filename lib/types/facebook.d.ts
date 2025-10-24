/**
 * Feature: Facebook JS SDK Types
 * Purpose: Provide typed globals for window.FB and fbAsyncInit used by the loader and components.
 * References:
 *  - FB JS SDK Reference: https://developers.facebook.com/docs/javascript/reference/FB
 *  - FB.ui Reference: https://developers.facebook.com/docs/javascript/reference/FB.ui
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
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

/**
 * Facebook Error Response
 * Returned by FB.ui when an error occurs
 */
interface FBErrorResponse {
  error: {
    message: string
    code?: number
    type?: string
  }
}

/**
 * Facebook Business Login Success Response
 * Returned by FB.ui with method: 'business_login'
 */
interface FBBusinessLoginResponse {
  signed_request: string
  request_id: string
}

/**
 * Union type for FB.ui business_login callback responses
 * Can be null (dialog closed), error response, or success response
 */
type FBBusinessLoginCallbackResponse = 
  | null 
  | undefined 
  | FBErrorResponse 
  | FBBusinessLoginResponse

interface FBNamespace {
  init: (opts: { appId?: string; version?: string; cookie?: boolean; xfbml?: boolean }) => void
  ui: (
    params: Record<string, unknown>,
    cb?: (response: FBBusinessLoginCallbackResponse) => void
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

export type { 
  FBLoginStatusResponse, 
  FBBusinessLoginResponse, 
  FBBusinessLoginCallbackResponse,
  FBErrorResponse,
  FBAuthResponse 
}


