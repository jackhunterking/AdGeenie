"use client"

/**
 * Feature: Meta payment popup bridge
 * Purpose: If Facebook's ads_payment dialog redirects to our domain instead of staying in
 *          a popup UI, notify the opener via postMessage and close the window.
 */

import { useEffect, useState } from "react"

export default function PaymentBridgePage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Finalizing payment method...')

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const errorReason = urlParams.get('error_reason')
    const errorDescription = urlParams.get('error_description')

    if (error || errorReason) {
      setStatus('error')
      setMessage(errorDescription || errorReason || 'Payment setup was cancelled or failed. You can close this window.')
      return
    }

    let messageSent = false
    try {
      const opener = window.opener
      if (opener && typeof opener.postMessage === 'function') {
        // Canonical event for current listeners
        opener.postMessage({ 
          type: 'META_CONNECTED',
          status: 'payment-added'
        }, window.location.origin)
        // Back-compat for any legacy listeners
        opener.postMessage({ 
          type: 'meta-connected',
          status: 'payment-added'
        }, window.location.origin)
        messageSent = true
        setStatus('success')
        setMessage('Payment method added successfully! Closing window...')
        const closeTimer = setTimeout(() => {
          try { window.close() } catch {}
        }, 1500)
        return () => clearTimeout(closeTimer)
      }
    } catch {}

    if (!messageSent) {
      setMessage('Payment setup completed. You can close this window.')
      setStatus('success')
    }
  }, [])

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <p style={{ 
          fontSize: '1.1rem', marginBottom: '0.5rem',
          color: status === 'error' ? '#dc2626' : status === 'success' ? '#16a34a' : '#1f2937'
        }}>
          {message}
        </p>
      </div>
    </div>
  )
}


