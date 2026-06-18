import {
  Bot, ShieldCheck, UserCheck, FileText, Image as ImageIcon,
  CheckCircle2, Mail, ExternalLink,
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const REVIEWER_LINKEDIN = "https://www.linkedin.com/in/john-feldt-240838249/";

const faq = [
  {
    q: "Is CryptoKiller's content written by AI?",
    a: "Our investigations and articles are drafted by a large language model from evidence our team collects, then verified by automated gates and reviewed by a named human editor before publication. AI does not invent facts, figures, or sources — every statistic and citation must trace to a verifiable source.",
  },
  {
    q: "Does a human review the content before it is published?",
    a: "Yes. John Feldt, our Editorial Standards Reviewer, reviews content for accuracy and evidence-backing before publication and is the accountable human reviewer for the site.",
  },
  {
    q: "Are the images on this site AI-generated?",
    a: "Editorial illustrations are AI-generated and carry IPTC trainedAlgorithmicMedia provenance metadata in the image file. Screenshots of real scam advertisements are captured evidence and are not AI-generated.",
  },
];

const steps = [
  {
    icon: <FileText className="h-5 w-5" />,
    title: "Evidence first",
    color: "text-amber-400",
    border: "border-amber-900/40",
    desc: "Every investigation starts from evidence we collect — ad creatives, landing pages, regulatory records, and on-chain data. Nothing is written before the evidence exists.",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: "AI-assisted drafting",
    color: "text-blue-400",
    border: "border-blue-900/40",
    desc: "A large language model drafts the prose from that evidence using a fixed editorial process. It does not invent facts, figures, or sources; every statistic and citation must trace to a verifiable source we collected.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Automated verification",
    color: "text-green-400",
    border: "border-green-900/40",
    desc: "Before publication, automated quality gates block templated or unverified content and check every cited source URL for liveness. Links that cannot be verified are removed, not published.",
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "Human editorial review",
    color: "text-purple-400",
    border: "border-purple-900/40",
    desc: "A named human editor — John Feldt — reviews the result for accuracy and evidence-backing, and is accountable for what we publish.",
  },
];

export default function AiDisclosurePage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "AI Disclosure", href: "https://cryptokiller.org/ai-disclosure" },
  ];

  usePageMeta({
    title: "AI Disclosure & Editorial Standards — CryptoKiller",
    description:
      "How CryptoKiller uses AI in its investigations: AI-assisted drafting, deterministic source verification, and human editorial review by a named, accountable reviewer before publication.",
    canonical: "https://cryptokiller.org/ai-disclosure",
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        breadcrumbJsonLd(crumbs),
        {
          "@type": "WebPage",
          name: "AI Disclosure & Editorial Standards",
          description:
            "How CryptoKiller uses AI in its investigations, and who is accountable for what we publish.",
          url: "https://cryptokiller.org/ai-disclosure",
          publisher: { "@type": "Organization", name: "CryptoKiller", url: "https://cryptokiller.org" },
          isPartOf: { "@type": "WebSite", name: "CryptoKiller", url: "https://cryptokiller.org" },
          reviewedBy: {
            "@type": "Person",
            name: "John Feldt",
            jobTitle: "Editorial Standards Reviewer",
            sameAs: [REVIEWER_LINKEDIN],
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        },
      ],
    },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "AI Disclosure" }]} />

        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <Bot className="h-3.5 w-3.5" />
            AI Disclosure
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5">
            AI Disclosure &amp; <span className="text-red-500">Editorial Standards</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-lg">
            We are transparent about how our investigations and articles are produced: drafted with the
            assistance of AI, grounded in evidence we collect and cite, checked by automated verification
            gates, and reviewed by a named human editor before publication.
          </p>
        </div>

        <section className="mb-16" id="process">
          <h2 className="text-2xl font-black text-white mb-8">How our content is created</h2>
          <div className="space-y-0">
            {steps.map((s, i) => (
              <div key={s.title} className="relative flex gap-6">
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl bg-slate-900 border ${s.border} flex items-center justify-center shrink-0 ${s.color}`}>
                    {s.icon}
                  </div>
                  {i < steps.length - 1 && <div className="w-px flex-1 bg-slate-800 my-2" />}
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16" id="ai-level">
          <h2 className="text-2xl font-black text-white mb-6">Our AI-assistance level</h2>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4">
            <p className="text-slate-300 text-sm leading-relaxed">
              We classify our content as <strong className="text-white">AI-generated with human editorial review</strong>{" "}
              — level <strong className="text-white">L3</strong> on the standard L0–L4 AI-assistance scale, where L0 is
              fully human-written and L4 is fully automated with no human review. In plain terms: a large language model
              writes the first draft from human-collected evidence, automated checks gate quality and verify sources, and
              a human editor reviews and is accountable for publication.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed flex gap-3">
              <ImageIcon className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
              <span>
                AI-generated images on this site carry IPTC <code className="text-slate-300">DigitalSourceType: trainedAlgorithmicMedia</code>{" "}
                metadata embedded in the image file — the machine-readable standard signalling an image was produced by a
                generative model. Screenshots of real scam advertisements are evidence, not AI-generated, and are presented
                as captured.
              </span>
            </p>
          </div>
        </section>

        <section className="mb-16" id="accountability">
          <h2 className="text-2xl font-black text-white mb-6">Who reviews and is accountable</h2>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-start gap-4">
              <UserCheck className="h-6 w-6 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-bold text-sm mb-1">John Feldt — Editorial Standards Reviewer</p>
                <p className="text-slate-400 text-sm leading-relaxed mb-2">
                  John Feldt reviews investigations and articles for accuracy and evidence-backing before publication
                  and is the accountable human reviewer for content published on CryptoKiller.
                </p>
                <a
                  href={REVIEWER_LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer me"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View professional profile
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed border-t border-slate-800 pt-4">
              Investigations carry an analyst byline. To protect analysts who investigate organized fraud operations,
              analysts publish under consistent editorial personas rather than full personal identities; the personas
              describe the analyst's coverage area, not fabricated personal credentials. Legal and publishing
              responsibility rests with DEX Algo Technologies Pte Ltd., the publisher of record.
            </p>
          </div>
        </section>

        <section className="mb-16" id="faq">
          <h2 className="text-2xl font-black text-white mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faq.map((f) => (
              <details key={f.q} className="group bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
                <summary className="flex items-center gap-3 p-5 cursor-pointer hover:bg-slate-800/40 transition-colors list-none">
                  <span className="text-red-500 font-bold text-lg group-open:rotate-45 transition-transform shrink-0">+</span>
                  <span className="text-white font-semibold text-sm">{f.q}</span>
                </summary>
                <div className="px-5 pb-5 pl-11">
                  <p className="text-slate-400 text-sm leading-relaxed">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center mb-10">
          <Mail className="h-6 w-6 text-red-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-3">Spotted a factual error?</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-5 leading-relaxed">
            Accuracy matters most on content that affects people's money. If you believe anything we have published is
            factually wrong, contact our editorial team and we will review it.
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
          <p className="text-slate-600 text-xs flex items-center justify-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            This disclosure is reviewed and updated as our process changes.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
