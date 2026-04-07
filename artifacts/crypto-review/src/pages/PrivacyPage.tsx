import { useEffect } from "react";
import { Shield } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use", label: "How We Use Your Information" },
  { id: "legal-basis", label: "Legal Basis (GDPR)" },
  { id: "sharing", label: "Information Sharing" },
  { id: "retention", label: "Data Retention" },
  { id: "your-rights", label: "Your Rights" },
  { id: "transfers", label: "International Transfers" },
  { id: "security", label: "Data Security" },
  { id: "children", label: "Children's Privacy" },
  { id: "third-party", label: "Third-Party Links" },
  { id: "changes", label: "Changes to This Policy" },
  { id: "contact", label: "Contact Information" },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl md:text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  usePageMeta({
    title: "Privacy Policy",
    description: "CryptoKiller privacy policy. Learn how we collect, use, and protect your information. GDPR and CCPA compliant. No tracking cookies or third-party analytics.",
    canonical: "https://cryptokiller.org/privacy",
  });

  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Privacy Policy</h1>
          <p className="text-slate-400 text-sm">
            Effective Date: April 1, 2026 &middot; Last Updated: April 1, 2026
          </p>
        </div>

        <nav className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-10">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Table of Contents</p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-slate-400 hover:text-red-400 transition-colors flex items-start gap-2"
                >
                  <span className="text-slate-600 shrink-0">{i + 1}.</span>
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="prose-slate space-y-0">
          <SectionHeading id="introduction">1. Introduction</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            CryptoKiller (<a href="/" className="text-red-400 hover:text-red-300 underline underline-offset-2">cryptokiller.org</a>) is a cryptocurrency scam investigation and review platform operated by <strong className="text-white">DEX Algo Technologies Pte Ltd.</strong>, a company registered in Singapore (150 Beach Rd., Level 35 Gateway West, Singapore 189720).
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            This Privacy Policy explains how we collect, use, store, and protect personal information when you visit our website or submit information through our services. It applies to all visitors and users of CryptoKiller, regardless of location.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            We are committed to transparency about our data practices. This policy is designed to comply with the General Data Protection Regulation (GDPR), the California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA), and other applicable international privacy laws.
          </p>

          <SectionHeading id="information-we-collect">2. Information We Collect</SectionHeading>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.1 Information You Provide Voluntarily</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            When you submit a scam report through our "Report a Scam" form at <code className="text-red-400 bg-slate-900 px-1.5 py-0.5 rounded text-xs">/report</code>, you may provide:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li>Email address (optional — only if you wish to be contacted)</li>
            <li>Country of residence</li>
            <li>Estimated financial loss amount</li>
            <li>Description of the scam experience</li>
            <li>Preferred contact method</li>
            <li>Evidence URLs (links to scam websites, social media ads, etc.)</li>
            <li>Name of the scam platform</li>
            <li>Type of scam encountered</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            All fields except the scam description and platform name are optional. You are never required to provide your email address or any personally identifying information to submit a report.
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.2 Information Collected Automatically</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            When you visit CryptoKiller, our servers automatically collect standard HTTP request data, including:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li>IP address</li>
            <li>Browser type and version (user agent string)</li>
            <li>Pages visited and timestamps</li>
            <li>Referring URL</li>
            <li>Operating system information</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">2.3 What We Do Not Collect</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            CryptoKiller is designed with privacy in mind. We want to be clear about what we do <strong className="text-white">not</strong> do:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">No tracking cookies</strong> — We do not use cookies for tracking, advertising, or analytics purposes. Only essential framework cookies required for site functionality may be used.</li>
            <li><strong className="text-white">No third-party analytics</strong> — We do not use Google Analytics, Facebook Pixel, or any third-party analytics or tracking services.</li>
            <li><strong className="text-white">No advertising scripts</strong> — We do not run advertising networks or retargeting scripts.</li>
            <li><strong className="text-white">No user accounts</strong> — CryptoKiller does not have a login or registration system. We do not store usernames, passwords, or account profiles.</li>
            <li><strong className="text-white">No newsletter signups or comment systems</strong> — We do not collect email addresses for marketing purposes.</li>
          </ul>

          <SectionHeading id="how-we-use">3. How We Use Your Information</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-3">
            We use the information we collect for the following purposes:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">Investigate reported scams</strong> — Report submissions are reviewed by our investigation team to identify, verify, and document cryptocurrency scam operations. This information may contribute to published reviews on CryptoKiller.</li>
            <li><strong className="text-white">Cross-reference reports</strong> — We cross-reference submitted reports with our scam intelligence database to identify patterns, connected operations, and emerging threats.</li>
            <li><strong className="text-white">Respond to reporters</strong> — If you voluntarily provide an email address, we may contact you to follow up on your report, request additional evidence, or provide recovery guidance.</li>
            <li><strong className="text-white">Improve site functionality and security</strong> — Server logs help us maintain site performance, identify technical issues, and protect against malicious activity.</li>
          </ul>

          <SectionHeading id="legal-basis">4. Legal Basis for Processing (GDPR)</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-3">
            For users in the European Economic Area (EEA) and the United Kingdom, we process personal data under the following legal bases:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">Consent (Article 6(1)(a))</strong> — When you voluntarily submit a scam report, you consent to us processing the information you provide for the purposes described in this policy.</li>
            <li><strong className="text-white">Legitimate Interest (Article 6(1)(f))</strong> — We have a legitimate interest in processing data for scam investigation, public safety, consumer protection, and the prevention of financial fraud. We believe this interest is not overridden by your data protection rights given the significant public benefit of exposing cryptocurrency scams.</li>
          </ul>

          <SectionHeading id="sharing">5. Information Sharing &amp; Disclosure</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-3">
            We take your privacy seriously and limit how we share information:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">We never sell personal data.</strong> Your information is not sold, rented, or traded to any third party for commercial purposes.</li>
            <li><strong className="text-white">Reporter identities are never published.</strong> Your name, email address, and other identifying information are never included in published reviews or investigation reports.</li>
            <li><strong className="text-white">Aggregated, anonymized data</strong> — We may include anonymized and aggregated information from reports in published investigations (e.g., "12 reports received from 8 countries" or "victims reported losses averaging $5,000").</li>
            <li><strong className="text-white">Law enforcement &amp; legal requirements</strong> — We may disclose information if required by law, regulation, legal process, or enforceable government request, or if disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
            <li><strong className="text-white">Service providers</strong> — We use essential hosting and infrastructure providers to operate CryptoKiller. These providers may process data on our behalf under strict data processing agreements.</li>
          </ul>

          <SectionHeading id="retention">6. Data Retention</SectionHeading>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">Scam reports</strong> — Reports are retained indefinitely for ongoing investigation purposes and to maintain a comprehensive scam intelligence database. This enables us to identify long-running scam operations that may resurface under different names.</li>
            <li><strong className="text-white">Server logs</strong> — Standard HTTP server logs are retained for a limited period (typically 90 days) for security and diagnostic purposes, after which they are automatically purged.</li>
            <li><strong className="text-white">Published reviews</strong> — Investigation reports published on CryptoKiller are retained indefinitely as part of our public interest mission to warn consumers.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            You may request deletion of your personal data at any time (see Section 7: Your Rights).
          </p>

          <SectionHeading id="your-rights">7. Your Rights</SectionHeading>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">7.1 Rights Under the GDPR (EEA/UK Residents)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            If you are located in the European Economic Area or the United Kingdom, you have the following rights:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">Right of Access</strong> — You can request a copy of the personal data we hold about you.</li>
            <li><strong className="text-white">Right to Rectification</strong> — You can request correction of inaccurate or incomplete data.</li>
            <li><strong className="text-white">Right to Erasure</strong> — You can request deletion of your personal data, subject to our legitimate interest in retaining information for ongoing investigations.</li>
            <li><strong className="text-white">Right to Restriction of Processing</strong> — You can request that we limit how we process your data.</li>
            <li><strong className="text-white">Right to Data Portability</strong> — You can request your data in a structured, commonly used, machine-readable format.</li>
            <li><strong className="text-white">Right to Object</strong> — You can object to processing based on legitimate interests.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">7.2 Rights Under the CCPA/CPRA (California Residents)</h3>
          <p className="text-slate-300 leading-relaxed mb-3">
            If you are a California resident, you have the following rights:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li><strong className="text-white">Right to Know</strong> — You can request information about the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong className="text-white">Right to Delete</strong> — You can request deletion of personal information we have collected.</li>
            <li><strong className="text-white">Right to Opt-Out</strong> — You have the right to opt out of the "sale" or "sharing" of personal information. Note: CryptoKiller does not sell or share personal information for advertising purposes.</li>
            <li><strong className="text-white">Right to Non-Discrimination</strong> — We will not discriminate against you for exercising any of your privacy rights.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">7.3 How to Exercise Your Rights</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            To exercise any of your privacy rights, please contact us at <a href="mailto:privacy@cryptokiller.org" className="text-red-400 hover:text-red-300 underline underline-offset-2">privacy@cryptokiller.org</a>. We will respond to your request within 30 days (or within the timeframe required by applicable law). We may ask you to verify your identity before processing your request.
          </p>

          <SectionHeading id="transfers">8. International Data Transfers</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            CryptoKiller is operated by DEX Algo Technologies Pte Ltd. in Singapore. Your data may be processed in Singapore and other countries where our infrastructure providers operate. If you are located in the EEA, UK, or other regions with data transfer restrictions, please be aware that your information may be transferred internationally.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            We ensure appropriate safeguards are in place for international data transfers, including reliance on adequacy decisions, standard contractual clauses, or other legally recognized mechanisms to protect your data during cross-border transfers.
          </p>

          <SectionHeading id="security">9. Data Security</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            We implement appropriate technical and organizational measures to protect personal data against unauthorized access, alteration, disclosure, or destruction. These measures include:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li>Encryption of data in transit (TLS/HTTPS)</li>
            <li>Access controls limiting data access to authorized personnel</li>
            <li>Secure infrastructure hosted on reputable cloud platforms</li>
            <li>Regular security reviews and monitoring</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            While we take reasonable measures to protect your information, no method of transmission or storage is 100% secure. We cannot guarantee absolute security of your data.
          </p>

          <SectionHeading id="children">10. Children's Privacy</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            CryptoKiller is not directed at individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have inadvertently collected data from a child under 16, we will take steps to delete that information promptly. If you believe a child has provided us with personal data, please contact us at <a href="mailto:privacy@cryptokiller.org" className="text-red-400 hover:text-red-300 underline underline-offset-2">privacy@cryptokiller.org</a>.
          </p>

          <SectionHeading id="third-party">11. Third-Party Links</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            CryptoKiller may contain links to external websites and services, including fraud reporting agencies and regulatory bodies such as:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-1.5 mb-4 ml-2">
            <li>FBI Internet Crime Complaint Center (IC3) — ic3.gov</li>
            <li>Federal Trade Commission (FTC) — reportfraud.ftc.gov</li>
            <li>Action Fraud (UK) — actionfraud.police.uk</li>
            <li>Financial Conduct Authority (FCA) — fca.org.uk</li>
            <li>Australian Securities and Investments Commission (ASIC) — moneysmart.gov.au</li>
            <li>Cyprus Securities and Exchange Commission (CySEC) — cysec.org.cy</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            We are not responsible for the privacy practices or content of these third-party websites. We encourage you to review their respective privacy policies before providing any personal information.
          </p>

          <SectionHeading id="changes">12. Changes to This Policy</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-4">
            We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or operational needs. When we make material changes, we will update the "Last Updated" date at the top of this page. We encourage you to review this policy periodically.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Continued use of CryptoKiller after changes are posted constitutes your acceptance of the updated policy.
          </p>

          <SectionHeading id="contact">13. Contact Information</SectionHeading>
          <p className="text-slate-300 leading-relaxed mb-3">
            If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mb-4">
            <p className="text-white font-semibold mb-2">DEX Algo Technologies Pte Ltd.</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              150 Beach Rd., Level 35 Gateway West<br />
              Singapore 189720
            </p>
            <p className="text-slate-400 text-sm mt-3">
              Email: <a href="mailto:privacy@cryptokiller.org" className="text-red-400 hover:text-red-300 underline underline-offset-2">privacy@cryptokiller.org</a>
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Website: <a href="https://cryptokiller.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">cryptokiller.org</a>
            </p>
          </div>
          <p className="text-slate-300 leading-relaxed mb-4">
            For GDPR-related inquiries, you also have the right to lodge a complaint with a supervisory authority in the EU member state of your habitual residence, place of work, or place of the alleged infringement.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
