import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar, Clock, BookOpen, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";

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
}

const BASE = "https://cryptokiller.org";

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

  usePageMeta({
    title: "Blog — Crypto Safety Insights & Guides | CryptoKiller",
    description: "Expert guides, analysis, and insights on crypto scams, fraud prevention, and digital asset safety from the CryptoKiller research team.",
    canonical: `${BASE}/blog`,
    jsonLd: { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) },
  });

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
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <Skeleton className="h-5 w-20 bg-slate-800 mb-3" />
                <Skeleton className="h-7 w-3/4 bg-slate-800 mb-2" />
                <Skeleton className="h-4 w-full bg-slate-800 mb-1" />
                <Skeleton className="h-4 w-2/3 bg-slate-800" />
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

        {posts && posts.length > 0 && (
          <div className="space-y-6">
            {posts.map(post => {
              const readMin = Math.max(1, Math.ceil(post.wordCount / 250));
              const date = post.publishedAt ? new Date(post.publishedAt) : null;
              return (
                <Link key={post.id} href={`/blog/${post.slug}`}>
                  <article className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 hover:border-slate-700 hover:bg-slate-900/80 transition-colors cursor-pointer">
                    {post.contentType && (
                      <span className="inline-block text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-900/30 rounded px-2 py-0.5 mb-3">
                        {post.contentType.replace(/_/g, " ")}
                      </span>
                    )}
                    <h2 className="text-xl font-bold text-white mb-2 group-hover:text-red-400">
                      {post.headline || post.title}
                    </h2>
                    {(post.summary || post.metaDescription) && (
                      <p className="text-slate-400 text-sm leading-relaxed mb-3 line-clamp-2">
                        {post.summary || post.metaDescription}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
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
                      {post.wordCount > 0 && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {post.wordCount.toLocaleString()} words
                        </span>
                      )}
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
