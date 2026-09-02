import { useParams, Link } from "wouter";
import {
  ArrowLeft, BookOpen, Award, Clock, AlertTriangle, FileText, Linkedin, ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";
import { personNode, WEBSITE_ID } from "@/lib/schemaBuilder";
import { substituteStatTokensInReview } from "@/lib/statTokens";
import TeamAvatar from "@/components/TeamAvatar";

const BASE = "https://cryptokiller.org";

interface ReviewSummary {
  slug: string;
  platformName: string;
  threatScore: number;
  verdict: string;
  investigationDate: string;
  authorPersonaId: string | null;
}

interface BlogPostSummary {
  id: number;
  title: string;
  headline: string;
  slug: string;
  publishedAt: string;
  authorPersonaId: string | null;
}

interface BlogIndexResponse {
  items: BlogPostSummary[];
}

const MAX_ITEMS = 6;

export default function AuthorPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const personaEntry = Object.entries(WRITER_PERSONAS).find(([, p]) => p.slug === slug);
  const personaId = personaEntry?.[0];
  const persona = personaEntry?.[1];

  const { data: reviewsData } = useQuery<ReviewSummary[]>({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/reviews");
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
    enabled: !!persona,
  });

  const { data: blogData } = useQuery<BlogIndexResponse>({
    queryKey: ["/api/blog"],
    queryFn: async () => {
      const res = await fetch("/api/blog");
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    },
    enabled: !!persona,
  });

  // Resolve `{{stat:KEY}}` tokens in verdict prose against each row's own
  // review_stats fields (the /api/reviews rows carry them) before render.
  const authoredReviews = reviewsData
    ? reviewsData
        .filter(r => r.authorPersonaId === personaId)
        .sort((a, b) => new Date(b.investigationDate).getTime() - new Date(a.investigationDate).getTime())
        .slice(0, MAX_ITEMS)
        .map(r => substituteStatTokensInReview(r))
    : [];

  const authoredPosts = blogData?.items
    ? blogData.items
        .filter(p => p.authorPersonaId === personaId)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, MAX_ITEMS)
    : [];

  const crumbs = [
    { label: "Home", href: `${BASE}/` },
    { label: "About", href: `${BASE}/about` },
    ...(persona ? [{ label: persona.name, href: `${BASE}/author/${slug}` }] : []),
  ];

  const canonicalUrl = `${BASE}/author/${slug}`;
  const pageTitle = persona
    ? `${persona.name} — ${persona.role} | CryptoKiller`
    : "Author Not Found | CryptoKiller";
  const pageDescription = persona?.fullBio?.slice(0, 160) || "Author profile on CryptoKiller.";

  const profilePageJsonLd = persona
    ? {
        "@type": "ProfilePage",
        "@id": canonicalUrl,
        url: canonicalUrl,
        name: `${persona.name}, ${persona.role}`,
        description: pageDescription,
        isPartOf: { "@id": WEBSITE_ID },
        mainEntity: { ...personNode(persona), description: persona.fullBio },
        ...(authoredReviews.length > 0 && {
          hasPart: authoredReviews.slice(0, 3).map(r => ({
            "@type": "Article",
            url: `${BASE}/review/${r.slug}`,
            name: `${r.platformName} Investigation`,
          })),
        }),
      }
    : undefined;

  usePageMeta({
    title: pageTitle,
    description: pageDescription,
    canonical: canonicalUrl,
    ogType: "profile",
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        breadcrumbJsonLd(crumbs),
        ...(profilePageJsonLd ? [profilePageJsonLd] : []),
      ],
    },
  });

  if (!persona) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
        <SiteHeader />
        <main className="container mx-auto px-4 py-16 max-w-4xl text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Author Not Found</h1>
          <p className="text-slate-400 mb-6">
            The analyst profile you're looking for doesn't exist.
          </p>
          <Link
            href="/about"
            className="text-red-400 hover:text-red-300 inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Meet the team
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-red-900 selection:text-white">
      <SiteHeader activeNav="about" />

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "About", href: "/about" },
            { label: persona.name },
          ]}
        />

        <div className="flex flex-col sm:flex-row items-start gap-8 mb-12 bg-slate-900/40 p-8 rounded-3xl border border-slate-800">
          <div className="shrink-0">
            <TeamAvatar
              persona={persona}
              className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-slate-800 shadow-xl"
              initialsClassName="text-3xl sm:text-4xl"
              priority
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-red-500 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
                    Team Profile
                  </span>
                  {persona.teamCategory && (
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      {persona.teamCategory}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-5xl font-black text-white mb-2 tracking-tight">
                  {persona.name}
                </h1>
                <p className="text-xl text-slate-400 font-medium">{persona.role}</p>
              </div>

              <div className="flex items-center gap-3">
                {(persona.linkedin || persona.sameAs?.find(url => url.includes("linkedin.com"))) && (
                  <a
                    href={persona.linkedin || persona.sameAs?.find(url => url.includes("linkedin.com"))}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 hover:bg-[#0A66C2] hover:text-white text-slate-400 transition-colors border border-slate-700"
                    aria-label={`${persona.name} LinkedIn`}
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                )}
                {persona.dexProfileUrl && (
                  <a
                    href={persona.dexProfileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors border border-slate-700 text-sm"
                  >
                    DEX source <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60 inline-block">
              <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Background highlights</p>
              <p className="text-sm text-slate-300 font-mono">{persona.credentials}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            ...(persona.published ? [{
              icon: <BookOpen className="h-5 w-5" />,
              color: "text-red-400",
              bg: "bg-red-500/10 border-red-900/30",
              stat: persona.published.split(" ")[0],
              label: "Public articles & guides",
            }] : []),
            ...(persona.yearsExperience ? [{
              icon: <Clock className="h-5 w-5" />,
              color: "text-amber-400",
              bg: "bg-amber-500/10 border-amber-900/30",
              stat: persona.yearsExperience,
              label: "Experience",
            }] : []),
            {
              icon: <Award className="h-5 w-5" />,
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-900/30",
              stat: `${persona.specialties.length}`,
              label: "Specialties",
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`text-center p-4 rounded-xl border ${item.bg}`}
            >
              <div className={`${item.color} flex justify-center mb-2`}>
                {item.icon}
              </div>
              <p className="text-xl font-black text-white mb-0.5">{item.stat}</p>
              <p className="text-slate-500 text-xs">{item.label}</p>
            </div>
          ))}
        </div>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Background</h2>
          <p className="text-slate-400 leading-relaxed text-base">
            {persona.fullBio}
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Areas of Expertise</h2>
          <div className="flex flex-wrap gap-2">
            {persona.specialties.map((s) => (
              <span
                key={s}
                className="text-sm text-slate-300 font-medium border border-slate-700/60 bg-slate-800/40 rounded-full px-4 py-1.5"
              >
                {s}
              </span>
            ))}
          </div>
        </section>

        {authoredReviews.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">
              Latest investigations by {persona.name}
            </h2>
            <ul className="space-y-2">
              {authoredReviews.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/review/${r.slug}`}
                    className="flex items-start gap-3 group bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-lg px-4 py-3 transition-colors"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-medium group-hover:text-red-400 transition-colors block truncate">
                        {r.platformName} Review
                      </span>
                      <span className="text-slate-500 text-xs">
                        Threat score: {r.threatScore}/100
                        {r.investigationDate && (
                          <> · {new Date(r.investigationDate).toLocaleDateString("en-US", { year: "numeric", month: "short" })}</>
                        )}
                      </span>
                    </div>
                    <span className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded ${
                      r.threatScore >= 80
                        ? "text-red-400 bg-red-950/60 border border-red-900/40"
                        : r.threatScore >= 50
                        ? "text-amber-400 bg-amber-950/60 border border-amber-900/40"
                        : "text-green-400 bg-green-950/60 border border-green-900/40"
                    }`}>
                      {r.verdict}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/investigations"
              className="inline-block mt-3 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
            >
              Browse all investigations →
            </Link>
          </section>
        )}

        {authoredPosts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-white mb-4">
              Recent articles by {persona.name}
            </h2>
            <ul className="space-y-2">
              {authoredPosts.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="flex items-start gap-3 group bg-slate-900/50 border border-slate-800 hover:border-slate-700 rounded-lg px-4 py-3 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-200 font-medium group-hover:text-red-400 transition-colors block truncate">
                        {p.headline || p.title}
                      </span>
                      {p.publishedAt && (
                        <span className="text-slate-500 text-xs">
                          {new Date(p.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/blog"
              className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              Read all articles →
            </Link>
          </section>
        )}

        {persona.dexProfileUrl && (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 mb-10">
            <h4 className="text-sm font-bold text-white mb-1">Source attribution</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Biography and background claims on this profile are summarized from the
              linked public DEX team source and are not presented as independently
              verified by CryptoKiller.
            </p>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Link
            href="/about"
            className="text-sm text-red-400 hover:text-red-300 font-semibold inline-flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Meet the full team
          </Link>
          <Link
            href="/blog"
            className="text-sm text-slate-400 hover:text-white font-semibold inline-flex items-center gap-1 transition-colors"
          >
            Read investigations
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
