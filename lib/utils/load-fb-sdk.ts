/**
 * Feature: Facebook JS SDK Loader
 * Purpose: Asynchronously load and initialize the Facebook JS SDK in the browser, idempotently.
 * References:
 *  - FB JS SDK Quickstart: https://developers.facebook.com/docs/javascript/quickstart/
 *  - FB.init: https://developers.facebook.com/docs/javascript/reference/FB.init
 */

export interface LoadFacebookSDKOptions {
  appId: string
  version: string
  cookie?: boolean
  xfbml?: boolean
}

let sdkPromise: Promise<NonNullable<Window['FB']>> | null = null

export function loadFacebookSDK(opts: LoadFacebookSDKOptions): Promise<NonNullable<Window['FB']>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Facebook SDK can only load in the browser'))
  }

  if (window.FB) {
    return Promise.resolve(window.FB as NonNullable<Window['FB']>)
  }

  if (sdkPromise) {
    return sdkPromise
  }

  sdkPromise = new Promise<NonNullable<Window['FB']>>((resolve, reject) => {
    let resolved = false

    const onReady = () => {
      try {
        if (!window.FB) return
        // Prime session info to avoid first-call latency
        try {
          window.FB.getLoginStatus?.(() => {})
        } catch {}
        resolved = true
        resolve(window.FB as NonNullable<Window['FB']>)
      } catch (err) {
        reject(err as Error)
      }
    }

    // Chain any existing fbAsyncInit
    const prevInit = window.fbAsyncInit
    window.fbAsyncInit = function fbInitWrapper() {
      try {
        window.FB?.init({
          appId: opts.appId,
          version: opts.version,
          cookie: opts.cookie ?? true,
          xfbml: opts.xfbml ?? false,
        })
        try {
          // Optional analytics event per FB docs
          window.FB?.AppEvents?.logPageView?.()
        } catch {}
      } finally {
        // Invoke previous init if present
        try { prevInit?.() } catch {}
        onReady()
      }
    }

    const scriptId = 'facebook-jssdk'
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null

    const handleError = () => {
      if (!resolved) reject(new Error('Failed to load Facebook SDK'))
    }

    if (existing) {
      existing.addEventListener('error', handleError)
      // If the script is already present, FB may already call fbAsyncInit soon
      // As a safety, poll briefly for FB existence
      const start = Date.now()
      const check = () => {
        if (window.FB) {
          onReady()
          return
        }
        if (Date.now() - start > 5000) {
          handleError()
          return
        }
        setTimeout(check, 50)
      }
      check()
      return
    }

    const js = document.createElement('script')
    js.id = scriptId
    js.async = true
    js.defer = true
    js.crossOrigin = 'anonymous'
    js.src = 'https://connect.facebook.net/en_US/sdk.js'
    js.addEventListener('error', handleError)

    const fjs = document.getElementsByTagName('script')[0]
    if (fjs && fjs.parentNode) {
      fjs.parentNode.insertBefore(js, fjs)
    } else {
      document.head.appendChild(js)
    }
  })

  return sdkPromise
}


