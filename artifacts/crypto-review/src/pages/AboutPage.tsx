import {
  Shield, Users, Eye, Target, BookOpen, Code,
  TrendingUp, MapPin, ShieldCheck, Mail
} from "lucide-react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

const analysts = [
  {
    name: "M. Webb",
    initials: "MW",
    role: "Lead Threat Analyst",
    avatarBg: "bg-blue-900",
    credentials: "Blockchain Forensics · 9 yrs",
    specialties: ["Ad Fraud", "Wallet Tracing", "Pig Butchering"],
    published: "340+ investigations published",
    bio: "Leads threat assessment and scam classification across all tracked platforms. Specializes in tracing wallet flows and identifying pig-butchering funnel patterns used by organized crypto fraud networks.",
  },
  {
    name: "P. Nair",
    initials: "PN",
    role: "Ad Intelligence",
    avatarBg: "bg-purple-900",
    credentials: "Cybersecurity · Ex-Platform Trust & Safety",
    specialties: ["Celebrity Impersonation", "Phishing"],
    published: "218 investigations published",
    bio: "Monitors social media ad platforms for fraudulent crypto campaigns. Brings platform-side Trust & Safety experience to identifying celebrity impersonation schemes and phishing funnels at scale.",
  },
  {
    name: "D. Ortiz",
    initials: "DO",
    role: "Investigative Writer",
    avatarBg: "bg-amber-900",
    credentials: "Investigative Journalism · FinCrime",
    specialties: ["Rug Pulls", "ICO Fraud"],
    published: "167 investigations published",
    bio: "Authors long-form investigation reports with evidence-backed analysis. Covers rug pulls, ICO fraud, and regulatory gaps in the crypto space with a focus on consumer protection.",
  },
];

export default function AboutPage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "About CryptoKiller", href: "https://cryptokiller.org/about" },
  ];

  usePageMeta({
    title: "About CryptoKiller — Crypto Scam Intelligence Platform",
    description: "CryptoKiller is a crypto scam intelligence platform. Our analysts investigate fraudulent platforms, track scam ads, and publish evidence-based reviews to protect investors.",
    canonical: "https://cryptokiller.org/about",
    jsonLd: { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) },
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <Breadcrumbs items={[
          { label: "Home", href: "/" },
          { label: "About CryptoKiller" },
        ]} />
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-700/40 text-slate-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-5">
            <Users className="h-3.5 w-3.5" />
            Who We Are
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-5">
            About <span className="text-red-500">CryptoKiller</span>
          </h1>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-lg">
            CryptoKiller is a crypto scam intelligence platform. Our analysts investigate
            fraudulent platforms, track scam advertising campaigns across social media,
            and publish evidence-based reviews to protect investors worldwide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          {[
            {
              icon: <Eye className="h-6 w-6" />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-900/30",
              stat: "1,000+",
              label: "Scam Brands Tracked",
            },
            {
              icon: <BookOpen className="h-6 w-6" />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-900/30",
              stat: "725+",
              label: "Published Investigations",
            },
            {
              icon: <Target className="h-6 w-6" />,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-900/30",
              stat: "84+",
              label: "Countries Monitored",
            },
            {
              icon: <Shield className="h-6 w-6" />,
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-900/30",
              stat: "24/7",
              label: "Scam Monitoring",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`text-center p-6 rounded-xl border ${item.bg}`}
            >
              <div className={`${item.color} flex justify-center mb-3`}>
                {item.icon}
              </div>
              <p className="text-3xl font-black text-white mb-1">{item.stat}</p>
              <p className="text-slate-500 text-sm">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 md:p-10 mb-16">
          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <h2 className="text-2xl font-black text-white mb-4">Our Mission</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                CryptoKiller exists to expose cryptocurrency scams through real-time ad
                surveillance and evidence-based investigation. We monitor social media ad
                platforms across 84+ countries, identifying fraudulent campaigns as they
                launch and documenting the evidence before it disappears.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Our threat scores are based entirely on verifiable evidence — ad creative
                counts, geo-targeting data, celebrity impersonation patterns, and wallet
                activity. We never accept payment to modify or remove listings.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: <Shield className="h-5 w-5 text-red-400" />,
                  title: "Always Monitoring",
                  desc: "Our detection systems operate around the clock to identify new scam platforms as they emerge across ad networks.",
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
                  title: "Evidence-Based",
                  desc: "Every investigation is backed by verifiable ad evidence, wallet data, and documented scam funnel patterns.",
                },
                {
                  icon: <Code className="h-5 w-5 text-blue-400" />,
                  title: "Rapid Detection",
                  desc: "Automated systems enable fast identification and analysis of fraudulent crypto advertising campaigns at scale.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl"
                >
                  <div className="shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">
                      {item.title}
                    </p>
                    <p className="text-slate-500 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Target className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Investigation Team</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {analysts.map((a) => (
              <div
                key={a.name}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-4 mb-5">
                  <div
                    className={`${a.avatarBg} w-14 h-14 rounded-full flex items-center justify-center shrink-0`}
                  >
                    <span className="text-white font-bold text-base tracking-wide">
                      {a.initials}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{a.name}</h3>
                    <p className="text-slate-400 text-xs">{a.role}</p>
                  </div>
                </div>

                <p className="text-slate-500 text-xs font-mono leading-relaxed mb-3">
                  {a.credentials}
                </p>

                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  {a.bio}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-5">
                  {a.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[11px] text-slate-400 font-medium border border-slate-700/60 rounded-full px-2.5 py-0.5"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-500">
                    <span className="text-white font-semibold">{a.published}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 justify-center max-w-2xl mx-auto">
            <ShieldCheck className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 leading-relaxed text-center">
              Analyst profiles use initials to protect operational security. CryptoKiller analysts work anonymously to avoid retaliation from scam operations they investigate.
            </p>
          </div>
        </section>

        <section className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-slate-800 p-2 rounded-lg">
              <Mail className="h-5 w-5 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-white">Contribute</h2>
            <div className="flex-1 h-px bg-slate-800 ml-3" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
            <h3 className="text-white font-bold text-lg mb-3">Join the Investigation Network</h3>
            <p className="text-slate-400 text-sm max-w-xl mx-auto mb-5 leading-relaxed">
              We work with vetted contributors across 23 countries. If you have experience
              in blockchain forensics, OSINT, ad intelligence, or investigative journalism,
              we'd like to hear from you.
            </p>
            <a
              href="mailto:contribute@cryptokiller.org"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm"
            >
              <Mail className="h-4 w-4" />
              Apply to Contribute
            </a>
          </div>
        </section>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center mb-10">
          <MapPin className="h-6 w-6 text-red-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-lg mb-2">Headquarters</h3>
          <p className="text-slate-400 text-sm mb-1">DEX Algo Technologies Pte Ltd.</p>
          <p className="text-slate-500 text-sm">
            150 Beach Rd., Level 35 Gateway West, Singapore 189720
          </p>
        </div>

        <div className="border-t border-slate-800 pt-8 pb-4 text-center">
          <p className="text-slate-600 text-xs">
            CryptoKiller runs sophisticated detection systems 24/7 to discover the latest crypto scams.
            All investigation data is sourced from real-time ad monitoring and community reports.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
