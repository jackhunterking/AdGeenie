/**
 * Feature: Data Deletion Instructions Page
 * Purpose: Provide user‑facing instructions for data deletion to satisfy Meta requirements.
 * References:
 *  - Meta Platform Policy – Data Deletion: https://developers.facebook.com/docs/development/build-and-test/app-dashboard/data-deletion
 *  - Meta Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - AI SDK Core: N/A for static legal pages
 *  - AI Elements: N/A for static legal pages
 *  - Vercel AI Gateway: N/A for static legal pages
 *  - Supabase: N/A for static legal pages
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Data Deletion | AdPilot',
  description: 'How to request deletion of your AdPilot account data.',
}

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com'

export default function DataDeletionPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Data Deletion</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: October 23, 2025</p>

      <div className="prose prose-neutral dark:prose-invert">
        <p>
          You can request deletion of your account and associated data at any time. Upon verification of your request,
          we will delete your personal information, campaign data, and third‑party connections (including Meta Page and
          Ad Account tokens) except where retention is required by law.
        </p>

        <h2>How to Request Deletion</h2>
        <ol>
          <li>
            Email us from your account email address at{' '}
            <a className="underline" href={`mailto:${SUPPORT_EMAIL}?subject=Data%20Deletion%20Request`}>{SUPPORT_EMAIL}</a> with the subject “Data Deletion Request”.
          </li>
          <li>
            Include your full name and the email associated with your AdPilot account. If you connected Meta assets,
            specify which assets you want disconnected.
          </li>
          <li>
            We will confirm receipt and complete deletion within 30 days, and disconnect any active Meta tokens.
          </li>
        </ol>

        <h2>Deauthorizing via Meta</h2>
        <p>
          You may also remove the app’s access in your Facebook account settings. Deauthorizing the app will revoke
          tokens; you can still email us to request full deletion of any remaining data stored by AdPilot.
        </p>

        <h2>Backups</h2>
        <p>
          Backups may be retained for up to 30 days and are automatically purged on a rolling basis. If your data
          appears in encrypted backups, it will be removed when the backup lifecycle completes.
        </p>

        <h2>Questions</h2>
        <p>
          If you have any questions about data deletion, contact us at{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </div>
  )
}


