import { useListReviews } from "@workspace/api-client-react";
import type { ReviewSummary } from "@workspace/api-client-react";
import {
  Shield, ShieldAlert, Globe, BarChart2, Clock,
  ChevronRight, ArrowRight, Siren
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";

function HeroSection() {
  return (
    <section className="relative py-20 md:py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="container mx-auto px-4 max-w-6xl relative">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-sm font-semibold uppercase tracking-widest">Active Threat Intelligence</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white leading-none mb-6">
          Exposing Crypto<br />
          <span className="text-red-500">Scams</span> Before<br />
          They Strike
        </h1>
        <p className="text-lg md:text-xl text-slate-300 max-w-2xl leading-relaxed mb-10">
          SpyOwl's CryptoKiller uses AI-powered ad surveillance to detect, analyze, and expose fraudulent crypto platforms targeting everyday investors worldwide.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href="#investigations"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-6 py-3 rounded-lg"
          >
            <Siren className="h-4 w-4" />
            Browse Investigations
          </a>
          <a
            href="#"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors text-slate-200 font-semibold px-6 py-3 rounded-lg border border-slate-700"
          >
            Report a Scam
            <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

function StatsBar({ reviews }: { reviews: ReviewSummary[] }) {
  const totalScams = reviews.length;
  const totalAdCreatives = reviews.reduce((sum, r) => sum + r.adCreatives, 0);
  const maxCountries = reviews.reduce((max, r) => Math.max(max, r.countriesTargeted), 0);
  const avgThreatScore = reviews.length > 0
    ? Math.round(reviews.reduce((sum, r) => sum + r.threatScore, 0) / reviews.length)
    : 0;

  const stats = [
    { icon: <ShieldAlert className="h-6 w-6 text-red-500" />, bg: "bg-red-500/10", value: totalScams.toString(), label: "Scams Exposed" },
    { icon: <BarChart2 className="h-6 w-6 text-amber-500" />, bg: "bg-amber-500/10", value: totalAdCreatives.toLocaleString(), label: "Fraudulent Ads Tracked" },
    { icon: <Globe className="h-6 w-6 text-blue-400" />, bg: "bg-blue-500/10", value: maxCountries.toString() + "+", label: "Countries Targeted" },
    { icon: <Clock className="h-6 w-6 text-orange-400" />, bg: "bg-orange-500/10", value: `${avgThreatScore}/100`, label: "Avg Threat Score" },
  ];

  return (
    <section className="border-y border-slate-800 bg-slate-900/40 py-6">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`${s.bg} p-3 rounded-full shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-xl md:text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InvestigationCard({ slug, platformName, threatScore, verdict, investigationDate, adCreatives, countriesTargeted, daysActive }: ReviewSummary) {
  const formattedDate = new Date(investigationDate).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });

  const scoreColor = threatScore >= 80 ? "text-red-500" : threatScore >= 60 ? "text-orange-400" : "text-amber-400";
  const scoreBg = threatScore >= 80 ? "bg-red-950/40 border-red-900/40" : threatScore >= 60 ? "bg-orange-950/40 border-orange-900/40" : "bg-amber-950/40 border-amber-900/40";

  return (
    <a href={`/review/${slug}`} className="group block">
      <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-600 hover:bg-slate-900/80 transition-all duration-200 h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors truncate">{platformName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{formattedDate}</p>
            </div>
            <div className={`shrink-0 rounded-lg border ${scoreBg} px-3 py-1.5 text-center`}>
              <p className={`text-xl font-black ${scoreColor} leading-tight`}>{threatScore}</p>
              <p className="text-xs text-slate-500 leading-none">/ 100</p>
            </div>
          </div>

          <Badge className="bg-red-600/20 text-red-400 border border-red-900/40 mb-4 text-xs">
            <ShieldAlert className="h-3 w-3 mr-1" />
            CONFIRMED SCAM
          </Badge>

          <p className="text-slate-400 text-sm leading-relaxed mb-5 line-clamp-2">{verdict}</p>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Ad Creatives", value: adCreatives.toLocaleString() },
              { label: "Countries", value: countriesTargeted.toString() },
              { label: "Days Active", value: daysActive.toString() },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-800/60 rounded-lg p-2 text-center">
                <p className="text-white text-sm font-bold">{stat.value}</p>
                <p className="text-slate-500 text-xs">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 text-red-400 text-sm font-semibold group-hover:gap-2 transition-all">
            Read Full Investigation
            <ArrowRight className="h-4 w-4" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

function InvestigationsGrid({ reviews, isLoading, error }: {
  reviews: ReviewSummary[] | undefined;
  isLoading: boolean;
  error: unknown;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64 bg-slate-800 rounded-xl" />
        ))}
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
      {reviews.map((review) => (
        <InvestigationCard key={review.id} {...review} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: reviews, isLoading, error } = useListReviews();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="home" />

      <HeroSection />

      <StatsBar reviews={reviews ?? []} />

      <section id="investigations" className="container mx-auto px-4 max-w-6xl py-16">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-xs font-bold uppercase tracking-widest">Live Threat Database</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">Active Investigations</h2>
          <p className="text-slate-400 max-w-xl">Each investigation is backed by SpyOwl's AI-powered ad surveillance data, tracking thousands of fraudulent ad creatives in real time.</p>
        </div>

        <InvestigationsGrid reviews={reviews} isLoading={isLoading} error={error} />
      </section>

      <footer className="border-t border-slate-800 bg-slate-900/30 py-8 mt-8">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-1 rounded">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-bold">Crypto<span className="text-red-500">Killer</span></span>
            <span className="text-slate-500 text-sm">by SpyOwl</span>
          </div>
          <p className="text-slate-500 text-xs text-center">
            © {new Date().getFullYear()} SpyOwl. All investigations are for informational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
