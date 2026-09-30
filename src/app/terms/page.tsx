import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing access to and use of the newself AI hairstyle advisory service.",
};

const headingClass = "font-display text-2xl font-bold tracking-tight text-ink";
const listClass = "list-disc space-y-2 pl-6 marker:text-coral";

export default function TermsPage() {
  return (
    <InfoPage eyebrow="TERMS OF SERVICE" title="Clear terms for trying a new look.">
      <p className="text-sm font-semibold text-ink/45">Effective date: September 30, 2026</p>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of <Link className="font-semibold text-ink underline underline-offset-4" href="/">newself.cc</Link> and the newself AI hairstyle advisory service. By creating an account or using newself, you agree to these Terms and our <Link className="font-semibold text-ink underline underline-offset-4" href="/privacy">Privacy Policy</Link>.
      </p>

      <section className="space-y-3">
        <h2 className={headingClass}>1. Eligibility</h2>
        <p>
          You must be at least 16 years old and legally permitted to use the service where you live. If you are under the age of legal majority, a parent or guardian must review and agree to these Terms on your behalf.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>2. What newself provides</h2>
        <p>
          newself uses AI to analyze visible face and hair characteristics, recommend hairstyles, create hairstyle previews, and generate practical salon guidance. Features may change, remain experimental, or be unavailable from time to time.
        </p>
        <p>
          Results are informational and illustrative. AI can produce inaccurate, inconsistent, or unrealistic outputs. A preview does not guarantee that a haircut, color, perm, extension, or styling result can be achieved safely or exactly. Consult a qualified stylist before making a significant hair decision and follow professional advice concerning chemical treatments, allergies, scalp conditions, and hair health.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>3. Accounts and security</h2>
        <ul className={listClass}>
          <li>Provide accurate account information and keep it current.</li>
          <li>Protect access to your email and sign-in methods and take responsibility for activity under your account.</li>
          <li>Promptly notify us if you suspect unauthorized access.</li>
          <li>Do not create accounts through automated means, impersonate others, or transfer your account without permission.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>4. Your photos and content</h2>
        <p>
          You retain ownership of photos, prompts, references, and other content you submit. You grant newself a limited, worldwide, non-exclusive license to host, copy, process, modify, transmit, and display that content only as needed to operate and secure the requested service, improve its user-facing features, and comply with law. This license ends when the content is deleted, except for limited copies retained for legal, security, backup, or dispute-resolution purposes.
        </p>
        <p>You represent that:</p>
        <ul className={listClass}>
          <li>you own the content or have all permissions needed to upload and process it;</li>
          <li>you have consent to upload any image depicting another person;</li>
          <li>your content does not violate privacy, publicity, copyright, or other rights; and</li>
          <li>you will not upload unlawful, exploitative, or abusive content.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>5. Acceptable use</h2>
        <p>You may not use newself to:</p>
        <ul className={listClass}>
          <li>create deceptive impersonations, harass, exploit, or harm another person;</li>
          <li>upload intimate imagery, images of children, or another person&apos;s image without appropriate authority and consent;</li>
          <li>violate law or intellectual-property, privacy, publicity, or contractual rights;</li>
          <li>probe, disrupt, overload, reverse engineer, scrape, or bypass security, usage, or access controls;</li>
          <li>use automation to create accounts or generate content at abusive volume; or</li>
          <li>use outputs as biometric identification, medical advice, or evidence about sensitive personal traits.</li>
        </ul>
        <p>We may block content or suspend access when reasonably necessary to protect users, providers, or the service.</p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>6. AI outputs and intellectual property</h2>
        <p>
          Subject to these Terms and applicable law, you may use and download outputs generated for you. AI outputs may not be unique, may resemble results generated for others, and may not qualify for intellectual-property protection. You are responsible for reviewing outputs before publishing or relying on them.
        </p>
        <p>
          The newself software, interface, branding, catalog assets, prompts, and materials supplied by us are owned by newself or its licensors and protected by applicable laws. These Terms do not transfer ownership of those materials to you.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>7. Third-party services</h2>
        <p>
          newself relies on providers including Clerk, Google, Convex, Cloudflare, OpenAI, and Vercel. Their services may be subject to separate terms and may experience changes or outages outside our control. Google Sign-In is also subject to Google&apos;s applicable terms and privacy policy.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>8. Fees and future paid features</h2>
        <p>
          The current service may offer free or limited-access features. If paid plans or credits are introduced, we will display the price, included features, billing and renewal terms, and applicable refund policy before purchase. We will not charge you without authorization.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>9. Suspension and termination</h2>
        <p>
          You may stop using the service at any time. We may suspend or terminate access if you materially violate these Terms, create legal or security risk, abuse the service, fail to pay applicable fees, or if we discontinue the service. Where reasonable, we will provide notice and an opportunity to address the issue.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>10. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, newself is provided &quot;as is&quot; and &quot;as available.&quot; We disclaim implied warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation. We do not warrant the accuracy, identity consistency, suitability, safety, availability, or real-world achievability of AI recommendations or outputs. Nothing excludes rights that cannot legally be excluded.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>11. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, newself and its providers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, data, goodwill, or opportunities arising from the service. Our total liability for claims relating to the service will not exceed the greater of the amount you paid to newself during the 12 months before the event giving rise to the claim or US$100. These limits do not apply where liability cannot be limited by law.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>12. Changes</h2>
        <p>
          We may modify the service and these Terms. We will post updated Terms here and revise the effective date. If a material change adversely affects your rights, we will provide additional notice where required. Continuing to use the service after updated Terms take effect means you accept them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>13. General terms</h2>
        <p>
          These Terms are governed by applicable law without overriding mandatory consumer protections where you live. If a provision is unenforceable, it will be limited to the minimum extent necessary and the remainder will continue in effect. Failure to enforce a provision is not a waiver. You may not assign these Terms without our consent; we may assign them in connection with a reorganization, financing, merger, acquisition, or transfer of the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>14. Contact</h2>
        <p>Questions may be sent to <a className="font-semibold text-ink underline underline-offset-4" href="mailto:hello@newself.cc">hello@newself.cc</a>.</p>
      </section>
    </InfoPage>
  );
}
