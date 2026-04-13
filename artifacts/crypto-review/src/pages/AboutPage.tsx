import {
  Shield, Users, Eye, Target, BookOpen, Code,
  TrendingUp, MapPin, ShieldCheck, Mail, ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";

const analysts = Object.values(WRITER_PERSONAS);

export default function AboutPage() {
  const crumbs = [
    { label: "Home", href: "https://cryptokiller.org/" },
    { label: "About CryptoKiller", href: "https://cryptokiller.org/about" },
  ];

  usePageMeta({
    title: "About CryptoKiller — Crypto Scam Intelligence Platform",
    description: "CryptoKiller is a crypto scam intelligence platform built by investigators who got tired of watching people lose money to the same recycled scams. We track over 1,000 fraudulent brands across 84+ countries.",
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
          <p className="text-slate-300 max-w-3xl mx-auto leading-relaxed text-lg mb-4">
            We started CryptoKiller because we kept seeing the same thing: people losing
            real money to crypto scams that followed the exact same playbook — fake celebrity
            endorsements, fabricated trading dashboards, pressure tactics on WhatsApp and
            Telegram. The scams were obvious to anyone who knew what to look for. The problem
            was that most people didn't.
          </p>
          <p className="text-slate-400 max-w-3xl mx-auto leading-relaxed text-base">
            So we built a platform that does the looking for them. CryptoKiller monitors
            social media ad networks across 84+ countries, identifies fraudulent crypto
            campaigns as they launch, and publishes evidence-based investigation reports
            before the scammers can disappear and rebrand.
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
              <h2 className="text-2xl font-black text-white mb-4">Why We Exist</h2>
              <p className="text-slate-400 leading-relaxed mb-4">
                Every week, thousands of people search for a crypto platform they've seen
                advertised on Facebook, Instagram, or YouTube. Most of those ads are placed
                by scam operations — they run for a few days, collect deposits, then vanish.
                By the time anyone sounds the alarm, the money is gone and the site has
                already relaunched under a new name.
              </p>
              <p className="text-slate-400 leading-relaxed mb-4">
                CryptoKiller exists to break that cycle. Our team captures scam ads the moment
                they go live, documents the evidence — creative assets, targeting data, fake
                endorsements, wallet activity — and publishes investigation reports that
                rank in search results right next to the scams themselves.
              </p>
              <p className="text-slate-400 leading-relaxed">
                When someone googles a suspicious platform, we want our investigation to be
                the first thing they find. That's the mission. No paywalls, no paid removals,
                no exceptions.
              </p>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: <Shield className="h-5 w-5 text-red-400" />,
                  title: "Always Monitoring",
                  desc: "Our systems run around the clock, scanning ad networks for new scam campaigns the moment they launch.",
                },
                {
                  icon: <TrendingUp className="h-5 w-5 text-amber-400" />,
                  title: "Evidence First",
                  desc: "Every threat score is built on verifiable data — ad counts, geo-targeting, wallet flows, impersonation patterns. No speculation.",
                },
                {
                  icon: <Code className="h-5 w-5 text-blue-400" />,
                  title: "No Pay-to-Remove",
                  desc: "We never accept payment to modify or remove a listing. If it's a scam, it stays on the record.",
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

          <p className="text-slate-400 text-sm leading-relaxed max-w-3xl mb-8">
            Our analysts come from cybercrime units, platform Trust & Safety teams, and
            investigative journalism. They joined CryptoKiller because they wanted to stop
            reacting to scams after the damage was done — and start exposing them before
            they reach their next victim.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {analysts.map((a) => (
              <Link
                key={a.slug}
                href={`/author/${a.slug}`}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-slate-600 transition-colors block"
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

                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    <span className="text-white font-semibold">{a.published}</span>
                  </p>
                  <span className="text-xs text-red-400 font-semibold inline-flex items-center gap-1">
                    View profile <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
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
            CryptoKiller is operated by DEX Algo Technologies Pte Ltd., registered in Singapore.
            All investigation data is sourced from real-time ad monitoring and community reports.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
