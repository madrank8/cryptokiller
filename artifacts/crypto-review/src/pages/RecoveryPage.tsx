import { useEffect } from "react";
import { Shield } from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { usePageMeta } from "@/hooks/usePageMeta";

const sections = [
  { id: "immediate-steps", label: "Immediate Steps" },
  { id: "report-authorities", label: "Report to Authorities" },
  { id: "chargeback", label: "Chargeback & Bank Recovery" },
  { id: "recovery-scams", label: "Beware of Recovery Scams" },
  { id: "document-loss", label: "Document Your Loss" },
  { id: "legal-options", label: "Legal Options" },
  { id: "emotional-support", label: "Emotional Support" },
  { id: "prevention", label: "Prevention Going Forward" },
];

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-xl md:text-2xl font-bold text-white mt-12 mb-4 scroll-mt-24">
      {children}
    </h2>
  );
}

export default function RecoveryPage() {
  usePageMeta({
    title: "Crypto Scam Recovery Guide",
    description: "Step-by-step guide to recovering from a crypto scam. Immediate steps, reporting to authorities, chargebacks, and how to avoid recovery scams.",
    canonical: "https://cryptokiller.org/recovery",
  });

  useEffect(() => {
    if (window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="recovery" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3">Recovery Guide</h1>
          <p className="text-slate-400 text-sm">
            A comprehensive resource for crypto scam victims &middot; Last Updated: April 5, 2026
          </p>
        </div>

        <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-5 mb-10">
          <p className="text-red-300 text-sm font-semibold mb-2">Important Disclaimer</p>
          <p className="text-slate-300 text-sm leading-relaxed">
            CryptoKiller is not a law firm, financial advisor, or recovery service. This guide is provided for <strong className="text-white">informational purposes only</strong> and does not constitute legal or financial advice. Always consult qualified professionals for advice specific to your situation. Never pay upfront fees to anyone claiming they can recover your funds.
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

          <SectionHeading id="immediate-steps">1. Immediate Steps</SectionHeading>
          <p>
            If you have recently fallen victim to a crypto scam, <strong className="text-white">time is critical</strong>. The faster you act, the higher your chances of recovering some or all of your funds. Follow these steps immediately:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
            {[
              { step: "1", title: "Stop All Payments", desc: "Do not send any more money, even if the scammer claims you need to pay fees, taxes, or insurance to unlock your funds. This is a common tactic to extract more money." },
              { step: "2", title: "Contact Your Bank", desc: "Call your bank or card issuer immediately. Request a freeze on your account and ask about chargeback options. The sooner you report, the better your chances." },
              { step: "3", title: "Secure Your Accounts", desc: "Change passwords for your email, banking, and any crypto exchange accounts. Enable two-factor authentication (2FA) on everything. The scammer may have your credentials." },
              { step: "4", title: "Preserve All Evidence", desc: "Take screenshots of everything: the scam website, your transaction history, all messages and emails, and any social media ads that led you to the scam." },
              { step: "5", title: "Report to Authorities", desc: "File reports with your local police and the relevant national fraud agency (see Section 2 below). Get a crime reference number — you may need it for insurance or bank claims." },
              { step: "6", title: "Cut Contact with the Scammer", desc: "Block the scammer on all channels. Do not respond to further messages. They may try to re-engage you with new schemes or impersonate recovery agents." },
            ].map((item) => (
              <div key={item.step} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold">{item.step}</span>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{item.title}</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <SectionHeading id="report-authorities">2. Report to Authorities</SectionHeading>
          <p>
            Filing official reports is critical — even if you believe recovery is unlikely. Reports help law enforcement build cases against scam networks and may lead to asset seizures that result in victim restitution. Below are the key agencies organized by region.
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">United States</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">FBI Internet Crime Complaint Center (IC3)</strong> — <a href="https://www.ic3.gov" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">ic3.gov</a> — The primary federal agency for internet fraud. File a complaint online; include all transaction details, wallet addresses, and communication records.</li>
            <li><strong className="text-slate-200">Federal Trade Commission (FTC)</strong> — <a href="https://reportfraud.ftc.gov" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">reportfraud.ftc.gov</a> — Report fraud and unfair business practices. FTC data feeds into law enforcement investigations nationwide.</li>
            <li><strong className="text-slate-200">Securities and Exchange Commission (SEC)</strong> — <a href="https://www.sec.gov/tcr" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">sec.gov/tcr</a> — If the scam involved unregistered securities or investment fraud. SEC whistleblower awards can range from 10-30% of sanctions over $1M.</li>
            <li><strong className="text-slate-200">Commodity Futures Trading Commission (CFTC)</strong> — <a href="https://www.cftc.gov/complaint" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">cftc.gov/complaint</a> — For fraud involving crypto derivatives, futures, or commodity-related schemes.</li>
            <li><strong className="text-slate-200">State Attorney General</strong> — Search &ldquo;[your state] attorney general consumer complaint&rdquo; for your state&rsquo;s reporting portal.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">United Kingdom</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Action Fraud</strong> — <a href="https://www.actionfraud.police.uk" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">actionfraud.police.uk</a> — The UK&rsquo;s national reporting centre for fraud and cybercrime. Call 0300 123 2040 or report online.</li>
            <li><strong className="text-slate-200">Financial Conduct Authority (FCA)</strong> — <a href="https://www.fca.org.uk/consumers/report-scam" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">fca.org.uk</a> — Check the FCA Warning List and report unauthorized firms. The FCA can take enforcement action against unlicensed operators.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">European Union</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Europol</strong> — <a href="https://www.europol.europa.eu/report-a-crime" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">europol.europa.eu</a> — For cross-border fraud within the EU. Europol coordinates with national police forces.</li>
            <li><strong className="text-slate-200">BaFin (Germany)</strong> — <a href="https://www.bafin.de/EN/Verbraucher/BeschswerdenAnsprechpartner/beschwerdenansprechpartner_node_en.html" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">bafin.de</a> — Germany&rsquo;s financial regulatory authority.</li>
            <li><strong className="text-slate-200">AMF (France)</strong> — <a href="https://www.amf-france.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">amf-france.org</a> — France&rsquo;s financial markets authority. Maintains a blacklist of unauthorized investment sites.</li>
            <li><strong className="text-slate-200">CySEC (Cyprus)</strong> — <a href="https://www.cysec.gov.cy" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">cysec.gov.cy</a> — Many scam platforms falsely claim Cyprus registration.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Australia &amp; Asia-Pacific</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">ASIC (Australia)</strong> — <a href="https://www.moneysmart.gov.au/scams" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">moneysmart.gov.au</a> — Report investment scams and check the ASIC investor alert list.</li>
            <li><strong className="text-slate-200">ScamWatch (Australia)</strong> — <a href="https://www.scamwatch.gov.au" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">scamwatch.gov.au</a> — Run by the ACCC, covers all types of scams targeting Australians.</li>
            <li><strong className="text-slate-200">Singapore Police Force</strong> — <a href="https://www.police.gov.sg/e-services/report" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">police.gov.sg</a> — File an e-report for scams and cybercrime.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Canada</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Canadian Anti-Fraud Centre (CAFC)</strong> — <a href="https://www.antifraudcentre-centreantifraude.ca" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">antifraudcentre.ca</a> — Report online at the CAFC or call 1-888-495-8501.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Crypto-Specific Reporting</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Report the scam platform directly to CryptoKiller</strong> — <a href="/report" className="text-red-400 hover:text-red-300 underline underline-offset-2">/report</a> — Your report feeds into our investigation database and helps warn other potential victims.</li>
            <li><strong className="text-slate-200">Report scam ads to the platform</strong> — If you were targeted via Facebook, Instagram, Google, YouTube, or TikTok ads, report the ad directly through the platform&rsquo;s ad reporting feature.</li>
            <li><strong className="text-slate-200">Report to the crypto exchange</strong> — If you sent funds through a legitimate exchange (Coinbase, Binance, Kraken, etc.), report the scam to their fraud/compliance team. They may be able to flag the receiving wallet.</li>
          </ul>

          <SectionHeading id="chargeback">3. Chargeback &amp; Bank Recovery</SectionHeading>
          <p>
            Your ability to recover funds depends heavily on <strong className="text-white">how you paid</strong>. Here&rsquo;s a realistic breakdown of recovery options by payment method:
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Credit Card Payments</h3>
          <div className="bg-green-950/20 border border-green-800/30 rounded-lg p-4 my-3">
            <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Highest Recovery Chance</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Credit cards offer the strongest consumer protection. You typically have <strong className="text-white">60-120 days</strong> from the transaction date to file a chargeback dispute. Contact your card issuer immediately and request a chargeback under reason code &ldquo;services not rendered&rdquo; or &ldquo;fraud.&rdquo; Provide all evidence of the scam. Success rates for fraud-related chargebacks are relatively high (60-80%) when filed promptly with supporting documentation.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Debit Card Payments</h3>
          <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-4 my-3">
            <p className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Moderate Recovery Chance</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Debit card protections are weaker than credit cards. In many jurisdictions, you must report unauthorized transactions within <strong className="text-white">48 hours</strong> to limit liability. Contact your bank immediately. Some banks extend chargeback rights to debit transactions processed through Visa/Mastercard networks, but the window is shorter and success rates are lower (30-50%).
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Bank Wire / SEPA Transfer</h3>
          <div className="bg-orange-950/20 border border-orange-800/30 rounded-lg p-4 my-3">
            <p className="text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">Low Recovery Chance</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Bank wires are difficult to reverse once processed. Contact your bank immediately — if the transfer has not yet cleared the receiving bank, there is a small window for recall. In the UK, the Contingent Reimbursement Model (CRM) code may offer protection for authorized push payment (APP) fraud. In the EU, the revised Payment Services Directive may provide some recourse. File a police report, as this is typically required for the bank to investigate.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Cryptocurrency Payments</h3>
          <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-4 my-3">
            <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-2">Very Low Recovery Chance</p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Cryptocurrency transactions are <strong className="text-white">irreversible by design</strong>. There is no chargeback mechanism for on-chain transfers. However, you should still report to law enforcement — blockchain analysis firms working with authorities have occasionally traced and frozen stolen crypto at exchanges. If you sent crypto through a centralized exchange, report to that exchange&rsquo;s compliance team, as they may be able to flag the destination wallet. Keep all transaction hashes and wallet addresses as evidence.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Tips for Filing a Chargeback</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>File as soon as possible — delays reduce your chances significantly</li>
            <li>Use the words &ldquo;unauthorized transaction&rdquo; or &ldquo;fraud&rdquo; when speaking with your bank</li>
            <li>Provide a written statement describing the scam with a clear timeline</li>
            <li>Include screenshots of the scam website, communications, and any fake trading dashboards</li>
            <li>Attach your police report or crime reference number</li>
            <li>If the first agent declines your claim, escalate to a supervisor or file a written complaint</li>
            <li>In the US, reference the Fair Credit Billing Act (FCBA) for credit card disputes</li>
            <li>In the UK, reference Section 75 of the Consumer Credit Act for credit card payments over &pound;100</li>
          </ul>

          <SectionHeading id="recovery-scams">4. Beware of Recovery Scams</SectionHeading>
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-5 my-4">
            <p className="text-red-300 font-bold mb-3">⚠️ CRITICAL WARNING</p>
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              After being scammed, you are at <strong className="text-white">extremely high risk</strong> of being targeted by secondary &ldquo;recovery scams.&rdquo; Fraudsters purchase or steal victim lists and contact people who have already lost money, promising to recover their funds — for a fee. <strong className="text-white">This is always a scam.</strong>
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              No legitimate recovery service will contact you unsolicited. No legitimate service guarantees fund recovery. No legitimate service requires upfront payment before recovering your money.
            </p>
          </div>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Recovery Scams Work</h3>
          <p>
            Recovery scammers use several tactics to exploit victims who are desperate to get their money back:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-400 my-3">
            <li><strong className="text-slate-200">Cold calls or emails</strong> — They contact you claiming to be from a &ldquo;recovery agency,&rdquo; a law firm, or even a government body. They may reference your specific scam by name to appear credible.</li>
            <li><strong className="text-slate-200">Social media outreach</strong> — They respond to victims who post about their experience on forums, Reddit, Twitter, or scam reporting sites.</li>
            <li><strong className="text-slate-200">Fake law firms</strong> — They create professional-looking websites for non-existent law firms specializing in &ldquo;crypto recovery.&rdquo;</li>
            <li><strong className="text-slate-200">Advance-fee fraud</strong> — They request upfront &ldquo;processing fees,&rdquo; &ldquo;tax payments,&rdquo; or &ldquo;compliance deposits&rdquo; before they can &ldquo;release&rdquo; your recovered funds. These fees are stolen.</li>
            <li><strong className="text-slate-200">Impersonating authorities</strong> — They pose as FBI agents, Interpol officers, or financial regulators and claim they have seized the scammer&rsquo;s assets but need your cooperation (and a fee) to return them.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Red Flags of a Recovery Scam</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>They contact you first (legitimate services do not cold-call scam victims)</li>
            <li>They guarantee recovery of your funds</li>
            <li>They require upfront payment via crypto, wire transfer, or gift cards</li>
            <li>They pressure you to act quickly or maintain secrecy</li>
            <li>They cannot provide verifiable professional credentials or regulatory registrations</li>
            <li>They claim to be affiliated with law enforcement but use a Gmail/Yahoo email address</li>
            <li>Their website was registered recently (check via WHOIS lookup)</li>
          </ul>

          <SectionHeading id="document-loss">5. Document Your Loss</SectionHeading>
          <p>
            Thorough documentation is essential for police reports, bank disputes, insurance claims, and potential legal action. Create a dedicated folder (digital or physical) and gather the following:
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Evidence Checklist</h3>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 my-3">
            <ul className="space-y-2.5">
              {[
                "Screenshots of the scam website (homepage, registration page, fake trading dashboard)",
                "All email correspondence with the scammer or their 'account managers'",
                "Chat/messaging records (WhatsApp, Telegram, phone call logs)",
                "Transaction records from your bank showing deposits to the scam platform",
                "Cryptocurrency transaction hashes (TXIDs) and wallet addresses",
                "Social media ads or posts that led you to the scam (screenshots with URLs)",
                "Any documents the scammer sent you (fake contracts, ID verification requests, tax forms)",
                "The scammer's phone numbers, email addresses, and messaging usernames",
                "Domain/website registration details (WHOIS records for the scam site)",
                "Your police report and crime reference number",
                "A written timeline of events: when you first encountered the scam, each deposit you made, when you realized it was fraud",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="shrink-0 w-5 h-5 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 text-xs mt-0.5">✓</span>
                  <span className="text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>
            <strong className="text-white">Tip:</strong> Use the Wayback Machine (<a href="https://web.archive.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">web.archive.org</a>) to capture snapshots of the scam website before it disappears. Scam sites are frequently taken down and relaunched under new names.
          </p>

          <SectionHeading id="legal-options">6. Legal Options</SectionHeading>
          <p>
            Legal recovery from crypto scams is challenging but not impossible, especially for larger losses. Here&rsquo;s what to consider:
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">When to Consult a Lawyer</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Your losses exceed $10,000 USD (or equivalent) — at this level, legal costs may be justified</li>
            <li>You can identify the scammer or the company behind the scam (real names, registered entities)</li>
            <li>The scam operated through a regulated entity or used a real company&rsquo;s infrastructure</li>
            <li>You were targeted as part of a large-scale operation affecting many victims (potential class action)</li>
            <li>Your bank or card issuer denied your chargeback or fraud claim</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Types of Legal Action</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Civil litigation</strong> — If the scammer&rsquo;s identity is known, a civil lawsuit for fraud and unjust enrichment may be possible. Courts can issue asset freezing orders (Mareva injunctions) to prevent the scammer from moving funds.</li>
            <li><strong className="text-slate-200">Class action / group litigation</strong> — If many victims were targeted by the same scam, a class action may be viable. These spread legal costs across multiple plaintiffs. Search online forums for other victims of the same platform.</li>
            <li><strong className="text-slate-200">Regulatory complaint</strong> — Filing with financial regulators (FCA, SEC, ASIC) can trigger formal investigations that lead to enforcement actions and, occasionally, victim restitution funds.</li>
            <li><strong className="text-slate-200">Blockchain tracing</strong> — Specialized blockchain forensics firms (Chainalysis, CipherTrace, Elliptic) can trace crypto funds across wallets. This evidence can support legal proceedings and law enforcement investigations. Some firms offer services on a contingency basis for large cases.</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Cross-Border Challenges</h3>
          <p>
            Most crypto scams operate across multiple jurisdictions, which complicates legal action. The scam website may be hosted in one country, the operators based in another, and the money routed through a third. International cooperation between law enforcement agencies is improving but remains slow. Focus your efforts on reporting to authorities in <strong className="text-white">your own country</strong> — they have the strongest obligation to protect you and can coordinate internationally through organizations like Interpol.
          </p>

          <SectionHeading id="emotional-support">7. Emotional Support</SectionHeading>
          <p>
            Being scammed is not just a financial loss — it can cause significant emotional distress including shame, anxiety, depression, and a loss of trust. <strong className="text-white">You are not alone, and this is not your fault.</strong> Professional scam operations are designed to deceive; they employ sophisticated psychological manipulation techniques that can fool anyone.
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Mental Health Resources</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Crisis Text Line</strong> — Text HOME to 741741 (US), 85258 (UK), or 686868 (Canada) for free 24/7 support</li>
            <li><strong className="text-slate-200">SAMHSA National Helpline (US)</strong> — 1-800-662-4357 — Free, confidential, 24/7 mental health referral service</li>
            <li><strong className="text-slate-200">Samaritans (UK)</strong> — Call 116 123 (free, 24/7) — Emotional support for anyone in distress</li>
            <li><strong className="text-slate-200">Lifeline (Australia)</strong> — Call 13 11 14 — 24/7 crisis support and suicide prevention</li>
            <li><strong className="text-slate-200">Beyond Blue (Australia)</strong> — Call 1300 22 4636 — Support for anxiety, depression, and related conditions</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Victim Support Organizations</h3>
          <ul className="list-disc pl-6 space-y-2 text-slate-400">
            <li><strong className="text-slate-200">Victim Support (UK)</strong> — <a href="https://www.victimsupport.org.uk" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">victimsupport.org.uk</a> — Free, confidential support for victims of crime including fraud</li>
            <li><strong className="text-slate-200">AARP Fraud Watch Network (US)</strong> — <a href="https://www.aarp.org/money/scams-fraud/helpline/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">aarp.org</a> — Helpline: 877-908-3360 — Free support for scam victims of all ages</li>
            <li><strong className="text-slate-200">IDCare (Australia &amp; NZ)</strong> — <a href="https://www.idcare.org" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 underline underline-offset-2">idcare.org</a> — National identity and cyber support service</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Community Support</h3>
          <p>
            Connecting with other victims can help reduce feelings of isolation and shame. Consider joining:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Reddit communities such as r/Scams and r/CryptoScams where victims share experiences</li>
            <li>Local fraud victim support groups (search &ldquo;fraud victim support group&rdquo; + your city)</li>
            <li>Online forums hosted by consumer protection organizations in your country</li>
          </ul>
          <p className="mt-3">
            <strong className="text-white">Remember:</strong> Scam operators are sophisticated criminals running professional operations. They use psychological manipulation, fake social proof, and high-pressure tactics specifically designed to override rational decision-making. Falling for a scam does not reflect on your intelligence or character.
          </p>

          <SectionHeading id="prevention">8. Prevention Going Forward</SectionHeading>
          <p>
            While nothing can guarantee protection from all scams, following these practices will significantly reduce your risk:
          </p>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Before Investing in Any Crypto Platform</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li><strong className="text-slate-200">Check CryptoKiller first</strong> — Search our investigation database at <a href="/" className="text-red-400 hover:text-red-300 underline underline-offset-2">cryptokiller.org</a> to see if the platform has been flagged</li>
            <li><strong className="text-slate-200">Verify regulatory registration</strong> — Check if the platform is registered with your country&rsquo;s financial regulator (FCA, SEC, ASIC, etc.). A legitimate platform will prominently display its registration number</li>
            <li><strong className="text-slate-200">Search for reviews independently</strong> — Look for reviews on multiple independent sites, not just testimonials on the platform&rsquo;s own website (which are almost always fabricated)</li>
            <li><strong className="text-slate-200">Research the team</strong> — Verify that the people behind the platform are real, with verifiable LinkedIn profiles and professional histories. Stock photos and AI-generated faces are common red flags</li>
            <li><strong className="text-slate-200">Check the domain age</strong> — Use a WHOIS lookup tool. Scam platforms typically have domains registered within the last 6-12 months</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">Warning Signs of a Crypto Scam</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Guaranteed returns or promises of specific profit percentages (&ldquo;earn 10% daily&rdquo;)</li>
            <li>Celebrity endorsements in social media ads (almost always fake)</li>
            <li>Pressure to invest quickly (&ldquo;limited spots available,&rdquo; &ldquo;offer expires today&rdquo;)</li>
            <li>A personal &ldquo;account manager&rdquo; contacts you after registration</li>
            <li>You cannot withdraw your funds, or are told to pay fees/taxes before withdrawal</li>
            <li>The platform is not listed on any recognized crypto exchange aggregator (CoinGecko, CoinMarketCap)</li>
            <li>Communication shifts from the platform to WhatsApp, Telegram, or personal phone calls</li>
            <li>You were referred by someone you met on a dating app or social media (common in &ldquo;pig butchering&rdquo; scams)</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mt-6 mb-3">General Security Practices</h3>
          <ul className="list-disc pl-6 space-y-1.5 text-slate-400">
            <li>Use unique, strong passwords for every financial account (use a password manager)</li>
            <li>Enable two-factor authentication (2FA) on all exchange and banking accounts — preferably hardware keys or authenticator apps, not SMS</li>
            <li>Never share your seed phrase or private keys with anyone, for any reason</li>
            <li>Be deeply skeptical of unsolicited investment opportunities, especially those arriving via DM or ad</li>
            <li>Only use well-known, regulated exchanges (Coinbase, Kraken, Binance) and store large holdings in a hardware wallet</li>
          </ul>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 mt-12 mb-6">
          <p className="text-white font-semibold text-sm mb-2">Need to report a scam to CryptoKiller?</p>
          <p className="text-slate-400 text-sm mb-4">Your report helps us investigate scam platforms and warn others. All submissions are anonymous.</p>
          <a href="/report" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-2.5 rounded-lg text-sm">
            Submit a Scam Report
          </a>
        </div>
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-slate-600" />
              <span className="text-lg font-bold text-slate-400">
                Crypto<span className="text-slate-600">Killer</span>
              </span>
              <span className="text-slate-600 text-sm">Scam Intelligence</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-500">
              <a href="/recovery" className="hover:text-white transition-colors text-white">Recovery Guide</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="/report" className="hover:text-white transition-colors">Report a Scam</a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-600 text-center leading-relaxed max-w-4xl mx-auto">
              &copy; {new Date().getFullYear()} CryptoKiller. All rights reserved. This guide is for informational purposes only and does not constitute legal or financial advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
