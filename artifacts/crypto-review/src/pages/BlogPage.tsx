import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar, Clock, BookOpen, FileText, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";
import { globalSiteSchema } from "@/lib/schemaBuilder";
import { useMemo } from "react";

interface BlogPostSummary {
  id: number;
  title: string;
  headline: string;
  slug: string;
  metaDescription: string;
  summary: string;
  contentType: string;
  wordCount: number;
  publishedAt: string;
  targetKeyword: string;
  authorPersonaId: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
}

const BASE = "https://cryptokiller.org";

const CONTENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  listicle: { label: "Listicle", color: "bg-amber-950/60 text-amber-400 border-amber-900/40" },
  pillar_page: { label: "In-Depth Guide", color: "bg-blue-950/60 text-blue-400 border-blue-900/40" },
  educational: { label: "Research", color: "bg-emerald-950/60 text-emerald-400 border-emerald-900/40" },
  how_to: { label: "How-To", color: "bg-purple-950/60 text-purple-400 border-purple-900/40" },
  case_study: { label: "Case Study", color: "bg-cyan-950/60 text-cyan-400 border-cyan-900/40" },
};

function ContentTypeBadge({ contentType }: { contentType: string }) {
  const info = CONTENT_TYPE_LABELS[contentType];
  if (!info) return null;
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider rounded px-1.5 py-0.5 border ${info.color}`}>
      {info.label}
    </span>
  );
}

function PostImage({ url, alt, className }: { url: string | null; alt: string | null; className?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={alt || "Article illustration"}
        loading="lazy"
        width={800}
        height={450}
        className={`object-cover w-full h-full ${className ?? ""}`}
      />
    );
  }
  return (
    <div className={`w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 flex items-center justify-center ${className ?? ""}`}>
      <div className="text-center">
        <FileText className="h-10 w-10 text-slate-700 mx-auto mb-2" />
        <span className="text-xs text-slate-700 uppercase tracking-wider font-semibold">CryptoKiller</span>
      </div>
    </div>
  );
}

function PostMeta({ post }: { post: BlogPostSummary }) {
  const readMin = Math.max(1, Math.ceil(post.wordCount / 250));
  const date = post.publishedAt ? new Date(post.publishedAt) : null;
  const persona = post.authorPersonaId ? WRITER_PERSONAS[post.authorPersonaId] : undefined;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
      {persona && (
        <span className="flex items-center gap-1">
          <User className="h-3.5 w-3.5" />
          {persona.name}
        </span>
      )}
      {date && (
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
        </span>
      )}
      {post.wordCount > 0 && (
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {readMin} min read
        </span>
      )}
    </div>
  );
}

function FeaturedPost({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="relative rounded-xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer group">
        <div className="aspect-[16/9] sm:aspect-[2/1] relative">
          <PostImage url={post.heroImageUrl} alt={post.heroImageAlt} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/60 border border-red-900/40 rounded px-2 py-0.5">
                Featured
              </span>
              <ContentTypeBadge contentType={post.contentType} />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors leading-tight">
              {post.headline || post.title}
            </h2>
            {(post.summary || post.metaDescription) && (
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-3 line-clamp-2 max-w-2xl">
                {post.summary || post.metaDescription}
              </p>
            )}
            <PostMeta post={post} />
          </div>
        </div>
      </article>
    </Link>
  );
}

function HorizontalPostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`}>
      <article className="flex gap-0 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 hover:bg-slate-900/80 transition-colors cursor-pointer group">
        <div className="w-48 sm:w-56 flex-shrink-0 relative">
          <PostImage url={post.heroImageUrl} alt={post.heroImageAlt} />
        </div>
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ContentTypeBadge contentType={post.contentType} />
          </div>
          <h2 className="text-lg font-bold text-white mb-1.5 group-hover:text-red-400 transition-colors line-clamp-2">
            {post.headline || post.title}
          </h2>
          {(post.summary || post.metaDescription) && (
            <p className="text-slate-400 text-sm leading-relaxed mb-2.5 line-clamp-2 hidden sm:block">
              {post.summary || post.metaDescription}
            </p>
          )}
          <PostMeta post={post} />
        </div>
      </article>
    </Link>
  );
}

export default function BlogPage() {
  const { data: posts, isLoading } = useQuery<BlogPostSummary[]>({
    queryKey: ["/api/blog"],
    queryFn: async () => {
      const res = await fetch("/api/blog");
      if (!res.ok) throw new Error("Failed to load posts");
      return res.json();
    },
  });

  const crumbs = [
    { label: "Home", href: `${BASE}/` },
    { label: "Blog", href: `${BASE}/blog` },
  ];

  const blogJsonLd = useMemo(() => {
    const globalGraph = ((globalSiteSchema()["@graph"] as Record<string, unknown>[] | undefined) ?? []);
    const graph: Record<string, unknown>[] = [
      ...globalGraph,
      {
        "@type": "CollectionPage",
        "@id": `${BASE}/blog#webpage`,
        name: "CryptoKiller Blog",
        description: "Expert guides, analysis, and insights on crypto scams, fraud prevention, and digital asset safety.",
        url: `${BASE}/blog`,
        isPartOf: { "@id": `${BASE}/#website` },
        publisher: { "@id": `${BASE}/#organization` },
      },
      breadcrumbJsonLd(crumbs),
    ];

    if (posts && posts.length > 0) {
      graph[0].mainEntity = {
        "@type": "ItemList",
        numberOfItems: posts.length,
        itemListElement: posts.slice(0, 10).map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE}/blog/${p.slug}`,
          name: p.headline || p.title,
        })),
      };
    }

    return { "@context": "https://schema.org", "@graph": graph };
  }, [posts, crumbs]);

  usePageMeta({
    title: "Blog — Crypto Safety Insights & Guides | CryptoKiller",
    description: "Expert guides, analysis, and insights on crypto scams, fraud prevention, and digital asset safety from the CryptoKiller research team.",
    canonical: `${BASE}/blog`,
    jsonLd: blogJsonLd,
  });

  const featured = posts?.[0];
  const rest = posts?.slice(1) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <SiteHeader activeNav="blog" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumbs items={crumbs} />

        <div className="mt-2 mb-10">
          <h1 className="text-4xl font-bold text-white mb-3">Blog</h1>
          <p className="text-slate-400 text-lg">
            Expert guides, analysis, and insights on crypto scams and digital asset safety.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-6">
            <div className="rounded-xl overflow-hidden border border-slate-800">
              <Skeleton className="aspect-[2/1] w-full bg-slate-800" />
            </div>
            {[1, 2].map(i => (
              <div key={i} className="flex gap-4 bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
                <Skeleton className="w-48 h-32 bg-slate-800 flex-shrink-0" />
                <div className="flex-1 p-5 space-y-2">
                  <Skeleton className="h-6 w-3/4 bg-slate-800" />
                  <Skeleton className="h-4 w-full bg-slate-800" />
                  <Skeleton className="h-3 w-1/2 bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && posts && posts.length === 0 && (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No posts yet</h2>
            <p className="text-slate-500">Check back soon for crypto safety guides and analysis.</p>
          </div>
        )}

        {featured && (
          <div className="space-y-6">
            <FeaturedPost post={featured} />

            {rest.length > 0 && (
              <div className="space-y-4">
                {rest.map(post => (
                  <HorizontalPostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
