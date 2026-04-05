import { useState, useMemo } from "react";
import { useListReviews } from "@workspace/api-client-react";
import { usePageMeta } from "@/hooks/usePageMeta";
import type { ReviewSummary } from "@workspace/api-client-react";
import {
  Shield, ShieldAlert, Globe, BarChart2,
  Search, ArrowRight, ArrowUpDown,
  Users, Clock, Filter, X, LayoutGrid, List,
  AlertTriangle, TrendingUp, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";

type SortKey = "threatScore" | "newest" | "adCreatives" | "countriesTargeted" | "daysActive" | "platformName";
type ThreatFilter = "all" | "critical" | "high" | "medium" | "low";
type ViewMode = "grid" | "list";

const ITEMS_PER_PAGE = 24;

function getThreatLevel(score: number): { label: string; color: string; bg: string; border: string } {
  if (score >= 90) return { label: "Critical", color: "text-red-400", bg: "bg-red-600", border: "border-red-600/30" };
  if (score >= 70) return { label: "High", color: "text-orange-400", bg: "bg-orange-500", border: "border-orange-600/30" };
  if (score >= 50) return { label: "Medium", color: "text-amber-400", bg: "bg-amber-500", border: "border-amber-600/30" };
  return { label: "Low", color: "text-green-400", bg: "bg-green-600", border: "border-green-600/30" };
}

function StatsBar({ reviews }: { reviews: ReviewSummary[] }) {
  const totalAds = reviews.reduce((sum, r) => sum + r.adCreatives, 0);
  const avgScore = reviews.length > 0 ? Math.round(reviews.reduce((sum, r) => sum + r.threatScore, 0) / reviews.length) : 0;
  const critical = reviews.filter(r => r.threatScore >= 90).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {[
        { value: reviews.length.toLocaleString(), label: "Total Investigations", icon: <Shield className="h-4 w-4" />, accent: "text-blue-400" },
        { value: critical.toLocaleString(), label: "Critical Threats", icon: <AlertTriangle className="h-4 w-4" />, accent: "text-red-400" },
        { value: totalAds.toLocaleString(), label: "Scam Ads Tracked", icon: <BarChart2 className="h-4 w-4" />, accent: "text-amber-400" },
        { value: `${avgScore}/100`, label: "Avg Threat Score", icon: <TrendingUp className="h-4 w-4" />, accent: "text-orange-400" },
      ].map(s => (
        <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className={s.accent}>{s.icon}</span>
            <span className="text-xs text-slate-500 font-medium">{s.label}</span>
          </div>
          <p className="text-xl font-black text-white">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function ScoreBox({ score }: { score: number }) {
  const { bg } = getThreatLevel(score);
  return (
    <div className={`${bg} w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-lg`}>
      <span className="text-white text-lg font-black leading-none">{score}</span>
      <span className="text-white/60 text-[8px] font-bold">/100</span>
    </div>
  );
}

function ReviewGridCard({ review }: { review: ReviewSummary }) {
  const { label, color, border } = getThreatLevel(review.threatScore);
  const dateStr = new Date(review.investigationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <a href={`/review/${review.slug}`} className="group block">
      <div className="relative bg-slate-900/70 border border-slate-800 hover:border-slate-600 rounded-2xl overflow-hidden transition-all duration-200 h-full">
        <div className={`h-0.5 w-full ${getThreatLevel(review.threatScore).bg}`} />
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <ScoreBox score={review.threatScore} />
            <div className="min-w-0 flex-1">
              <h3 className="text-white font-bold text-base leading-tight group-hover:text-red-400 transition-colors truncate">
                {review.platformName}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge className={`${color} bg-transparent border ${border} text-[10px] font-bold px-1.5 py-0`}>
                  {label}
                </Badge>
                <span className="text-slate-600 text-[10px]">{dateStr}</span>
              </div>
            </div>
          </div>

          <p className="text-slate-500 text-xs line-clamp-2 mb-4 leading-relaxed">{review.verdict}</p>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-3">
            <span className="flex items-center gap-1.5"><BarChart2 className="h-3 w-3 text-slate-600" />{review.adCreatives.toLocaleString()} ads</span>
            <span className="flex items-center gap-1.5"><Globe className="h-3 w-3 text-slate-600" />{review.countriesTargeted} countries</span>
            <span className="flex items-center gap-1.5"><Users className="h-3 w-3 text-slate-600" />{review.celebritiesAbused} celebs</span>
            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-slate-600" />{review.daysActive} days</span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
            <span className="flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-semibold text-[11px]">Active</span>
            </span>
            <span className="text-xs text-slate-600 group-hover:text-red-400 transition-colors flex items-center gap-1">
              Read report <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}

function ReviewListRow({ review }: { review: ReviewSummary }) {
  const { label, color, border } = getThreatLevel(review.threatScore);
  const dateStr = new Date(review.investigationDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  return (
    <a href={`/review/${review.slug}`} className="group flex items-center gap-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-600 hover:bg-slate-900/80 transition-all">
      <ScoreBox score={review.threatScore} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="text-white font-bold text-sm group-hover:text-red-400 transition-colors truncate">
            {review.platformName}
          </h3>
          <Badge className={`${color} bg-transparent border ${border} text-[10px] font-bold px-1.5 py-0`}>
            {label}
          </Badge>
        </div>
        <p className="text-slate-500 text-xs line-clamp-1 mb-1">{review.verdict}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
          <span>{dateStr}</span>
          <span className="text-slate-700">·</span>
          <span>{review.adCreatives.toLocaleString()} ads</span>
          <span className="text-slate-700">·</span>
          <span>{review.countriesTargeted} countries</span>
          <span className="text-slate-700">·</span>
          <span>{review.celebritiesAbused} celebs</span>
          <span className="text-slate-700">·</span>
          <span>{review.daysActive} days active</span>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-700 group-hover:text-red-400 shrink-0 transition-colors" />
    </a>
  );
}

function LoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(12)].map((_, i) => <Skeleton key={i} className="h-56 bg-slate-800 rounded-2xl" />)}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 bg-slate-800 rounded-xl" />)}
    </div>
  );
}

export default function InvestigationsPage() {
  const { data: reviews, isLoading, isError } = useListReviews({
    query: { refetchInterval: 60_000 },
  });

  usePageMeta({
    title: "Scam Investigations",
    description: "Browse all active crypto scam investigations. Filter by threat level, sort by threat score, and search 1,000+ tracked platforms.",
    canonical: "https://cryptokiller.org/investigations",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("threatScore");
  const [threatFilter, setThreatFilter] = useState<ThreatFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!reviews) return [];
    let result = [...reviews];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.platformName.toLowerCase().includes(q) ||
        r.verdict.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q)
      );
    }

    if (threatFilter !== "all") {
      result = result.filter(r => {
        const level = getThreatLevel(r.threatScore).label.toLowerCase();
        return level === threatFilter;
      });
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "threatScore": return b.threatScore - a.threatScore;
        case "newest": return new Date(b.investigationDate).getTime() - new Date(a.investigationDate).getTime();
        case "adCreatives": return b.adCreatives - a.adCreatives;
        case "countriesTargeted": return b.countriesTargeted - a.countriesTargeted;
        case "daysActive": return b.daysActive - a.daysActive;
        case "platformName": return a.platformName.localeCompare(b.platformName);
        default: return 0;
      }
    });

    return result;
  }, [reviews, searchQuery, sortBy, threatFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const clampedPage = Math.min(currentPage, totalPages);
  if (clampedPage !== currentPage) setCurrentPage(clampedPage);
  const paged = filtered.slice((clampedPage - 1) * ITEMS_PER_PAGE, clampedPage * ITEMS_PER_PAGE);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: ThreatFilter) => {
    setThreatFilter(value);
    setCurrentPage(1);
  };

  const threatCounts = useMemo(() => {
    if (!reviews) return { critical: 0, high: 0, medium: 0, low: 0 };
    return {
      critical: reviews.filter(r => r.threatScore >= 90).length,
      high: reviews.filter(r => r.threatScore >= 70 && r.threatScore < 90).length,
      medium: reviews.filter(r => r.threatScore >= 50 && r.threatScore < 70).length,
      low: reviews.filter(r => r.threatScore < 50).length,
    };
  }, [reviews]);

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: "threatScore", label: "Threat Score" },
    { key: "newest", label: "Newest First" },
    { key: "adCreatives", label: "Most Ads" },
    { key: "countriesTargeted", label: "Most Countries" },
    { key: "daysActive", label: "Longest Active" },
    { key: "platformName", label: "A–Z" },
  ];

  const filterOptions: { key: ThreatFilter; label: string; color: string; count: number }[] = [
    { key: "all", label: "All", color: "text-slate-300", count: reviews?.length ?? 0 },
    { key: "critical", label: "Critical (90+)", color: "text-red-400", count: threatCounts.critical },
    { key: "high", label: "High (70–89)", color: "text-orange-400", count: threatCounts.high },
    { key: "medium", label: "Medium (50–69)", color: "text-amber-400", count: threatCounts.medium },
    { key: "low", label: "Low (<50)", color: "text-green-400", count: threatCounts.low },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="investigations" />

      <div className="border-b border-slate-800 bg-slate-950">
        <div className="container mx-auto px-4 max-w-6xl py-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Investigations</h1>
              <p className="text-slate-400 text-sm">
                Browse all {reviews?.length ?? "—"} investigated crypto platforms. Search, filter, and explore our evidence-based reviews.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a href="/report" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white font-bold px-5 py-2.5 rounded-xl text-sm shrink-0">
                <ShieldAlert className="h-4 w-4" /> Report a Scam
              </a>
            </div>
          </div>

          {!isLoading && reviews && <StatsBar reviews={reviews} />}

          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search platforms by name..."
              aria-label="Search platforms by name"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-red-600 focus:ring-1 focus:ring-red-600/30 rounded-xl pl-12 pr-12 py-3.5 text-white text-sm placeholder:text-slate-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-slate-500 shrink-0" />
              {filterOptions.map(f => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                    threatFilter === f.key
                      ? "bg-slate-800 border-slate-600 text-white"
                      : "bg-transparent border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  <span className={threatFilter === f.key ? f.color : ""}>{f.label}</span>
                  <span className="ml-1.5 text-slate-600">{f.count}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortKey)}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-slate-600 cursor-pointer"
                >
                  {sortOptions.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden" role="group" aria-label="View mode">
                <button
                  onClick={() => setViewMode("grid")}
                  aria-label="Grid view"
                  aria-pressed={viewMode === "grid"}
                  className={`p-1.5 ${viewMode === "grid" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"} transition-colors`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  aria-label="List view"
                  aria-pressed={viewMode === "list"}
                  className={`p-1.5 ${viewMode === "list" ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300"} transition-colors`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-6xl py-8">
        {isLoading && <LoadingSkeleton viewMode={viewMode} />}

        {!isLoading && isError && (
          <div className="text-center py-20">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">Failed to load investigations</h3>
            <p className="text-slate-500 text-sm mb-6">
              We couldn't fetch investigation data. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors"
            >
              Refresh page
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-20">
            <ShieldAlert className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No investigations found</h3>
            <p className="text-slate-500 text-sm mb-6">
              {searchQuery
                ? `No platforms match "${searchQuery}" with the current filters.`
                : "No investigations match the selected filters."}
            </p>
            <button
              onClick={() => { setSearchQuery(""); setThreatFilter("all"); setCurrentPage(1); }}
              className="text-red-400 text-sm font-semibold hover:text-red-300 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-slate-500">
                Showing <span className="text-slate-300 font-medium">{(clampedPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(clampedPage * ITEMS_PER_PAGE, filtered.length)}</span> of{" "}
                <span className="text-slate-300 font-medium">{filtered.length}</span> investigations
              </p>
            </div>

            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paged.map(r => <ReviewGridCard key={r.id} review={r} />)}
              </div>
            ) : (
              <div className="space-y-3">
                {paged.map(r => <ReviewListRow key={r.id} review={r} />)}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                  .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "ellipsis" ? (
                      <span key={`e-${i}`} className="text-slate-600 px-1">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        aria-current={clampedPage === item ? "page" : undefined}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          clampedPage === item
                            ? "bg-red-600 text-white"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-950 py-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-red-600 p-1.5 rounded-md">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">
                Crypto<span className="text-red-500">Killer</span>
              </span>
              <span className="text-slate-600 text-sm">Scam Intelligence</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-sm text-slate-500">
              <a href="/recovery" className="hover:text-white transition-colors">Recovery Guide</a>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-6">
            <p className="text-xs text-slate-600 text-center">
              © {new Date().getFullYear()} CryptoKiller. All investigations are for informational purposes only.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
