"use client"

/**
 * Feature: Meta payment popup bridge
 * Purpose: If Facebook's ads_payment dialog redirects to our domain instead of staying in
 *          a popup UI, notify the opener via postMessage and close the window.
 * References:
 *  - FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { useEffect } from "react"

export default function PaymentBridgePage() {
  useEffect(() => {
    try {
      const opener = window.opener
      if (opener && typeof opener.postMessage === 'function') {
        opener.postMessage({ type: 'meta-connected' }, '*')
      }
      // Give the message a moment to propagate, then close
      const id = window.setTimeout(() => {
        try { window.close() } catch {}
      }, 200)
      return () => window.clearTimeout(id)
    } catch {
      // swallow
    }
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <p>Finalizing… you can close this window.</p>
    </div>
  )
}


