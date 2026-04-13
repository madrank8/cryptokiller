import { useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const sections = [
  { id: "acceptance", label: "Acceptance of Terms" },
  { id: "description", label: "Description of Service" },
  { id: "eligibility", label: "Eligibility" },
  { id: "user-conduct", label: "User Conduct" },
  { id: "scam-reports", label: "Scam Report Submissions" },
  { id: "intellectual-property", label: "Intellectual Property" },
  { id: "disclaimer", label: "Disclaimer of Warranties" },
  { id: "limitation", label: "Limitation of Liability" },
  { id: "indemnification", label: "Indemnification" },
  { id: "third-party", label: "Third-Party Links" },
  { id: "modifications", label: "Modifications to Service" },
  { id: "termination", label: "Termination" },
  { id: "governing-law", label: "Governing Law" },
  { id: "severability", label: "Severability" },
  { id: "contact", label: "Contact Information" },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl md:text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  usePageMeta({
    title: "Terms of Service",
    description: "CryptoKiller terms of service. Rules governing use of our crypto scam investigation platform, report submissions, and published content.",
    canonical: "https://cryptokiller.org/terms",
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
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Terms of Service</h1>
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

        <div className="prose-sm text-slate-300 leading-relaxed space-y-4">
          <SectionHeading id="acceptance">1. Acceptance of Terms</SectionHeading>
          <p>
            By accessing or using CryptoKiller (the &ldquo;Service&rdquo;), operated by <strong className="text-white">DEX Algo Technologies Pte Ltd.</strong> (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, you must not use the Service.
          </p>
          <p>
            These Terms constitute a legally binding agreement between you and DEX Algo Technologies Pte Ltd. regarding your use of the Service. By continuing to access or use the Service after any modifications to these Terms, you agree to be bound by the revised Terms.
          </p>

          <SectionHeading id="description">2. Description of Service</SectionHeading>
          <p>
            CryptoKiller is a cryptocurrency scam investigation and review platform. The Service provides:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Investigation reports and reviews of suspected cryptocurrency scam platforms</li>
            <li>Threat scores and risk assessments based on automated analysis of advertising data, regulatory records, and user reports</li>
            <li>A public &ldquo;Report a Scam&rdquo; form for users to submit information about suspected fraudulent platforms</li>
            <li>Educational content about cryptocurrency fraud patterns and prevention</li>
          </ul>
          <p>
            The Service is provided for <strong className="text-white">informational and educational purposes only</strong>. CryptoKiller does not provide financial, legal, or investment advice. We are not a financial advisor, regulatory authority, law enforcement agency, or legal firm.
          </p>

          <SectionHeading id="eligibility">3. Eligibility</SectionHeading>
          <p>
            You must be at least 16 years of age to use the Service. By using the Service, you represent and warrant that you meet this age requirement. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms.
          </p>

          <SectionHeading id="user-conduct">4. User Conduct</SectionHeading>
          <p>When using the Service, you agree not to:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Submit false, misleading, or defamatory information through any form or report</li>
            <li>Use the Service to harass, threaten, or defame any individual or entity</li>
            <li>Attempt to gain unauthorized access to any portion of the Service, its servers, or any connected systems</li>
            <li>Use automated scripts, bots, or scraping tools to extract data from the Service without prior written consent</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable local, national, or international law</li>
            <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with any person or entity</li>
            <li>Reproduce, redistribute, or commercially exploit investigation reports or content without authorization</li>
          </ul>
          <p>
            We reserve the right to suspend or terminate access to the Service for any user who violates these provisions, without prior notice.
          </p>

          <SectionHeading id="scam-reports">5. Scam Report Submissions</SectionHeading>
          <p>
            By submitting a scam report through our &ldquo;Report a Scam&rdquo; form, you acknowledge and agree to the following:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li><strong className="text-slate-200">Accuracy:</strong> You confirm that the information you provide is truthful and accurate to the best of your knowledge. Knowingly submitting false reports may result in legal liability.</li>
            <li><strong className="text-slate-200">License Grant:</strong> You grant CryptoKiller a non-exclusive, royalty-free, worldwide, perpetual license to use, reproduce, modify, and incorporate the information from your report into our investigation database and published reviews.</li>
            <li><strong className="text-slate-200">Anonymization:</strong> We may use aggregated or anonymized data from your report in published investigations. Your personal identity (name, email) will never be published or shared publicly without your explicit consent.</li>
            <li><strong className="text-slate-200">No Guarantee of Action:</strong> Submission of a report does not guarantee that CryptoKiller will investigate the reported platform, publish a review, or take any specific action.</li>
            <li><strong className="text-slate-200">Not a Substitute for Legal Action:</strong> Submitting a report to CryptoKiller does not constitute filing a complaint with law enforcement or a regulatory authority. If you believe you have been a victim of fraud, we strongly encourage you to contact the appropriate authorities in your jurisdiction.</li>
          </ul>

          <SectionHeading id="intellectual-property">6. Intellectual Property</SectionHeading>
          <p>
            All content on the Service — including but not limited to investigation reports, threat scores, text, graphics, logos, data compilations, analysis, and software — is the property of DEX Algo Technologies Pte Ltd. or its licensors and is protected by international copyright, trademark, and other intellectual property laws.
          </p>
          <p>You may:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>View and read content for personal, non-commercial use</li>
            <li>Share links to published investigation reports</li>
            <li>Quote brief excerpts with proper attribution to &ldquo;CryptoKiller&rdquo; and a link to the original content</li>
          </ul>
          <p>You may not:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Reproduce, distribute, or republish full investigation reports without written permission</li>
            <li>Remove or alter any copyright, trademark, or proprietary notices</li>
            <li>Use our content in any way that implies endorsement by CryptoKiller without prior authorization</li>
            <li>Create derivative works based on our proprietary analysis or threat scoring methodology</li>
          </ul>

          <SectionHeading id="disclaimer">7. Disclaimer of Warranties</SectionHeading>
          <div className="bg-red-950/30 border border-red-800/40 rounded-lg p-4 my-4">
            <p className="text-red-300 text-sm font-semibold mb-3">IMPORTANT — PLEASE READ CAREFULLY</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </div>
          <p>Without limiting the foregoing, CryptoKiller does not warrant that:</p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>The information in our investigation reports is complete, accurate, or up-to-date at all times</li>
            <li>Threat scores are definitive determinations of fraud — they are algorithmic assessments based on available data indicators and are not legal conclusions</li>
            <li>The Service will be uninterrupted, error-free, or free of harmful components</li>
            <li>Platforms not reviewed or not flagged by CryptoKiller are safe or legitimate</li>
          </ul>
          <p>
            Our investigation reports reflect analysis conducted at a specific point in time. Scam operations may change names, domains, or operational patterns after publication. Always conduct your own due diligence before making any financial decision.
          </p>
          <p>
            The content on this website is for general informational and educational purposes only and should not be construed as professional advice. We make no warranties or guarantees regarding the accuracy, completeness, or currency of the information provided. For guidance specific to your situation, please consult a qualified professional in the relevant field.
          </p>

          <SectionHeading id="limitation">8. Limitation of Liability</SectionHeading>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DEX ALGO TECHNOLOGIES PTE LTD., ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Loss of profits, data, or revenue</li>
            <li>Financial losses arising from reliance on information provided by the Service</li>
            <li>Investment decisions made based on our investigation reports or threat scores</li>
            <li>Damages arising from unauthorized access to or alteration of your submissions</li>
            <li>Any third-party conduct or content on or accessible through the Service</li>
          </ul>
          <p>
            In no event shall our total aggregate liability exceed the greater of one hundred Singapore Dollars (SGD 100) or the amount you paid to us, if any, in the twelve (12) months preceding the claim.
          </p>

          <SectionHeading id="indemnification">9. Indemnification</SectionHeading>
          <p>
            You agree to indemnify, defend, and hold harmless DEX Algo Technologies Pte Ltd. and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, costs, and expenses (including reasonable attorney&rsquo;s fees) arising from or related to:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Your use of the Service</li>
            <li>Your violation of these Terms</li>
            <li>Your violation of any rights of a third party</li>
            <li>Any content or information you submit to the Service, including scam reports containing false or defamatory statements</li>
          </ul>

          <SectionHeading id="third-party">10. Third-Party Links</SectionHeading>
          <p>
            The Service may contain links to third-party websites, including law enforcement agencies (e.g., FBI IC3, Action Fraud), regulatory bodies (e.g., FCA, SEC, ASIC), and external resources. These links are provided for your convenience and reference only.
          </p>
          <p>
            CryptoKiller does not endorse, control, or assume responsibility for the content, privacy policies, or practices of any third-party websites. You access third-party sites at your own risk and subject to their respective terms and policies.
          </p>

          <SectionHeading id="modifications">11. Modifications to Service</SectionHeading>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
          </p>
          <p>
            We may update these Terms from time to time. Material changes will be indicated by updating the &ldquo;Last Updated&rdquo; date at the top of this page. Your continued use of the Service after any changes constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.
          </p>

          <SectionHeading id="termination">12. Termination</SectionHeading>
          <p>
            We may terminate or suspend your access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will cease immediately.
          </p>
          <p>
            Provisions of these Terms that by their nature should survive termination shall survive, including but not limited to ownership provisions, warranty disclaimers, indemnification, and limitations of liability.
          </p>

          <SectionHeading id="governing-law">13. Governing Law &amp; Dispute Resolution</SectionHeading>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the Republic of Singapore, without regard to its conflict of law provisions.
          </p>
          <p>
            Any dispute arising out of or in connection with these Terms, including any question regarding their existence, validity, or termination, shall be referred to and finally resolved by arbitration administered by the Singapore International Arbitration Centre (&ldquo;SIAC&rdquo;) in accordance with the SIAC Rules. The seat of arbitration shall be Singapore. The language of the arbitration shall be English.
          </p>
          <p>
            Notwithstanding the foregoing, we reserve the right to seek injunctive or equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement or misappropriation of our intellectual property rights.
          </p>

          <SectionHeading id="severability">14. Severability</SectionHeading>
          <p>
            If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such invalidity shall not affect the remaining provisions, which shall continue in full force and effect. The invalid or unenforceable provision shall be modified to the minimum extent necessary to make it valid and enforceable while preserving its original intent.
          </p>

          <SectionHeading id="contact">15. Contact Information</SectionHeading>
          <p>If you have questions about these Terms of Service, please contact us:</p>
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mt-3">
            <p className="text-white font-semibold text-sm mb-2">DEX Algo Technologies Pte Ltd.</p>
            <p className="text-slate-400 text-sm">150 Beach Rd., Level 35 Gateway West</p>
            <p className="text-slate-400 text-sm">Singapore 189720</p>
            <p className="text-slate-400 text-sm mt-2">
              Email: <a href="mailto:legal@cryptokiller.org" className="text-red-400 hover:text-red-300 underline underline-offset-2">legal@cryptokiller.org</a>
            </p>
          </div>
        </div>

      </main>

      <SiteFooter />
    </div>
  );
}
