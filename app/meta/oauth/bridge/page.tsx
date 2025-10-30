"use client"

/**
 * Feature: Meta OAuth Bridge (Popup → Parent)
 * Purpose: After Meta Business Login callback redirects here inside the popup,
 *          notify the opener window to refresh Meta connection state and then close.
 * References:
 *  - Facebook Login for Business: https://developers.facebook.com/docs/facebook-login/facebook-login-for-business/
 *  - Facebook JS SDK (popup flows): https://developers.facebook.com/docs/javascript/reference/FB.ui/
 */

import { useEffect } from "react"

export default function MetaOAuthBridgePage() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      const campaignId = url.searchParams.get("campaignId") || undefined
      const status = url.searchParams.get("meta") || "connected"

      const opener = window.opener
      const origin = window.location.origin

      if (opener && typeof opener.postMessage === "function") {
        opener.postMessage(
          {
            type: "META_CONNECTED",
            campaignId,
            status,
          },
          origin
        )

        // Give the message a moment to deliver, then close.
        setTimeout(() => {
          try { window.close() } catch { /* noop */ }
        }, 400)
      } else if (campaignId) {
        // Fallback: navigate the popup to the campaign page (opener will remain unchanged)
        window.location.replace(`/${encodeURIComponent(campaignId)}?meta=${encodeURIComponent(status)}`)
      }
    } catch {
      // If anything goes wrong, just attempt to close
      try { window.close() } catch { /* noop */ }
    }
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: '#666' }}>Finishing Meta connection…</p>
        <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>You can close this window.</p>
      </div>
    </div>
  )
}


