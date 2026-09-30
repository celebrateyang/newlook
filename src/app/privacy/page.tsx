import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How newself collects, uses, stores, and protects account data, photos, and AI hairstyle results.",
};

const headingClass = "font-display text-2xl font-bold tracking-tight text-ink";
const listClass = "list-disc space-y-2 pl-6 marker:text-coral";

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="PRIVACY POLICY" title="Your photos deserve careful handling.">
      <p className="text-sm font-semibold text-ink/45">Effective date: September 30, 2026</p>
      <p>
        This Privacy Policy explains how newself (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) collects, uses, shares, and protects information when you use <Link className="font-semibold text-ink underline underline-offset-4" href="/">newself.cc</Link> and its AI hairstyle advisory features.
      </p>

      <section className="space-y-3">
        <h2 className={headingClass}>1. Information we collect</h2>
        <ul className={listClass}>
          <li><strong className="text-ink">Account information.</strong> Your user ID, name, email address, profile image, and sign-in method.</li>
          <li><strong className="text-ink">Google sign-in information.</strong> If you choose Google Sign-In, we receive only the basic account information you authorize, such as your name, email address, profile image, and Google account identifier. We do not request Gmail, Google Drive, contacts, calendars, or other Google content.</li>
          <li><strong className="text-ink">Photos and hairstyle content.</strong> Selfies, reference images, hairstyle selections, preferences, prompts, generated images, and salon-guide content you submit or create.</li>
          <li><strong className="text-ink">Analysis and result data.</strong> Visible face and hair characteristics, recommendations, generation status, selected results, and technical AI-request information. We do not currently use face recognition or face embeddings to identify you.</li>
          <li><strong className="text-ink">Technical data.</strong> IP address, browser and device information, timestamps, request logs, errors, and essential cookies processed by us or our hosting and security providers.</li>
          <li><strong className="text-ink">Communications.</strong> Information you send when requesting support, deletion, or providing feedback.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>2. How we use information</h2>
        <p>We use information to:</p>
        <ul className={listClass}>
          <li>create and secure your account and maintain your session;</li>
          <li>analyze visible face and hair characteristics and recommend hairstyles;</li>
          <li>generate previews, comparisons, and salon-ready guidance;</li>
          <li>store and restore uploads and results associated with your account;</li>
          <li>operate, troubleshoot, secure, and improve newself;</li>
          <li>prevent fraud, abuse, unauthorized access, and Terms violations; and</li>
          <li>comply with law and valid legal requests.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>3. Google user data</h2>
        <p>
          Google account data is used only to authenticate you, create or connect your newself account, display basic account information, and provide account support. We do not sell Google user data, use it for advertising, use it to train AI models, or send your Google profile information to OpenAI. Your separately uploaded photos are processed as described below.
        </p>
        <p>Our use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including its Limited Use requirements.</p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>4. AI processing</h2>
        <p>
          To provide analysis and hairstyle generation, we send the photos and instructions needed for your request to OpenAI through its API. AI processing may infer visible characteristics such as face shape, hair length, density, texture, and styling attributes. These inferences provide hairstyle advice and are not used to establish your identity.
        </p>
        <p>
          Under OpenAI&apos;s current API data controls, API data is not used to train OpenAI models by default unless the account holder explicitly opts in. OpenAI may retain abuse-monitoring data for a limited period under its policies and legal obligations.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>5. Service providers and disclosures</h2>
        <p>We use the following providers to operate newself:</p>
        <ul className={listClass}>
          <li><strong className="text-ink">Clerk</strong> for authentication and account sessions;</li>
          <li><strong className="text-ink">Google</strong> when you choose Google Sign-In;</li>
          <li><strong className="text-ink">Convex</strong> for application data and generation records;</li>
          <li><strong className="text-ink">Cloudflare R2</strong> for private image storage;</li>
          <li><strong className="text-ink">OpenAI</strong> for AI analysis and hairstyle generation; and</li>
          <li><strong className="text-ink">Vercel</strong> for hosting and operational logs.</li>
        </ul>
        <p>
          They process information to provide their services to us. We may also disclose information when required by law, to protect users or the service, or in connection with a merger, financing, acquisition, or asset transfer with appropriate safeguards. We do not sell personal information or share it for cross-context behavioral advertising.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>6. Storage and security</h2>
        <p>
          Photos are stored in a private Cloudflare R2 bucket and accessed through short-lived signed URLs. Link expiration limits access to a link but does not itself delete the file. We use authentication, ownership checks, transport encryption, access controls, and restricted server credentials. No storage or transmission method is completely secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>7. Retention and deletion</h2>
        <ul className={listClass}>
          <li>Original selfies and reference photos are normally deleted within 7 days unless you actively save a related result or continued storage is needed to provide a feature you requested.</li>
          <li>Generated results you save remain available while your account is active or until you delete them or request deletion.</li>
          <li>Failed or abandoned temporary generation files are deleted as soon as reasonably practicable.</li>
          <li>When you delete your account or submit a verified deletion request, we delete or de-identify associated account records, photos, and generated results from active systems within 30 days.</li>
        </ul>
        <p>
          Limited records may remain longer in backups or where required for security, fraud prevention, dispute resolution, or legal compliance. Backup copies are isolated from ordinary use and removed according to applicable backup cycles.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>8. Your choices and rights</h2>
        <p>
          Depending on where you live, you may have rights to access, correct, delete, restrict, object to, or receive a copy of your personal information, and to withdraw consent where processing relies on consent. You may update certain account information through the account interface.
        </p>
        <p>
          To request complete account and service-data deletion, email <a className="font-semibold text-ink underline underline-offset-4" href="mailto:hello@newself.cc">hello@newself.cc</a> from the address associated with your account. We may verify your identity before completing a request.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>9. Cookies</h2>
        <p>
          We and Clerk use essential cookies and similar technologies to authenticate users, maintain sessions, prevent abuse, and operate the service. newself does not currently use third-party advertising cookies or sell data for targeted advertising.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>10. International processing</h2>
        <p>Our providers may process information outside your country. Where required, we rely on applicable contractual or legal safeguards for international transfers.</p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>11. Children</h2>
        <p>
          newself is not directed to children under 16, and we do not knowingly collect their information. Do not upload a child&apos;s photo or another person&apos;s photo unless you have the legal authority and consent required to do so.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className={headingClass}>12. Changes and contact</h2>
        <p>We may update this Policy and will post the new effective date here. We will provide additional notice for material changes where required.</p>
        <p>For privacy questions or requests, contact <a className="font-semibold text-ink underline underline-offset-4" href="mailto:hello@newself.cc">hello@newself.cc</a>.</p>
      </section>
    </InfoPage>
  );
}
