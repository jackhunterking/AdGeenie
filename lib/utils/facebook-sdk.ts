/**
 * Facebook SDK Helper Functions
 * SDK is initialized globally via app/layout.tsx
 * References:
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
 *  - FB.ui Reference: https://developers.facebook.com/docs/javascript/reference/FB.ui
 */

import type { 
  FBBusinessLoginResponse,
  FBBusinessLoginCallbackResponse,
  FBErrorResponse
} from '@/lib/types/facebook'

/**
 * Type guard to check if response is an error response
 */
function isFBErrorResponse(response: FBBusinessLoginCallbackResponse): response is FBErrorResponse {
  return response !== null && response !== undefined && 'error' in response
}

/**
 * Type guard to check if response is a successful business login response
 */
function isFBBusinessLoginSuccess(response: FBBusinessLoginCallbackResponse): response is FBBusinessLoginResponse {
  return (
    response !== null && 
    response !== undefined && 
    'signed_request' in response && 
    'request_id' in response
  )
}

/**
 * Launch Facebook Business Login Dialog
 * Returns signed_request and request_id needed for backend verification
 */
export const fbBusinessLogin = (
  campaignId: string,
  permissions: string[]
): Promise<FBBusinessLoginResponse> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized'))
      return
    }

    window.FB.ui(
      {
        method: 'business_login',
        display: 'popup',
        permissions,
        payload: { campaignId },
      },
      (response) => {
        if (!response) {
          reject(new Error('Dialog was closed by user'))
          return
        }

        if (isFBErrorResponse(response)) {
          reject(new Error(response.error.message || 'Facebook business login failed'))
          return
        }

        if (isFBBusinessLoginSuccess(response)) {
          resolve({
            signed_request: response.signed_request,
            request_id: response.request_id,
          })
          return
        }

        reject(new Error('Unexpected response format from Facebook'))
      }
    )
  })
}
