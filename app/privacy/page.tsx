/**
 * Feature: Privacy Policy Page
 * Purpose: Provide a public Privacy Policy required for Meta platform compliance.
 * References:
 *  - Meta Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - Meta Platform Policy – Data Deletion: https://developers.facebook.com/docs/development/build-and-test/app-dashboard/data-deletion
 *  - Meta Platform Terms: https://developers.facebook.com/terms
 *  - AI SDK Core: N/A for static legal pages
 *  - AI Elements: N/A for static legal pages
 *  - Vercel AI Gateway: N/A for static legal pages
 *  - Supabase: N/A for static legal pages
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | AdPilot',
  description: 'How AdPilot collects, uses, and protects your information.',
}

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">Last updated: October 23, 2025</p>

      <div className="prose prose-neutral dark:prose-invert">
        <p>
          This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use AdPilot (the
          “Service”). By using the Service, you agree to the collection and use of information in accordance with this
          policy.
        </p>

        <h2>Information We Collect</h2>
        <ul>
          <li>
            Account Information: name, email address, authentication identifiers, and profile data necessary to create
            and maintain your account.
          </li>
          <li>
            Usage Information: interactions with the app, device and log data, approximate location (derived from IP),
            and preferences for improving the Service.
          </li>
          <li>
            Content You Provide: prompts, campaign inputs, creative assets, and feedback you submit.
          </li>
          <li>
            Third‑Party Connections: if you connect Meta assets (Pages, Instagram accounts, Ad Accounts), we store the
            minimal identifiers and access tokens required to operate, in accordance with Meta policies.
          </li>
        </ul>

        <h2>How We Use Information</h2>
        <ul>
          <li>Provide and operate the Service, generate ad content, and manage campaigns you create.</li>
          <li>Authenticate users, secure accounts, and prevent abuse or misuse.</li>
          <li>Improve and personalize features, and perform analytics to enhance user experience.</li>
          <li>Comply with legal obligations and enforce our Terms of Use.</li>
        </ul>

        <h2>Sharing and Disclosure</h2>
        <p>
          We do not sell your personal information. We may share information with trusted service providers who support
          the Service (for hosting, analytics, or customer support) under appropriate confidentiality commitments, and as
          required by law or to protect rights, safety, and property. When you connect to Meta, the Service may interact
          with Meta APIs to list and manage assets you explicitly authorize.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain information for as long as necessary to provide the Service and meet legal obligations. You may
          request deletion of your data at any time; see the Data Deletion section below.
        </p>

        <h2>Security</h2>
        <p>
          We implement reasonable administrative, technical, and organizational measures designed to protect your
          information. However, no method of transmission over the Internet or method of electronic storage is 100%
          secure, and we cannot guarantee absolute security.
        </p>

        <h2>Children’s Privacy</h2>
        <p>
          The Service is not intended for individuals under the age of 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided us personal information, contact us and
          we will take steps to delete such information.
        </p>

        <h2>International Transfers</h2>
        <p>
          Your information may be processed in countries other than your own. Where applicable, we implement safeguards
          to protect transfers in accordance with relevant laws.
        </p>

        <h2>Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or restrict processing of your
          personal information, and to object to processing or request portability. You can exercise these rights by
          contacting us.
        </p>

        <h2>Data Deletion</h2>
        <p>
          For instructions on how to request deletion of your data, please visit our{' '}
          <Link href="/data-deletion/" className="underline">Data Deletion</Link> page.
        </p>

        <h2>Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The updated version will be indicated by an updated
          “Last updated” date. Continued use of the Service after such changes constitutes acceptance of the revised
          policy.
        </p>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or our data practices, contact us at{' '}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </div>
  )
}


