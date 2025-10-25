/**
 * Feature: Generic advertiser privacy policy page
 * Purpose: Provide a static, generic privacy policy businesses can use in Meta Instant Forms.
 * References:
 *  - Supplied by product requirements (static copy, not AdPilot's policy)
 */

export default function GeneralPrivacyPolicyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">General Privacy Policy for Advertisers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        This page provides a generic privacy policy template intended for businesses running ads. It is not
        the privacy policy of AdPilot and should be reviewed by your business before use.
      </p>

      <section className="space-y-4 text-sm leading-6">
        <p>
          We respect your privacy. This policy explains how we collect, use, and protect the personal
          information you provide through our lead forms, including on Facebook and Instagram Instant Forms.
        </p>

        <h2 className="text-base font-semibold">Information We Collect</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>Full name</li>
          <li>Email address</li>
          <li>Phone number</li>
          <li>Any additional information you choose to provide</li>
        </ul>

        <h2 className="text-base font-semibold">How We Use Your Information</h2>
        <ul className="list-disc ml-5 space-y-1">
          <li>To contact you regarding your inquiry or request</li>
          <li>To provide information about our products or services</li>
          <li>To improve our marketing and customer support</li>
        </ul>

        <h2 className="text-base font-semibold">Sharing Your Information</h2>
        <p>
          We do not sell your personal information. We may share it with service providers solely to help us
          deliver our services (for example, email or CRM providers) under appropriate confidentiality
          agreements, or if required by law.
        </p>

        <h2 className="text-base font-semibold">Data Retention</h2>
        <p>
          We retain your information only as long as necessary to fulfill the purposes outlined above or as
          required by applicable law.
        </p>

        <h2 className="text-base font-semibold">Your Choices</h2>
        <p>
          You may request access, correction, or deletion of your personal information by contacting us using
          the details below. You can opt out of marketing communications at any time by following the
          unsubscribe instructions in our emails.
        </p>

        <h2 className="text-base font-semibold">Contact</h2>
        <p>
          If you have questions about this policy or our data practices, please contact the business running
          the advertisement using the details provided in the ad or on their website.
        </p>

        <div className="pt-4 text-xs text-muted-foreground">
          Last updated: {new Date().getFullYear()}
        </div>
      </section>
    </main>
  )
}


