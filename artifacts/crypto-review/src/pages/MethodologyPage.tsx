import {
  Microscope, Search, Shield, BarChart2, Globe, AlertTriangle,
  CheckCircle2, Eye, Target, Layers, FileText, Scale, Clock,
  Users, Database, ArrowRight, Mail, RefreshCw, Ban
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const threatScoreBands = [
  { range: "90–100", label: "CRITICAL", color: "bg-red-600", textColor: "text-red-400", desc: "Confirmed scam operation with overwhelming evidence — active harm to victims." },
  { range: "70–89", label: "SEVERE", color: "bg-orange-600", textColor: "text-orange-400", desc: "Strong indicators of fraud across multiple evidence categories." },
  { range: "50–69", label: "HIGH", color: "bg-amber-600", textColor: "text-amber-400", desc: "Significant red flags present — high probability of fraudulent operation." },
  { range: "30–49", label: "MODERATE", color: "bg-yellow-600", textColor: "text-yellow-400", desc: "Several concerning indicators that warrant caution." },
  { range: "0–29", label: "LOW", color: "bg-green-600", textColor: "text-green-400", desc: "Minimal red flags detected — insufficient evidence of fraud." },
];

const scoringFactors = [
  {
    icon: <BarChart2 className="h-5 w-5" />,
    title: "Ad Creative Volume",
    weight: "25%",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-900/30",
    desc: "Total number of unique ad creatives detected across Meta Ad Library, Google Ads Transparency Center, and TikTok Ad Library. High volumes of disposable creatives are a hallmark of scam operations that rapidly cycle through ads to evade platform enforcement.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Geographic Targeting Spread",
    weight: "20%",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-900/30",
    desc: "Number of countries and regions targeted by advertising campaigns. Scam operations typically blast ads across dozens of countries simultaneously, a pattern rarely seen in legitimate financial services that must comply with local regulation.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Celebrity Impersonation",
    weight: "20%",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-900/30",
    desc: "Use of celebrity likenesses, deepfakes, or fabricated endorsements. We verify whether depicted individuals have any actual affiliation with the platform. Unauthorized use of public figures is one of the strongest fraud indicators.",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Funnel & Registration Pattern",
    weight: "15%",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-900/30",
    desc: "Analysis of the user acquisition funnel: landing pages, registration flows, broker assignment, and deposit pressure. Scam platforms typically use high-pressure funnels, fake urgency timers, and require personal financial information before showing any product.",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Regulatory & Infrastructure",
    weight: "10%",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-900/30",
    desc: "Verification of claimed licenses, registrations, and regulatory status. Domain age, WHOIS privacy, hosting infrastructure, and SSL certificate patterns. Legitimate platforms can demonstrate verifiable regulatory compliance.",
  },
  {
    icon: <Database className="h-5 w-5" />,
    title: "Historical Pattern Matching",
    weight: "10%",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-900/30",
    desc: "Cross-referencing against our database of 1,000+ previously investigated platforms. Shared infrastructure, identical funnels, reused ad templates, and common broker networks indicate a platform belongs to a known scam network.",
  },
];

const dataSources = [
  {
    name: "Meta Ad Library",
    desc: "Official transparency archive for ads running across Facebook and Instagram. We query this for crypto-related advertising with financial claims.",
    url: "https://www.facebook.com/ads/library/",
  },
  {
    name: "Google Ads Transparency Center",
    desc: "Google's public ad archive. We monitor for financial services advertising and cross-reference with known scam brand patterns.",
    url: "https://adstransparency.google.com/",
  },
  {
    name: "TikTok Ad Library",
    desc: "TikTok's commercial content library. Increasingly used by scam operations to target younger demographics with crypto fraud.",
    url: "https://library.tiktok.com/",
  },
  {
    name: "WHOIS & DNS Records",
    desc: "Domain registration data reveals infrastructure age, registrant patterns, and connections between seemingly unrelated scam platforms.",
  },
  {
    name: "Blockchain Explorers",
    desc: "On-chain transaction data for verifying wallet activity, deposit flows, and withdrawal patterns when blockchain addresses are discoverable.",
  },
  {
    name: "Community Reports",
    desc: "Victim reports submitted through our reporting system and verified against ad evidence. Reports alone never determine a threat score without corroborating evidence.",
  },
];

const investigationSteps = [
  {
    step: "01",
    title: "Detection",
    icon: <Search className="h-5 w-5" />,
    desc: "Automated monitoring systems scan ad transparency archives across Meta, Google, and TikTok every 24 hours. When a new brand is detected running financial advertising that matches known scam patterns — unrealistic returns, celebrity endorsements, urgency language — it enters our investigation queue.",
    color: "text-red-400",
    borderColor: "border-red-900/40",
  },
  {
    step: "02",
    title: "Evidence Collection",
    icon: <Database className="h-5 w-5" />,
    desc: "An analyst gathers all publicly available evidence: ad creatives and their targeting data, landing pages, registration flows, terms of service, company claims, WHOIS records, and any discoverable blockchain addresses. All evidence is archived with timestamps to preserve a chain of custody.",
    color: "text-amber-400",
    borderColor: "border-amber-900/40",
  },
  {
    step: "03",
    title: "Analysis & Scoring",
    icon: <BarChart2 className="h-5 w-5" />,
    desc: "The collected evidence is evaluated against our six scoring categories. Each category is assessed independently before contributing its weighted portion to the composite Threat Score. The analyst also cross-references against our existing database to identify network connections.",
    color: "text-blue-400",
    borderColor: "border-blue-900/40",
  },
  {
    step: "04",
    title: "Editorial Review",
    icon: <Eye className="h-5 w-5" />,
    desc: "A second analyst reviews the investigation for accuracy, ensures all claims are evidence-backed, and validates the threat score assignment. The review must pass editorial standards before publication. Any disagreement on scoring triggers a third-analyst review.",
    color: "text-purple-400",
    borderColor: "border-purple-900/40",
  },
  {
    step: "05",
    title: "Publication",
    icon: <FileText className="h-5 w-5" />,
    desc: "The completed investigation is published with full evidence documentation including ad creative counts, geo-targeting data, celebrity impersonation findings, and funnel analysis. Every published review includes a methodology reference and correction contact.",
    color: "text-green-400",
    borderColor: "border-green-900/40",
  },
  {
    step: "06",
    title: "Continuous Monitoring",
    icon: <RefreshCw className="h-5 w-5" />,
    desc: "Published investigations are not static. Our systems continue monitoring for new ad activity, infrastructure changes, and rebranding attempts. Threat scores are updated when new evidence emerges, with all changes logged in the investigation's revision history.",
    color: "text-cyan-400",
    borderColor: "border-cyan-900/40",
  },
];

const editorialPolicies = [
  {
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    title: "Evidence-Only Assessment",
    desc: "Threat scores are determined solely by verifiable evidence. We never accept payment to add, modify, or remove listings. No investigation is published without corroborating evidence from at least two independent data sources.",
  },
  {
    icon: <Scale className="h-5 w-5 text-blue-400" />,
    title: "Corrections & Disputes",
    desc: "If a reviewed platform believes our assessment contains factual errors, they can contact corrections@cryptokiller.org. We review all disputes within 72 hours and publish corrections transparently with a full changelog. Corrections never result in review removal — only factual updates.",
  },
  {
    icon: <Clock className="h-5 w-5 text-amber-400" />,
    title: "Revision History",
    desc: "Every investigation maintains a revision history. When a threat score is updated — whether up or down — the change is logged with the date, new evidence that prompted the update, and the analyst responsible for the revision.",
  },
  {
    icon: <Ban className="h-5 w-5 text-red-400" />,
    title: "Independence & Conflicts",
    desc: "CryptoKiller does not accept advertising from cryptocurrency platforms, exchanges, or financial services. We have no financial relationships with any platform we investigate. Our revenue comes from educational content and institutional threat intelligence licensing.",
  },
  {
    icon: <Shield className="h-5 w-5 text-purple-400" />,
    title: "Analyst Anonymity",
    desc: "Our analysts work under initials to protect their operational security. Scam operations are frequently run by organized groups that retaliate against investigators. Anonymity protects our team while maintaining accountability through our editorial review process.",
  },
  {
    icon: <Target className="h-5 w-5 text-cyan-400" />,
    title: "Scope & Limitations",
    desc: "We investigate platforms based on their public advertising footprint and observable infrastructure. We cannot access private systems, internal communications, or unpublished financial records. Our assessments reflect evidence available at time of publication.",
  },
];

export default function MethodologyPage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "Investigation Methodology", href: "https://cryptokiller.org/methodology" },
  ];

  usePageMeta({
    title: "Investigation Methodology — CryptoKiller",
    description: "How CryptoKiller investigates crypto scams: our evidence-based scoring system, data sources, investigation process, and editorial standards. Every threat score is backed by verifiable public data.",
    canonical: "https://cryptokiller.org/methodology",
    ogType: "article",
    jsonLd: [
      { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) },
      {
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: "Investigation Methodology",
        description: "How CryptoKiller investigates crypto scams: our evidence-based scoring system, data sources, investigation process, and editorial standards.",
        url: "https://cryptokiller.org/methodology",
        publisher: {
          "@type": "Organization",
          name: "CryptoKiller",
          url: "https://cryptokiller.org",
        },
        isPartOf: {
          "@type": "WebSite",
          name: "CryptoKiller",
          url: "https://cryptokiller.org",
        },
      },
    ],
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "Investigation Methodology" },
        ]} />

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <Microscope className="h-3.5 w-3.5" />
            Investigation Methodology
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5">
            How We <span className="text-red-500">Investigate</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-lg">
            Every CryptoKiller investigation follows a standardized, evidence-based methodology.
            Our Threat Scores are derived from publicly verifiable data — never opinions,
            paid placements, or anonymous tips alone.
          </p>
        </div>

        <section className="mb-20" id="process">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Search className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Investigation Process</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="space-y-0">
            {investigationSteps.map((step, i) => (
              <div key={step.step} className="relative flex gap-6">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl bg-slate-900 border ${step.borderColor} flex items-center justify-center shrink-0 ${step.color}`}>
                    {step.icon}
                  </div>
                  {i < investigationSteps.length - 1 && (
                    <div className="w-px flex-1 bg-slate-800 my-2" />
                  )}
                </div>
                <div className="pb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-mono font-bold ${step.color}`}>STEP {step.step}</span>
                    <h3 className="text-lg font-bold text-white">{step.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20" id="threat-score">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Threat Score System</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 mb-10">
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              The CryptoKiller Threat Score is a composite rating from 0 to 100 that quantifies the likelihood a platform
              is operating as a fraudulent scheme. The score is calculated from six weighted evidence categories, each
              independently assessed by our analysts. Higher scores indicate stronger evidence of fraud.
            </p>

            <div className="space-y-3">
              {threatScoreBands.map((band) => (
                <div key={band.range} className="flex items-center gap-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className={`${band.color} text-white text-xs font-black px-3 py-1.5 rounded-lg min-w-[50px] text-center`}>
                    {band.range}
                  </div>
                  <div>
                    <span className={`text-sm font-bold ${band.textColor}`}>{band.label}</span>
                    <span className="text-slate-500 text-sm ml-2">— {band.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <h3 className="text-xl font-bold text-white mb-6">Scoring Categories & Weights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scoringFactors.map((factor) => (
              <div key={factor.title} className={`p-5 rounded-xl border ${factor.bg}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={factor.color}>{factor.icon}</div>
                  <h4 className="text-white font-bold text-sm flex-1">{factor.title}</h4>
                  <span className={`text-xs font-mono font-bold ${factor.color} bg-slate-950/60 px-2 py-1 rounded`}>
                    {factor.weight}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{factor.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20" id="data-sources">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Data Sources</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-3xl">
            CryptoKiller investigations are built on publicly verifiable data sources.
            We do not rely on private intelligence, insider information, or unverifiable claims.
            Every data point cited in our investigations can be independently verified.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source) => (
              <div key={source.name} className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
                <h4 className="text-white font-bold text-sm mb-2">{source.name}</h4>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">{source.desc}</p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                  >
                    {source.url.replace("https://", "").replace(/\/$/, "")}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20" id="editorial-standards">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Scale className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Editorial Standards</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="space-y-4">
            {editorialPolicies.map((policy) => (
              <div key={policy.title} className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex gap-4">
                <div className="shrink-0 mt-0.5">{policy.icon}</div>
                <div>
                  <h4 className="text-white font-bold text-sm mb-2">{policy.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{policy.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16" id="faq">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Frequently Asked Questions</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How is the Threat Score calculated?",
                a: "The Threat Score is a weighted composite of six evidence categories: Ad Creative Volume (25%), Geographic Targeting (20%), Celebrity Impersonation (20%), Funnel Analysis (15%), Regulatory Status (10%), and Historical Pattern Matching (10%). Each category is assessed independently based on publicly verifiable data.",
              },
              {
                q: "Can a platform request removal from CryptoKiller?",
                a: "No. We do not remove investigations. If a platform believes our assessment contains factual errors, they can submit a correction request to corrections@cryptokiller.org. Verified corrections are published transparently with a full changelog, but the investigation remains published.",
              },
              {
                q: "How often are investigations updated?",
                a: "Our monitoring systems continuously scan for new advertising activity from investigated platforms. Threat scores are updated whenever significant new evidence emerges — such as a surge in new ad creatives, expansion to new countries, or infrastructure changes. All updates are logged with dates and the evidence that prompted the change.",
              },
              {
                q: "Does CryptoKiller accept payment to modify scores?",
                a: "Absolutely not. CryptoKiller has never accepted payment to add, modify, or remove any investigation. Our threat scores are determined entirely by evidence. We have no financial relationships with any platform we investigate.",
              },
              {
                q: "What if I've been scammed by a platform you've reviewed?",
                a: "Visit our Recovery Guide for step-by-step instructions on reporting to authorities, securing your accounts, and exploring recovery options. We also encourage reporting to your local financial regulator and relevant law enforcement agencies like the FBI's IC3.",
              },
              {
                q: "How can I report a suspected scam?",
                a: "Use our Report a Scam page to submit details about a suspicious platform. Your report will be reviewed by our analyst team and, if it matches our investigation criteria, queued for a full evidence-based investigation.",
              },
            ].map((faq) => (
              <details key={faq.q} className="group bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <summary className="flex items-center gap-3 p-5 cursor-pointer hover:bg-slate-800/40 transition-colors list-none">
                  <span className="text-red-500 font-bold text-lg group-open:rotate-45 transition-transform shrink-0">+</span>
                  <span className="text-white font-semibold text-sm">{faq.q}</span>
                </summary>
                <div className="px-5 pb-5 pl-11">
                  <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center mb-10">
          <Mail className="h-6 w-6 text-red-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-3">Questions About Our Methodology?</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-5 leading-relaxed">
            If you have questions about our investigation process, scoring system, or editorial
            standards, contact our editorial team.
          </p>
          <a
            href="mailto:corrections@cryptokiller.org"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm"
          >
            <Mail className="h-4 w-4" />
            corrections@cryptokiller.org
          </a>
        </div>

        <div className="border-t border-slate-800 pt-8 pb-4 text-center">
          <p className="text-slate-600 text-xs">
            Last updated: April 2026 · This methodology document is reviewed and updated quarterly.
          </p>
        </div>
      </main>
    </div>
  );
}
