"use client"

/**
 * Feature: Meta payment popup bridge
 * Purpose: If Facebook's ads_payment dialog redirects to our domain instead of staying in
 *          a popup UI, notify the opener via postMessage and close the window.
 * References:
 *  - FB.ui: https://developers.facebook.com/docs/javascript/reference/FB.ui/
 *  - JavaScript Ads Dialog for Payments: https://developers.facebook.com/docs/marketing-apis/guides/javascript-ads-dialog-for-payments/
 */

import { useEffect, useState } from "react"

export default function PaymentBridgePage() {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Finalizing payment method...')

  useEffect(() => {
    // Check URL parameters for success/error indicators
    const urlParams = new URLSearchParams(window.location.search)
    const error = urlParams.get('error')
    const errorReason = urlParams.get('error_reason')
    const errorDescription = urlParams.get('error_description')

    if (error || errorReason) {
      setStatus('error')
      setMessage(errorDescription || errorReason || 'Payment setup was cancelled or failed. You can close this window.')
      return
    }

    // Attempt to notify opener window
    let messageSent = false
    try {
      const opener = window.opener
      if (opener && typeof opener.postMessage === 'function') {
        // Send success message to opener
        opener.postMessage({ 
          type: 'meta-connected',
          status: 'payment-added'
        }, window.location.origin) // Use same origin for security
        
        messageSent = true
        setStatus('success')
        setMessage('Payment method added successfully! Closing window...')
        
        // Auto-close after short delay if message was sent successfully
        const closeTimer = setTimeout(() => {
          try {
            window.close()
          } catch (closeError) {
            // Window might not be closable (not opened by script)
            console.warn('[PaymentBridge] Could not auto-close window:', closeError)
            setMessage('Payment method added successfully! You can close this window.')
          }
        }, 2000)
        
        return () => {
          clearTimeout(closeTimer)
        }
      }
    } catch (error) {
      console.error('[PaymentBridge] Failed to notify opener:', error)
    }

    // If message was not sent, show appropriate message
    if (!messageSent) {
      setMessage('Payment setup completed. You can close this window.')
      setStatus('success')
    }
  }, [])

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {status === 'success' && (
          <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>✓</div>
        )}
        {status === 'error' && (
          <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>✗</div>
        )}
        {status === 'processing' && (
          <div style={{ 
            marginBottom: '1rem', 
            fontSize: '2rem',
            animation: 'spin 1s linear infinite',
            display: 'inline-block'
          }}>⟳</div>
        )}
        <p style={{ 
          fontSize: '1.1rem',
          marginBottom: '0.5rem',
          color: status === 'error' ? '#dc2626' : status === 'success' ? '#16a34a' : '#1f2937'
        }}>
          {message}
        </p>
        {status === 'processing' && (
          <p style={{ fontSize: '0.9rem', color: '#6b7280', marginTop: '0.5rem' }}>
            Please wait while we finalize your payment method...
          </p>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  )
}


