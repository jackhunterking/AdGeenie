/**
 * Facebook SDK Helper Functions
 * SDK is initialized globally via app/layout.tsx
 * References:
 *  - Facebook Login: https://developers.facebook.com/docs/facebook-login/web
 *  - FB.login Reference: https://developers.facebook.com/docs/javascript/reference/FB.login
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 */

import type { 
  FBLoginStatusResponse,
  FBAuthResponse
} from '@/lib/types/facebook'

export interface FBLoginResult {
  accessToken: string
  userID: string
  expiresIn: string | number
}

/**
 * Launch Facebook Login Dialog with Business Permissions
 * Uses standard FB.login() with business-related permissions
 * Returns accessToken and userID for backend to fetch business assets
 */
export const fbLogin = (permissions: string[]): Promise<FBLoginResult> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized'))
      return
    }

    // Join permissions into comma-separated string
    const scope = permissions.join(',')

    window.FB.login(
      (response: FBLoginStatusResponse) => {
        if (response.status === 'connected' && response.authResponse) {
          // User successfully logged in and granted permissions
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID,
            expiresIn: response.authResponse.expiresIn,
          })
        } else if (response.status === 'not_authorized') {
          // User is logged into Facebook but did not authorize the app
          reject(new Error('You must grant permissions to connect your Meta account'))
        } else {
          // User is not logged into Facebook or cancelled the dialog
          reject(new Error('Facebook login was cancelled or failed'))
        }
      },
      { scope, return_scopes: true }
    )
  })
}

/**
 * Check current Facebook login status
 * Useful for checking if user is already connected
 */
export const fbGetLoginStatus = (): Promise<FBLoginStatusResponse> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized'))
      return
    }

    window.FB.getLoginStatus((response: FBLoginStatusResponse) => {
      resolve(response)
    })
  })
}
