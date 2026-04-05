import { useState, useMemo } from "react";
import { useListReviews } from "@workspace/api-client-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { ReviewSummary } from "@workspace/api-client-react";
import {
  Shield, ShieldAlert, Globe, BarChart2, Clock,
  ArrowRight, Search, Eye, AlertTriangle,
  TrendingUp, Lock, Zap, Radio, ChevronRight,
  Activity, Target, Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import TrustBar from "@/components/TrustBar";
import ResearchTeam from "@/components/ResearchTeam";
import ScamActionSteps from "@/components/ScamActionSteps";

const GridBg = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.03]"
    style={{
      backgroundImage: `radial-gradient(circle, #ef4444 1px, transparent 1px)`,
      backgroundSize: "32px 32px",
    }}
  />
);

function LiveFeedTicker({ reviews }: { reviews: ReviewSummary[] }) {
  const statuses = ["Ad surge observed", "New geo targeted", "New campaign detected", "Scam ad flagged", "Celebrity impersonation detected"];
  const flags = ["🌍", "🇧🇷", "🇬🇧", "🇮🇳", "🇩🇪", "🇺🇸", "🇦🇺", "🇿🇦"];

  const items = reviews.length > 0
    ? reviews.flatMap((r, ri) => [
      `${r.platformName} · ${statuses[ri % statuses.length]} ${flags[ri % flags.length]}`,
    ])
    : ["Quantum AI · Ad surge observed 🌍", "Monitoring active campaigns..."];

  const repeated = [...items, ...items, ...items];

  return (
    <div className="bg-slate-900/80 border-b border-slate-800 py-2 overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-900 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-900 to-transparent z-10" />
      <div className="flex items-center gap-3 mb-0">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-4 shrink-0 flex items-center gap-1.5 z-20">
          <Activity className="h-3 w-3 text-green-500" />
          Live Feed
        </span>
      </div>
      <div className="flex animate-[ticker_40s_linear_infinite] whitespace-nowrap mt-0.5">
        {repeated.map((item, i) => (
          <span key={i} className="text-slate-400 text-xs font-medium mx-6 shrink-0 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-red-500/60" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function HeroSection() {
  const [searchValue, setSearchValue] = useState("");

  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <GridBg />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-red-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-red-950/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-5xl relative text-center">
        <div className="inline-flex items-center gap-2 bg-green-950/40 border border-green-900/40 rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 text-xs font-bold uppercase tracking-widest">Live Scam Monitoring Active</span>
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[0.95] mb-5">
          Don't Get <span className="text-red-500">Scammed</span>
          <br />
          <span className="text-slate-300">Check Before You Invest</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Search any crypto platform to see its threat score, evidence of scam ads, and our investigation verdict.
        </p>

        <form
          className="max-w-xl mx-auto flex gap-2 mb-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (searchValue.trim()) {
              const slug = searchValue.trim().toLowerCase().replace(/\s+/g, "-");
              window.location.href = `/review/${slug}`;
            }
          }}
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search a crypto platform..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-red-600 focus:ring-1 focus:ring-red-600/30 rounded-xl pl-12 pr-4 py-4 text-white text-sm placeholder:text-slate-500 outline-none transition-colors"
            />
          </div>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors text-white font-bold px-8 py-4 rounded-xl shrink-0"
          >
            Investigate
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-lg mx-auto">
          {([
            {
              value: "281,110+",
              label: "Scam Ads Analyzed",
              citations: [
                { name: "Meta Ad Library", href: "https://www.facebook.com/ads/library/" },
                { name: "Google Ads Transparency", href: "https://adstransparency.google.com" },
              ],
            },
            {
              value: "22,033+",
              label: "Brands Tracked",
              citations: [{ name: "CryptoKiller Database" }],
            },
            {
              value: "84+",
              label: "Countries Monitored",
              citations: [{ name: "CK Surveillance Network" }],
            },
          ] as const).map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-black text-white">{s.value}</p>
              <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5">
                {s.citations.map((c) =>
                  "href" in c && c.href ? (
                    <a
                      key={c.name}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-slate-300 bg-slate-800/60 border border-slate-700/40 rounded-full px-2 py-0.5 transition-colors"
                    >
                      {c.name} ↗
                    </a>
                  ) : (
                    <span
                      key={c.name}
                      className="inline-flex items-center text-[10px] text-slate-500 bg-slate-800/60 border border-slate-700/40 rounded-full px-2 py-0.5"
                    >
                      {c.name}
                    </span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-600 max-w-lg mx-auto mt-4 leading-relaxed text-center">
          † Ad counts:{" "}
          <a href="https://www.facebook.com/ads/library/" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline decoration-dotted underline-offset-2 transition-colors">
            Meta Ad Library
          </a>{" "}
          +{" "}
          <a href="https://adstransparency.google.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline decoration-dotted underline-offset-2 transition-colors">
            Google Ads Transparency
          </a>
          . Platform count: CryptoKiller internal database updated weekly. Country coverage: CryptoKiller Ad Surveillance Network.
        </p>
      </div>
    </section>
  );
}

function TrendingCard({ slug, platformName, threatScore, adCreatives, countriesTargeted, celebritiesAbused, daysActive }: ReviewSummary) {
  const isExtreme = threatScore >= 90;
  const isHigh = threatScore >= 70;

  const scoreGrad = isExtreme
    ? "from-red-600 to-red-700"
    : isHigh
      ? "from-orange-500 to-red-600"
      : "from-amber-500 to-orange-500";

  const scoreBg = isExtreme ? "bg-red-600" : isHigh ? "bg-orange-500" : "bg-amber-500";

  const trend = daysActive > 400 ? "Stable" : daysActive > 100 ? "Rising" : "Surging";
  const trendColor = trend === "Surging" ? "text-red-400 bg-red-950/50 border-red-900/40" : trend === "Rising" ? "text-orange-400 bg-orange-950/50 border-orange-900/40" : "text-amber-400 bg-amber-950/50 border-amber-900/40";

  return (
    <a href={`/review/${slug}`} className="group block">
      <div className="relative bg-slate-900/70 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden transition-all duration-200 h-full">
        <div className={`h-0.5 w-full bg-gradient-to-r ${scoreGrad}`} />

        <div className="p-5">
          {/* score + name */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`${scoreBg} w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-lg`}>
              <span className="text-white text-xl font-black leading-none">{threatScore}</span>
              <span className="text-white/60 text-[9px] font-bold">Score</span>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-white font-bold text-lg leading-tight group-hover:text-red-400 transition-colors truncate">{platformName}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className="bg-red-600/20 text-red-400 border border-red-900/30 text-[10px] font-bold px-1.5 py-0">
                  Confirmed Scam
                </Badge>
                <span className={`text-[10px] font-bold border rounded-full px-2 py-0 ${trendColor}`}>
                  {trend}
                </span>
              </div>
            </div>
          </div>

          {/* stats row */}
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-4">
            <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-slate-600" />{countriesTargeted} countries</span>
            <span className="text-slate-700 mx-1">·</span>
            <span className="flex items-center gap-1"><Users className="h-3 w-3 text-slate-600" />{celebritiesAbused} celebs</span>
            <span className="text-slate-700 mx-1">·</span>
            <span className="flex items-center gap-1"><BarChart2 className="h-3 w-3 text-slate-600" />{adCreatives.toLocaleString()} ads</span>
          </div>

          {/* status */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-semibold">Active</span>
            </span>
            <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </a>
  );
}

function TrendingScams({ reviews, isLoading }: { reviews: ReviewSummary[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 bg-slate-800 rounded-2xl" />)}
      </div>
    );
  }
  if (!reviews || reviews.length === 0) return null;

  return (
    <section className="container mx-auto px-4 max-w-6xl py-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-1">Trending Scams</h2>
          <p className="text-slate-500 text-sm">Highest threat scores right now</p>
        </div>
        <a href="/investigations" className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors flex items-center gap-1">
          View all <ChevronRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reviews
          .sort((a, b) => b.threatScore - a.threatScore)
          .slice(0, 8)
          .map((r) => <TrendingCard key={r.id} {...r} />)}
      </div>
    </section>
  );
}

function LatestReviews({ reviews }: { reviews: ReviewSummary[] | undefined }) {
  if (!reviews || reviews.length === 0) return null;

  const latest = [...reviews]
    .sort((a, b) => new Date(b.investigationDate).getTime() - new Date(a.investigationDate).getTime())
    .slice(0, 10);

  return (
    <section id="latest" className="container mx-auto px-4 max-w-6xl py-16 border-t border-slate-800">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-1">Latest Reviews</h2>
          <p className="text-slate-500 text-sm">Most recently published investigations</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {latest.map((r) => {
          const dateStr = new Date(r.investigationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
          return (
            <a key={r.id} href={`/review/${r.slug}`} className="group flex gap-5 p-5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/80 transition-all">
              <div className={`shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${r.threatScore >= 80 ? "bg-red-600" : r.threatScore >= 60 ? "bg-orange-500" : "bg-amber-500"}`}>
                <ShieldAlert className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-bold text-sm group-hover:text-red-400 transition-colors leading-snug mb-1">
                  Is {r.platformName} a Scam? {r.threatScore}/100 Threat Score [2026]
                </h3>
                <p className="text-slate-500 text-xs line-clamp-1 mb-2">{r.verdict}</p>
                <span className="text-slate-600 text-xs">{dateStr}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-red-400 shrink-0 mt-1 transition-colors" />
            </a>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  interface HowItWorksStep {
    num: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    title: string;
    desc: string;
    footnote?: string;
  }

  const steps: HowItWorksStep[] = [
    {
      num: "1",
      icon: <Target className="h-7 w-7" />,
      color: "text-blue-400", bg: "bg-blue-500/10 border-blue-900/30",
      title: "Scam Ads Detected",
      desc: "Our sophisticated systems monitor social media ad platforms across 50+ countries† 24/7, detecting crypto scam campaigns in real time.",
      footnote: "† CryptoKiller Ad Surveillance Network",
    },
    {
      num: "2",
      icon: <Zap className="h-7 w-7" />,
      color: "text-amber-400", bg: "bg-amber-500/10 border-amber-900/30",
      title: "AI Analyzes Patterns",
      desc: "Machine learning identifies celebrity impersonation, geo-targeting patterns, ad velocity surges, and other scam indicators.",
    },
    {
      num: "3",
      icon: <Eye className="h-7 w-7" />,
      color: "text-red-400", bg: "bg-red-500/10 border-red-900/30",
      title: "Evidence-Backed Reviews",
      desc: "We publish comprehensive reviews with threat scores, evidence, red flags, funnel breakdowns, and actionable advice for consumers.",
    },
  ];

  return (
    <section className="py-20 border-t border-slate-800 relative overflow-hidden">
      <GridBg />
      <div className="container mx-auto px-4 max-w-6xl relative">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">How It Works</h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">Our intelligence pipeline turns raw ad data into actionable consumer protection.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.num} className="relative bg-slate-900/60 border border-slate-800 rounded-2xl p-7 hover:border-slate-700 transition-colors text-center">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-black text-lg mx-auto mb-5">
                {s.num}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              {s.footnote && (
                <span className="block mt-2 text-[10px] text-slate-500">{s.footnote}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WarningBanner() {
  return (
    <div className="border-y border-red-900/30 bg-red-950/15 py-10">
      <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Been targeted by a crypto scam?</p>
            <p className="text-slate-400 text-sm">Your report builds the evidence trail that helps shut them down.</p>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <a href="/report" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm">
            <Radio className="h-4 w-4" /> Submit a Report
          </a>
          <a href="/recovery" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 font-semibold px-6 py-3 rounded-xl border border-slate-700 text-sm">
            Get Help
          </a>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { data: reviews, isLoading, error } = useListReviews({
    query: { refetchInterval: 60_000 },
  });

  const jsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "CryptoKiller",
        url: "https://cryptokiller.org",
        logo: "https://cryptokiller.org/favicon.svg",
        description: "Crypto scam investigation and intelligence platform tracking 1,000+ fraudulent brands.",
        address: {
          "@type": "PostalAddress",
          streetAddress: "150 Beach Rd., Level 35 Gateway West",
          addressLocality: "Singapore",
          postalCode: "189720",
          addressCountry: "SG",
        },
      },
      {
        "@type": "WebSite",
        name: "CryptoKiller",
        url: "https://cryptokiller.org",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://cryptokiller.org/review/{search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
    ],
  }), []);

  usePageMeta({
    title: "CryptoKiller — Crypto Scam Intelligence",
    description: "Search any crypto platform to check its threat score, scam ads evidence, and investigation verdict. CryptoKiller tracks 1,000+ scam brands worldwide.",
    canonical: "https://cryptokiller.org/",
    jsonLd,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="home" />
      <LiveFeedTicker reviews={reviews ?? []} />
      <HeroSection />
      <TrustBar />
      <TrendingScams reviews={reviews} isLoading={isLoading} />
      <LatestReviews reviews={reviews} />
      <WarningBanner />
      <HowItWorks />
      <ResearchTeam />
      <ScamActionSteps />

      <footer className="border-t border-slate-800 bg-slate-950 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
            <div>
              <a href="/" className="flex items-center gap-2 mb-2">
                <div className="bg-red-600 p-1.5 rounded-md">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  Crypto<span className="text-red-500">Killer</span>
                </span>
                <span className="text-slate-600 text-sm">Scam Intelligence</span>
              </a>
              <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
                Your definitive intelligence platform exposing cryptocurrency scams through real-time ad surveillance and evidence-based investigation reports.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-500">
              {[
                { label: "Investigations", href: "/investigations" },
                { label: "Report a Scam", href: "/report" },
                { label: "Recovery Guide", href: "/recovery" },
                { label: "About", href: "/about" },
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
              ].map(l => (
                <a key={l.label} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} CryptoKiller. All investigations are for informational purposes only.</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
