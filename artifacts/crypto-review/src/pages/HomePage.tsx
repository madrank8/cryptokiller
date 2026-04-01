import { useListReviews } from "@workspace/api-client-react";
import type { ReviewSummary } from "@workspace/api-client-react";
import {
  Shield, ShieldAlert, Globe, BarChart2, Clock,
  ArrowRight, Siren, Eye, Radio, AlertTriangle,
  TrendingUp, Lock, Search, Zap
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";

/* ─── Dot-grid background pattern ─── */
const GridBg = () => (
  <div
    className="absolute inset-0 pointer-events-none opacity-[0.04]"
    style={{
      backgroundImage: `radial-gradient(circle, #ef4444 1px, transparent 1px)`,
      backgroundSize: "32px 32px",
    }}
  />
);

/* ─── Scrolling live ticker ─── */
function ThreatTicker() {
  const items = [
    "⚠ Quantum AI · 3,076 ads · 45 countries",
    "🔴 ACTIVE OPERATION DETECTED",
    "⚠ 42 new creatives this week",
    "🔴 28 celebrities impersonated",
    "⚠ 419 days uninterrupted",
    "🔴 CONFIRMED SCAM · DO NOT INVEST",
    "⚠ Targeting: UK · USA · India · Brazil · Germany",
    "🔴 Threat Score: 95 / 100",
  ];
  const repeated = [...items, ...items];

  return (
    <div className="bg-red-950/60 border-y border-red-900/50 py-2 overflow-hidden relative">
      <div className="flex animate-[ticker_35s_linear_infinite] whitespace-nowrap">
        {repeated.map((item, i) => (
          <span key={i} className="text-red-300 text-xs font-semibold tracking-wide mx-8 shrink-0">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <GridBg />
      {/* radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-red-950/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-red-950/10 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 max-w-6xl relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-red-950/50 border border-red-900/60 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Active Threat Intelligence</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[0.95] mb-6">
              Exposing<br />
              Crypto <span className="text-red-500 relative">
                Scams
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-red-500/50" />
              </span><br />
              Before They<br />
              Strike
            </h1>

            <p className="text-lg text-slate-400 max-w-lg leading-relaxed mb-10">
              SpyOwl's CryptoKiller uses AI-powered ad surveillance across 50+ networks to detect, analyze, and expose fraudulent platforms targeting everyday investors.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#investigations"
                className="inline-flex items-center gap-2.5 bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors text-white font-bold px-7 py-3.5 rounded-xl shadow-lg shadow-red-950/50"
              >
                <Siren className="h-4 w-4" />
                Browse Investigations
              </a>
              <a
                href="#"
                className="inline-flex items-center gap-2.5 bg-slate-800/80 hover:bg-slate-700 transition-colors text-slate-200 font-semibold px-7 py-3.5 rounded-xl border border-slate-700"
              >
                <Radio className="h-4 w-4 text-red-400" />
                Report a Scam
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6">
              <div className="flex -space-x-2">
                {["bg-red-700", "bg-orange-700", "bg-amber-700", "bg-red-800"].map((c, i) => (
                  <div key={i} className={`w-7 h-7 rounded-full ${c} border-2 border-slate-950 flex items-center justify-center`}>
                    <Shield className="h-3 w-3 text-white" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400">
                Trusted by <span className="text-white font-semibold">thousands</span> of investors worldwide
              </p>
            </div>
          </div>

          {/* Right: threat card */}
          <div className="hidden lg:block relative">
            <div className="relative rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden backdrop-blur-sm shadow-2xl shadow-slate-950">
              {/* card top bar */}
              <div className="bg-red-950/50 border-b border-red-900/40 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Live Threat Feed</span>
                </div>
                <span className="text-slate-500 text-xs font-mono">SpyOwl v2.4</span>
              </div>

              {/* threat item */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-black text-xl">Quantum AI</p>
                    <p className="text-slate-500 text-xs mt-0.5">Detected Feb 1, 2025 — Active</p>
                  </div>
                  <div className="text-center bg-red-950/60 border border-red-900/50 rounded-xl px-4 py-2">
                    <p className="text-red-500 text-3xl font-black leading-tight">95</p>
                    <p className="text-slate-500 text-xs">/ 100</p>
                  </div>
                </div>
                {/* threat bar */}
                <div className="relative h-2 rounded-full bg-slate-800 mb-4 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 w-[95%] bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-full" />
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[["3,076","Ad Creatives"],["45","Countries"],["419","Days Active"]].map(([v,l]) => (
                    <div key={l} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
                      <p className="text-white text-sm font-black">{v}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{l}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {["No FCA License","No SEC Reg","Withdrawal Block","Celebrity Impersonation"].map(f => (
                    <span key={f} className="text-xs bg-red-950/40 border border-red-900/40 text-red-400 rounded px-2 py-0.5">{f}</span>
                  ))}
                </div>
              </div>

              {/* bottom readout */}
              <div className="border-t border-slate-800 px-5 py-3 bg-slate-950/50 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-mono">THREAT LEVEL: EXTREME</span>
                <span className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  ACTIVE SCAM
                </span>
              </div>
            </div>

            {/* floating badge */}
            <div className="absolute -top-4 -right-4 bg-red-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-950/50 rotate-3">
              CONFIRMED SCAM
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Stats bar ─── */
function StatsBar({ reviews }: { reviews: ReviewSummary[] }) {
  const totalAdCreatives = reviews.reduce((sum, r) => sum + r.adCreatives, 0);
  const maxCountries = reviews.reduce((max, r) => Math.max(max, r.countriesTargeted), 0);
  const avgThreat = reviews.length > 0
    ? Math.round(reviews.reduce((sum, r) => sum + r.threatScore, 0) / reviews.length)
    : 0;

  const stats = [
    { icon: <ShieldAlert className="h-5 w-5" />, color: "text-red-400", bg: "bg-red-500/10 border-red-900/30", value: reviews.length.toString(), label: "Scams Exposed" },
    { icon: <BarChart2 className="h-5 w-5" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-900/30", value: totalAdCreatives.toLocaleString(), label: "Fraudulent Ads Tracked" },
    { icon: <Globe className="h-5 w-5" />, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-900/30", value: `${maxCountries}+`, label: "Countries Targeted" },
    { icon: <TrendingUp className="h-5 w-5" />, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-900/30", value: `${avgThreat}/100`, label: "Avg Threat Score" },
  ];

  return (
    <div className="border-y border-slate-800 bg-slate-900/60">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-800">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-6">
              <div className={`p-2.5 rounded-xl border ${s.bg} ${s.color} shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-2xl md:text-3xl font-black text-white leading-tight">{s.value}</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Investigation card ─── */
function InvestigationCard({ slug, platformName, threatScore, verdict, investigationDate, adCreatives, countriesTargeted, daysActive }: ReviewSummary) {
  const formattedDate = new Date(investigationDate).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const isExtreme = threatScore >= 80;
  const isHigh = threatScore >= 60 && threatScore < 80;

  const barColor = isExtreme ? "from-orange-600 via-red-600 to-red-700" : isHigh ? "from-amber-500 to-orange-600" : "from-yellow-500 to-amber-500";
  const scoreColor = isExtreme ? "text-red-400" : isHigh ? "text-orange-400" : "text-amber-400";
  const scoreBorder = isExtreme ? "border-red-900/50 bg-red-950/30" : isHigh ? "border-orange-900/50 bg-orange-950/30" : "border-amber-900/50 bg-amber-950/30";
  const topBar = isExtreme ? "bg-red-600" : isHigh ? "bg-orange-500" : "bg-amber-500";

  return (
    <a href={`/review/${slug}`} className="group block">
      <div className="relative rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-600 hover:bg-slate-900 transition-all duration-200 overflow-hidden h-full flex flex-col">
        {/* top accent bar */}
        <div className={`h-1 w-full ${topBar} opacity-80`} />

        <div className="p-6 flex-1 flex flex-col">
          {/* header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Active Scam</span>
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-red-400 transition-colors truncate leading-tight">{platformName}</h3>
              <p className="text-xs text-slate-600 mt-1">{formattedDate}</p>
            </div>
            {/* score ring */}
            <div className={`shrink-0 rounded-xl border ${scoreBorder} px-3 py-2 text-center min-w-[60px]`}>
              <p className={`text-2xl font-black ${scoreColor} leading-none`}>{threatScore}</p>
              <p className="text-xs text-slate-600 mt-0.5">/100</p>
            </div>
          </div>

          {/* threat progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-slate-600 mb-1.5">
              <span>Threat Level</span>
              <span className={`font-semibold ${scoreColor}`}>{isExtreme ? "EXTREME" : isHigh ? "HIGH" : "MEDIUM"}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all`}
                style={{ width: `${threatScore}%` }}
              />
            </div>
          </div>

          {/* verdict */}
          <p className="text-slate-400 text-sm leading-relaxed mb-5 flex-1 line-clamp-2">{verdict}</p>

          {/* stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { icon: <BarChart2 className="h-3 w-3" />, label: "Ad Creatives", value: adCreatives.toLocaleString() },
              { icon: <Globe className="h-3 w-3" />, label: "Countries", value: countriesTargeted.toString() },
              { icon: <Clock className="h-3 w-3" />, label: "Days Active", value: daysActive.toString() },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-2.5 text-center">
                <div className="flex items-center justify-center gap-1 mb-1 text-slate-500">{stat.icon}</div>
                <p className="text-white text-sm font-bold">{stat.value}</p>
                <p className="text-slate-600 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <Badge className="bg-red-600/15 text-red-400 border border-red-900/30 text-xs font-semibold">
              <ShieldAlert className="h-2.5 w-2.5 mr-1" />
              CONFIRMED SCAM
            </Badge>
            <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold group-hover:gap-2.5 transition-all">
              Investigate
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

/* ─── Investigations grid ─── */
function InvestigationsGrid({ reviews, isLoading, error }: {
  reviews: ReviewSummary[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 bg-slate-800 rounded-2xl" />)}
      </div>
    );
  }
  if (error || !reviews) {
    return (
      <div className="text-center py-16">
        <ShieldAlert className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">Unable to load investigations at this time.</p>
      </div>
    );
  }
  if (reviews.length === 0) {
    return (
      <div className="text-center py-16">
        <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400">No investigations published yet. Check back soon.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map((review) => <InvestigationCard key={review.id} {...review} />)}
    </div>
  );
}

/* ─── How it works ─── */
function HowItWorks() {
  const steps = [
    {
      icon: <Search className="h-7 w-7" />,
      color: "text-blue-400", bg: "bg-blue-500/10 border-blue-900/30",
      step: "01",
      title: "Ad Surveillance",
      desc: "SpyOwl scans 50+ ad networks continuously — Facebook, Google, TikTok, native networks — capturing every crypto-related ad creative with full metadata.",
    },
    {
      icon: <Zap className="h-7 w-7" />,
      color: "text-amber-400", bg: "bg-amber-500/10 border-amber-900/30",
      step: "02",
      title: "Threat Analysis",
      desc: "Each captured creative is cross-referenced against regulatory databases (FCA, SEC, ASIC, CySEC), checked for celebrity impersonation, and scored using our proprietary threat model.",
    },
    {
      icon: <Eye className="h-7 w-7" />,
      color: "text-red-400", bg: "bg-red-500/10 border-red-900/30",
      step: "03",
      title: "Investigation Report",
      desc: "Confirmed scams are published here as detailed intelligence reports — with evidence, funnel breakdowns, geographic data, and victim guidance.",
    },
  ];

  return (
    <section className="py-20 border-t border-slate-800 relative overflow-hidden">
      <GridBg />
      <div className="container mx-auto px-4 max-w-6xl relative">
        <div className="text-center mb-12">
          <p className="text-red-400 text-xs font-bold uppercase tracking-widest mb-3">Our Methodology</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">How We Catch Scams</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.step} className="relative bg-slate-900/60 border border-slate-800 rounded-2xl p-7 hover:border-slate-700 transition-colors">
              <span className="absolute top-5 right-5 text-slate-800 font-black text-4xl select-none">{s.step}</span>
              <div className={`w-14 h-14 rounded-xl border ${s.bg} ${s.color} flex items-center justify-center mb-5`}>
                {s.icon}
              </div>
              <h3 className="text-lg font-bold text-white mb-3">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Warning CTA banner ─── */
function WarningBanner() {
  return (
    <div className="border-y border-red-900/40 bg-red-950/20 py-10">
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
          <a href="#" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-xl text-sm">
            <Lock className="h-4 w-4" /> Report a Scam
          </a>
          <a href="#" className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300 font-semibold px-6 py-3 rounded-xl border border-slate-700 text-sm">
            Get Help
          </a>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function HomePage() {
  const { data: reviews, isLoading, error } = useListReviews();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="home" />
      <ThreatTicker />
      <HeroSection />
      <StatsBar reviews={reviews ?? []} />

      {/* Investigations */}
      <section id="investigations" className="container mx-auto px-4 max-w-6xl py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-red-950/40 border border-red-900/40 rounded-full px-4 py-1.5 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Live Threat Database</span>
            </div>
            <h2 className="text-4xl font-black text-white mb-3">Active Investigations</h2>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
              Each report is backed by SpyOwl ad surveillance data — thousands of creatives tracked across 50+ networks in real time.
            </p>
          </div>
          {reviews && reviews.length > 0 && (
            <div className="shrink-0 bg-slate-900/60 border border-slate-800 rounded-xl px-5 py-3 text-right">
              <p className="text-white font-black text-2xl">{reviews.length}</p>
              <p className="text-slate-500 text-xs">Investigation{reviews.length !== 1 ? "s" : ""} Published</p>
            </div>
          )}
        </div>
        <InvestigationsGrid reviews={reviews} isLoading={isLoading} error={error} />
      </section>

      <WarningBanner />
      <HowItWorks />

      {/* Footer */}
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
                <span className="text-slate-600 text-sm">by SpyOwl</span>
              </a>
              <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                Your definitive intelligence platform exposing cryptocurrency scams through real-time ad surveillance and evidence-based investigation reports.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-slate-500">
              {["Investigations", "Report a Scam", "About", "Privacy Policy", "Terms of Service", "API"].map(l => (
                <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-600">© {new Date().getFullYear()} SpyOwl. All investigations are for informational purposes only.</p>
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
