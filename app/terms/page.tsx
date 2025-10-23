/**
 * Feature: Terms of Use Page
 * Purpose: Provide public Terms of Use required for Meta platform compliance.
 * References:
 *  - Meta Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - Meta Platform Terms: https://developers.facebook.com/terms
 *  - Meta Platform Policy – Data Deletion: https://developers.facebook.com/docs/development/build-and-test/app-dashboard/data-deletion
 *  - AI SDK Core: N/A for static legal pages
 *  - AI Elements: N/A for static legal pages
 *  - Vercel AI Gateway: N/A for static legal pages
 *  - Supabase: N/A for static legal pages
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Use | AdPilot',
  description: 'The terms and conditions governing your use of AdPilot.',
}

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com'

export default function TermsOfUsePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Terms of Use</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: October 23, 2025</p>

      <div className="prose prose-neutral dark:prose-invert">
        <p>
          These Terms of Use (the “Terms”) govern your access to and use of AdPilot (the “Service”). By using the
          Service, you agree to be bound by these Terms.
        </p>

        <h2>1. Eligibility and Accounts</h2>
        <p>
          You must be at least 18 years old and have the authority to enter into these Terms. You are responsible for
          your account credentials and all activity under your account. Promptly notify us of any unauthorized use.
        </p>

        <h2>2. Use of the Service</h2>
        <p>
          You agree to use the Service in compliance with applicable laws and platform policies (including Meta platform
          policies) and not to misuse, interfere with, or disrupt the Service or its security.
        </p>

        <h2>3. AI‑Generated Content</h2>
        <p>
          The Service may generate creative content based on your inputs. You are solely responsible for reviewing and
          approving any generated content before use and for ensuring compliance with applicable advertising and
          platform rules.
        </p>

        <h2>4. Fees, Billing, and <strong>No Refunds</strong></h2>
        <p>
          Certain features may require payment of fees or subscriptions. All charges are due as stated at purchase and
          are final. <strong>No refunds</strong> are provided for any fees, subscriptions, or usage charges, including
          for partial periods, unused features, or downgrades, except where required by law.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          We and our licensors own the Service and its content (excluding content you provide). Subject to your
          compliance with these Terms, we grant you a limited, non‑exclusive, non‑transferable license to use the
          Service.
        </p>

        <h2>6. Prohibited Activities</h2>
        <ul>
          <li>Reverse engineering, scraping, or circumventing security or rate limits.</li>
          <li>Using the Service to violate laws, third‑party rights, or platform policies.</li>
          <li>Submitting malicious, unlawful, or misleading content.</li>
        </ul>

        <h2>7. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
          INCLUDING FITNESS FOR A PARTICULAR PURPOSE, MERCHANTABILITY, AND NON‑INFRINGEMENT.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
          INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION
          WITH YOUR USE OF THE SERVICE.
        </p>

        <h2>9. Indemnification</h2>
        <p>
          You agree to defend, indemnify, and hold us harmless from any claims, damages, liabilities, and expenses
          (including reasonable attorneys’ fees) arising from your use of the Service or violation of these Terms.
        </p>

        <h2>10. Termination</h2>
        <p>
          We may suspend or terminate access to the Service at any time with or without cause. Upon termination, your
          right to use the Service will immediately cease.
        </p>

        <h2>11. Changes to the Terms</h2>
        <p>
          We may update these Terms from time to time. The updated version will be indicated by an updated “Last
          updated” date. Your continued use of the Service constitutes acceptance of the updated Terms.
        </p>

        <h2>12. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the United States and the state specified by our principal place of
          business, without regard to conflict of law principles.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Contact us at <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </div>
  )
}


