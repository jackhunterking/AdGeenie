/**
 * Feature: Facebook SDK Utilities
 * Purpose: Initialize and manage Facebook JS SDK with Promise-based pattern
 * References:
 *  - Medium Article: https://innocentanyaele.medium.com/how-to-use-facebook-js-sdk-for-login-on-react-or-next-js-5b988e7971df
 *  - Facebook JS SDK: https://developers.facebook.com/docs/javascript/quickstart/
 *  - Business Login: https://developers.facebook.com/docs/business-apps/business-login
 */

import type { FBLoginStatusResponse, FBBusinessLoginResponse } from '@/lib/types/facebook'

const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID as string
const FB_GRAPH_VERSION = process.env.NEXT_PUBLIC_FB_GRAPH_VERSION || 'v24.0'

/**
 * Initialize Facebook SDK - Returns a Promise that resolves when SDK is ready
 */
export const initFacebookSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Facebook SDK can only be initialized in browser'))
      return
    }

    if (!FB_APP_ID) {
      reject(new Error('Missing NEXT_PUBLIC_FB_APP_ID environment variable'))
      return
    }

    // If SDK already loaded and initialized
    if (window.FB) {
      console.log('[FB SDK] Already initialized')
      resolve()
      return
    }

    console.log('[FB SDK] Setting up initialization...')

    // Set up timeout to reject if initialization takes too long
    const timeout = setTimeout(() => {
      reject(new Error('Facebook SDK initialization timeout after 10 seconds'))
    }, 10000)

    // Set up the async init callback
    window.fbAsyncInit = () => {
      try {
        console.log('[FB SDK] Initializing...')
        window.FB!.init({
          appId: FB_APP_ID,
          cookie: true,
          xfbml: true,
          version: FB_GRAPH_VERSION
        })

        // Optional: Log page view as per Facebook documentation
        window.FB!.AppEvents?.logPageView?.()

        console.log('[FB SDK] Initialized successfully')
        clearTimeout(timeout)
        resolve()
      } catch (error) {
        console.error('[FB SDK] Initialization failed:', error)
        clearTimeout(timeout)
        reject(error)
      }
    }

    // If script is already in DOM but not initialized yet, wait for fbAsyncInit
    const existingScript = document.getElementById('facebook-jssdk')
    if (existingScript) {
      console.log('[FB SDK] Script found in DOM, waiting for initialization...')
      // fbAsyncInit should be called soon by the script
    } else {
      console.warn('[FB SDK] Script not found in DOM - make sure it is loaded in layout.tsx')
    }
  })
}

/**
 * Get Facebook login status
 */
export const getFacebookLoginStatus = (): Promise<FBLoginStatusResponse> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized. Call initFacebookSdk() first.'))
      return
    }

    window.FB.getLoginStatus?.((response) => {
      console.log('[FB SDK] Login status:', response.status)
      resolve(response)
    })
  })
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
      reject(new Error('Facebook SDK not initialized. Call initFacebookSdk() first.'))
      return
    }

    console.log('[FB SDK] Launching business_login dialog for campaign:', campaignId)

    window.FB.ui(
      {
        method: 'business_login',
        display: 'popup',
        permissions,
        payload: { campaignId },
      },
      (response: unknown) => {
        console.log('[FB SDK] business_login response:', response)

        // User closed the dialog
        if (!response) {
          reject(new Error('Dialog was closed by user'))
          return
        }

        // Check for error response
        if (response.error) {
          reject(new Error(response.error.message || 'Facebook business login failed'))
          return
        }

        // Validate required fields
        if (!response.signed_request || !response.request_id) {
          reject(new Error('Missing signed_request or request_id in response'))
          return
        }

        resolve({
          signed_request: response.signed_request,
          request_id: response.request_id,
        })
      }
    )
  })
}

/**
 * Regular Facebook Login (for comparison/fallback)
 * Returns authResponse with access token
 */
export const fbLogin = (permissions: string[] = ['public_profile', 'email']): Promise<FBLoginStatusResponse> => {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK not initialized. Call initFacebookSdk() first.'))
      return
    }

    console.log('[FB SDK] Launching regular login dialog')

    window.FB.login?.(
      (response) => {
        console.log('[FB SDK] Login response:', response)

        if (response.authResponse) {
          resolve(response)
        } else {
          reject(new Error('User cancelled login or did not fully authorize'))
        }
      },
      { scope: permissions.join(',') }
    )
  })
}

