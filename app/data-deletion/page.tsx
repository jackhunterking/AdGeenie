/**
 * Feature: Data Deletion Instructions Page
 * Purpose: Provide user‑facing instructions for data deletion to satisfy Meta requirements.
 * References:
 *  - Meta Platform Policy – Data Deletion: https://developers.facebook.com/docs/development/build-and-test/app-dashboard/data-deletion
 *  - Meta Developer Data Use Policy: https://developers.facebook.com/terms/dfc_platform_terms
 *  - Meta Login (Web): https://developers.facebook.com/docs/facebook-login/web
 *  - AI SDK Core: N/A for static legal pages
 *  - AI Elements: N/A for static legal pages
 *  - Vercel AI Gateway: N/A for static legal pages
 *  - Supabase: N/A for static legal pages
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Shield, Trash2, Clock, Database, FileCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Data Deletion Request | AdPilot',
  description: 'Request deletion of your personal data from AdPilot. Learn about our data deletion process and timeline.',
}

const CONTACT_EMAIL = 'hello@adpilot.studio'

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {/* Hero Section */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-4xl font-bold">Data Deletion Request</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            At AdPilot, we respect your privacy and give you full control over your personal data. 
            This page explains how to request deletion of your data in compliance with Meta's policies.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Last updated: October 28, 2025</p>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="border border-border rounded-lg p-6 bg-card">
            <Clock className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">30-Day Timeline</h3>
            <p className="text-sm text-muted-foreground">
              Requests processed within 30 days of verification
            </p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-card">
            <Database className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Complete Deletion</h3>
            <p className="text-sm text-muted-foreground">
              All personal data and Meta connections removed
            </p>
          </div>
          <div className="border border-border rounded-lg p-6 bg-card">
            <FileCheck className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold mb-2">Confirmation Email</h3>
            <p className="text-sm text-muted-foreground">
              Receive confirmation once deletion is complete
            </p>
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          
          {/* How to Request Section */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold m-0">How to Request Data Deletion</h2>
            </div>
            
            <div className="bg-muted/50 border border-border rounded-lg p-6 mb-6">
              <p className="text-base mb-4 font-medium">
                To request deletion of your data, send an email to:
              </p>
              <a 
                href={`mailto:${CONTACT_EMAIL}?subject=Data%20Deletion%20Request`}
                className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline"
              >
                <Mail className="h-5 w-5" />
                {CONTACT_EMAIL}
              </a>
            </div>

            <h3 className="text-xl font-semibold mt-8 mb-4">Required Information</h3>
            <p>Please include the following information in your deletion request email:</p>
            <ol className="space-y-3">
              <li>
                <strong>Subject Line:</strong> Use "Data Deletion Request" as the email subject
              </li>
              <li>
                <strong>Your Full Name:</strong> The name associated with your AdPilot account
              </li>
              <li>
                <strong>Account Email:</strong> The email address you used to register with AdPilot
              </li>
              <li>
                <strong>Meta Platform(s):</strong> Specify which Meta platforms you connected (Facebook, Instagram)
              </li>
              <li>
                <strong>User ID (Optional):</strong> Your AdPilot user ID if available, to help us locate your data faster
              </li>
            </ol>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mt-6">
              <p className="text-sm mb-0">
                <strong>📧 Email Template:</strong> You can copy and paste this template for your request:
              </p>
              <pre className="bg-background border border-border rounded p-3 mt-3 text-xs overflow-x-auto">
{`Subject: Data Deletion Request

Hello AdPilot Team,

I would like to request the deletion of my personal data from AdPilot.

Full Name: [Your Name]
Account Email: [your@email.com]
Meta Platforms Connected: [Facebook/Instagram]
User ID (if known): [Your User ID]

Please confirm once the deletion is complete.

Thank you.`}
              </pre>
            </div>
          </section>

          {/* Processing Section */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold m-0">What We Delete</h2>
            </div>

            <p>Upon receiving your verified deletion request, we will permanently remove:</p>
            <ul className="space-y-2">
              <li><strong>Account Information:</strong> Your name, email address, and authentication credentials</li>
              <li><strong>Campaign Data:</strong> All campaigns, ad copy, creative assets, and settings you created</li>
              <li><strong>Usage Data:</strong> Your interaction history, preferences, and analytics data</li>
              <li><strong>Meta Connections:</strong> All access tokens, Page connections, Ad Account links, and Instagram account connections</li>
              <li><strong>Generated Content:</strong> AI-generated content, prompts, and conversation history</li>
              <li><strong>Billing Information:</strong> Payment history and subscription details (subject to legal retention requirements)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-4">Processing Timeline</h3>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">1</div>
                <div>
                  <p className="font-semibold mb-1">Verification (1-2 business days)</p>
                  <p className="text-sm text-muted-foreground">We verify your identity to ensure the security of your data</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">2</div>
                <div>
                  <p className="font-semibold mb-1">Processing (up to 30 days)</p>
                  <p className="text-sm text-muted-foreground">We initiate deletion from our production systems and databases</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">3</div>
                <div>
                  <p className="font-semibold mb-1">Confirmation</p>
                  <p className="text-sm text-muted-foreground">You receive email confirmation when deletion is complete</p>
                </div>
              </div>
            </div>
          </section>

          {/* Meta Deauthorization Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Deauthorizing via Meta</h2>
            <p>
              You can also remove AdPilot's access directly from your Facebook account settings. This will immediately 
              revoke our access to your Meta data, but some information may remain in our systems.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-4">Steps to Deauthorize:</h3>
            <ol className="space-y-3">
              <li>
                Go to your Facebook Settings → <strong>Apps and Websites</strong>
              </li>
              <li>
                Find <strong>AdPilot</strong> in the list of connected apps
              </li>
              <li>
                Click <strong>Remove</strong> to revoke access
              </li>
              <li>
                Email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a> to 
                request deletion of any remaining data stored by AdPilot
              </li>
            </ol>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4 mt-6">
              <p className="text-sm mb-0">
                <strong>⚠️ Important:</strong> Deauthorizing via Facebook only removes our access to your Meta account. 
                To delete all data stored in AdPilot, you must also submit a deletion request via email.
              </p>
            </div>
          </section>

          {/* Backups and Retention Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Backups and Data Retention</h2>
            <p>
              While we delete your data from our production systems immediately, certain technical and legal considerations apply:
            </p>
            <ul className="space-y-2">
              <li>
                <strong>Encrypted Backups:</strong> Data may persist in encrypted backups for up to 30 days. 
                These backups are automatically purged on a rolling basis and cannot be accessed or restored.
              </li>
              <li>
                <strong>Legal Obligations:</strong> In certain circumstances, we may be required to retain specific 
                information to comply with legal obligations, resolve disputes, enforce agreements, or prevent fraud. 
                In such cases, the data will be restricted and not processed for other purposes.
              </li>
              <li>
                <strong>Aggregated Data:</strong> Anonymized, aggregated data that cannot identify you personally 
                may be retained for analytics and service improvement purposes.
              </li>
            </ul>
          </section>

          {/* Compliance Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Compliance with Meta's Policies</h2>
            <p>
              This data deletion process is designed to comply with Meta's Developer Data Use Policy and Platform Terms, 
              which require that developers:
            </p>
            <ul className="space-y-2">
              <li>Delete user data upon request</li>
              <li>Remove data when it is no longer necessary for the provided service</li>
              <li>Provide clear instructions for users to request data deletion</li>
              <li>Process deletion requests within a reasonable timeframe</li>
            </ul>
            <p className="mt-4">
              For more information about Meta's data policies, visit{' '}
              <a 
                href="https://developers.facebook.com/terms/dfc_platform_terms" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Meta's Developer Data Use Policy
              </a>.
            </p>
          </section>

          {/* Your Rights Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Your Privacy Rights</h2>
            <p>
              Depending on your location, you may have additional rights under data protection laws such as GDPR, CCPA, 
              and other regional privacy regulations:
            </p>
            <ul className="space-y-2">
              <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Right to Deletion:</strong> Request deletion of your personal data (as described on this page)</li>
              <li><strong>Right to Restriction:</strong> Limit how we process your data</li>
              <li><strong>Right to Portability:</strong> Receive your data in a machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to certain types of data processing</li>
            </ul>
            <p className="mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>

          {/* Contact Section */}
          <section className="border-t border-border pt-8">
            <h2 className="text-2xl font-bold mb-4">Questions or Concerns?</h2>
            <p>
              If you have any questions about our data deletion process, your privacy rights, or our data practices, 
              please don't hesitate to contact us:
            </p>
            <div className="bg-card border border-border rounded-lg p-6 mt-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold mb-2">Email Us</p>
                  <a 
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-lg text-primary hover:underline font-medium"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <p className="text-sm text-muted-foreground mt-2">
                    We typically respond within 1-2 business days
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              For general information about our privacy practices, please review our{' '}
              <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{' '}
              <Link href="/terms" className="text-primary hover:underline">Terms of Use</Link>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}


