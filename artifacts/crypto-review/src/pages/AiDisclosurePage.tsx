import {
  Bot, FileSearch, PenLine, ShieldCheck, UserCheck, Camera,
  Cpu, Mail, ExternalLink,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const REVIEWER_LINKEDIN = "https://www.linkedin.com/in/john-feldt-240838249/";

const pipeline = [
  {
    step: "01",
    icon: <FileSearch className="h-5 w-5" />,
    title: "Evidence first",
    desc: "An investigation only begins once verifiable evidence has been collected and archived — captured advertisements, landing pages, domain and infrastructure records, regulator bulletins, and corroborated victim reports. The facts are gathered before anything is written.",
    color: "text-red-400",
    borderColor: "border-red-900/40",
  },
  {
    step: "02",
    icon: <PenLine className="h-5 w-5" />,
    title: "AI-assisted drafting",
    desc: "AI turns the collected evidence into a structured draft. It is not permitted to invent facts, figures, or sources — every claim must trace back to evidence already on file. AI accelerates the writing; it never decides what is true.",
    color: "text-amber-400",
    borderColor: "border-amber-900/40",
  },
  {
    step: "03",
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Automated quality & source-liveness gates",
    desc: "Before a draft reaches a human, automated checks verify that the cited sources are real and reachable and that the draft meets our quality bar. Drafts that fail the gates are sent back, not published.",
    color: "text-blue-400",
    borderColor: "border-blue-900/40",
  },
  {
    step: "04",
    icon: <UserCheck className="h-5 w-5" />,
    title: "Human editorial review",
    desc: "A named human editor reviews the investigation against the evidence and is accountable for what is published. Nothing goes live without passing this review.",
    color: "text-green-400",
    borderColor: "border-green-900/40",
  },
];

export default function AiDisclosurePage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "AI Disclosure & Editorial Standards", href: "https://cryptokiller.org/ai-disclosure" },
  ];

  usePageMeta({
    title: "AI Disclosure & Editorial Standards — CryptoKiller",
    description: "How CryptoKiller uses AI: investigations are AI-drafted from collected evidence, pass automated source-verification gates, and are reviewed by a named human editor before publishing.",
    canonical: "https://cryptokiller.org/ai-disclosure",
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        breadcrumbJsonLd(crumbs),
        {
          "@type": "WebPage",
          "@id": "https://cryptokiller.org/ai-disclosure#webpage",
          url: "https://cryptokiller.org/ai-disclosure",
          name: "AI Disclosure & Editorial Standards — CryptoKiller",
          description: "How CryptoKiller uses AI: investigations are AI-drafted from collected evidence, pass automated source-verification gates, and are reviewed by a named human editor before publishing.",
          isPartOf: { "@type": "WebSite", name: "CryptoKiller", url: "https://cryptokiller.org" },
          publisher: { "@type": "Organization", name: "CryptoKiller", url: "https://cryptokiller.org" },
          inLanguage: "en",
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "AI Disclosure" },
        ]} />

        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <Bot className="h-3.5 w-3.5" />
            AI Disclosure
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5">
            AI Disclosure &amp; <span className="text-red-500">Editorial Standards</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-lg">
            CryptoKiller is transparent about how its investigations are produced. Our content is
            AI-drafted from collected evidence, passes automated source-verification gates, and is
            reviewed by a named human editor before it is published. AI accelerates how fast we turn
            verifiable evidence into a structured investigation — it never decides what is true.
          </p>
        </div>

        <section className="mb-20" id="how-its-created">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <FileSearch className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white">How our content is created</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-2xl">
            Our pipeline is evidence-first. AI assists with drafting — it does not gather the facts and
            it is not allowed to invent them. Every published investigation moves through the same four
            stages, in order.
          </p>

          <div className="space-y-0">
            {pipeline.map((stage, i) => (
              <div key={stage.step} className="relative flex gap-6">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl bg-slate-900 border ${stage.borderColor} flex items-center justify-center shrink-0 ${stage.color}`}>
                    {stage.icon}
                  </div>
                  {i < pipeline.length - 1 && (
                    <div className="w-px flex-1 bg-slate-800 my-2" />
                  )}
                </div>
                <div className="pb-10">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs font-mono font-bold ${stage.color}`}>STEP {stage.step}</span>
                    <h3 className="text-lg font-bold text-white">{stage.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-20" id="ai-level">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Cpu className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Level of AI assistance</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="bg-slate-900/60 border-l-2 border-amber-500/60 rounded-r-xl p-6 mb-6">
            <p className="text-amber-300 font-bold text-sm mb-2">
              AI-generated with human editorial review (L3 on the L0–L4 scale).
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              AI produces the draft from collected evidence, and a named human editor reviews it
              against that evidence before publication. The human reviewer — not the model — is
              accountable for the published page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <h4 className="text-white font-bold text-sm">AI-generated images</h4>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-generated images on this site carry the IPTC DigitalSourceType value
                <span className="font-mono text-slate-300"> trainedAlgorithmicMedia</span>, identifying
                them as machine-generated.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4 text-blue-400" />
                <h4 className="text-white font-bold text-sm">Scam-ad screenshots</h4>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Screenshots of scam advertisements are captured evidence — they are real artefacts we
                recorded from live ad campaigns, not AI-generated images.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-20" id="accountability">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-slate-800 p-2 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Accountability</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 mb-6">
            <h3 className="text-white font-bold text-lg mb-1">John Feldt</h3>
            <p className="text-slate-400 text-sm mb-4">Editorial Standards Reviewer</p>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              John Feldt is publicly accountable for our editorial standards and signs off on the
              investigations we publish.
            </p>
            <a
              href={REVIEWER_LINKEDIN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors font-semibold"
            >
              LinkedIn profile
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
              <h4 className="text-white font-bold text-sm mb-2">Analyst personas</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Individual analysts publish under consistent personas to protect their operational
                security, because scam operations are frequently run by organised groups that
                retaliate against investigators. Personas are stable and accountable — they are a
                security measure, not anonymity.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
              <h4 className="text-white font-bold text-sm mb-2">Publisher of record</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                The publisher of record for every investigation is DEX Algo Technologies Pte Ltd.,
                registered in Singapore.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16" id="corrections">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
            <Mail className="h-6 w-6 text-red-400 mx-auto mb-3" />
            <h3 className="text-white font-bold text-lg mb-3">Corrections</h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-5 leading-relaxed">
              If you believe we have published something inaccurate, email us with the URL of the
              affected page and a clear explanation of the error. We review every correction request
              on the merits and publish a dated correction notice when warranted.
            </p>
            <a
              href="mailto:office@cryptokiller.org"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm"
            >
              <Mail className="h-4 w-4" />
              office@cryptokiller.org
            </a>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
