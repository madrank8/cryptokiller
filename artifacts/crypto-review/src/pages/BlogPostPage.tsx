import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar, Clock, ArrowLeft, ExternalLink, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthorBox from "@/components/AuthorBox";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";

interface BlogPost {
  id: number;
  title: string;
  headline: string;
  slug: string;
  metaDescription: string;
  summary: string;
  fullArticle: string;
  contentType: string;
  sections: { heading: string; body: string }[];
  faq: { question: string; answer: string }[];
  internalLinks: { text: string; url: string }[];
  sources: { title: string; url: string }[];
  wordCount: number;
  status: string;
  topicTitle: string;
  targetKeyword: string;
  publishedAt: string;
  updatedAt: string;
  authorPersonaId: string | null;
}

const BASE = "https://cryptokiller.org";

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["/api/blog", slug],
    queryFn: async () => {
      const res = await fetch(`/api/blog/${slug}`);
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const crumbs = [
    { label: "Home", href: `${BASE}/` },
    { label: "Blog", href: `${BASE}/blog` },
    ...(post ? [{ label: post.title, href: `${BASE}/blog/${post.slug}` }] : []),
  ];

  usePageMeta({
    title: post ? `${post.title} | CryptoKiller` : "Blog | CryptoKiller",
    description: post?.metaDescription || post?.summary || "CryptoKiller blog — crypto safety insights and guides.",
    canonical: `${BASE}/blog/${slug}`,
    jsonLd: post
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.headline || post.title,
          description: post.metaDescription || post.summary,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: { "@type": "Organization", name: "CryptoKiller" },
          publisher: { "@type": "Organization", name: "CryptoKiller" },
          mainEntityOfPage: `${BASE}/blog/${slug}`,
          wordCount: post.wordCount,
          ...breadcrumbJsonLd(crumbs),
        }
      : { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) },
  });

  const readingMinutes = post ? Math.max(1, Math.ceil(post.wordCount / 250)) : 0;
  const publishedDate = post?.publishedAt ? new Date(post.publishedAt) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <SiteHeader activeNav="blog" />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Breadcrumbs items={crumbs} />

        {isLoading && (
          <div className="space-y-4 mt-8">
            <Skeleton className="h-10 w-3/4 bg-slate-800" />
            <Skeleton className="h-6 w-1/2 bg-slate-800" />
            <Skeleton className="h-64 w-full bg-slate-800" />
          </div>
        )}

        {error && (
          <div className="mt-8 text-center py-16">
            <h1 className="text-3xl font-bold text-white mb-4">Post Not Found</h1>
            <p className="text-slate-400 mb-6">The blog post you're looking for doesn't exist or hasn't been published yet.</p>
            <Link href="/" className="text-red-400 hover:text-red-300 inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        )}

        {post && (
          <article className="mt-6">
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-3">
                {post.headline || post.title}
              </h1>
              {post.summary && (
                <p className="text-lg text-slate-400 leading-relaxed mb-4">{post.summary}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                {publishedDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {publishedDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                )}
                {post.wordCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {readingMinutes} min read
                  </span>
                )}
                {post.wordCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    {post.wordCount.toLocaleString()} words
                  </span>
                )}
              </div>
            </header>

            <div className="border-t border-slate-800 pt-8">
              {Array.isArray(post.sections) && post.sections.length > 0 ? (
                <div className="space-y-8">
                  {post.sections.map((section, i) => (
                    <section key={i}>
                      {section.heading && (
                        <h2 className="text-xl font-bold text-white mb-3">{section.heading}</h2>
                      )}
                      <div
                        className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_a]:text-red-400 [&_a:hover]:text-red-300 [&_strong]:text-white [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2"
                        dangerouslySetInnerHTML={{ __html: section.body }}
                      />
                    </section>
                  ))}
                </div>
              ) : post.fullArticle ? (
                <div
                  className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-1 [&_a]:text-red-400 [&_a:hover]:text-red-300 [&_strong]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2"
                  dangerouslySetInnerHTML={{ __html: post.fullArticle }}
                />
              ) : null}
            </div>

            {(() => {
              const persona = post.authorPersonaId ? WRITER_PERSONAS[post.authorPersonaId] : undefined;
              return persona ? <AuthorBox {...persona} /> : <AuthorBox />;
            })()}

            {Array.isArray(post.faq) && post.faq.length > 0 && (
              <section className="mt-12 border-t border-slate-800 pt-8">
                <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {post.faq.map((item, i) => (
                    <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
                      <h3 className="text-white font-semibold mb-2">{item.question}</h3>
                      <p className="text-slate-400 leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {Array.isArray(post.sources) && post.sources.length > 0 && (
              <section className="mt-12 border-t border-slate-800 pt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Sources</h2>
                <ul className="space-y-2">
                  {post.sources.map((source, i) => (
                    <li key={i}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {source.title || source.url}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {Array.isArray(post.internalLinks) && post.internalLinks.length > 0 && (
              <section className="mt-8 bg-slate-900/50 border border-slate-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">Related Reading</h3>
                <ul className="space-y-2">
                  {post.internalLinks.map((link, i) => (
                    <li key={i}>
                      <Link href={link.url} className="text-red-400 hover:text-red-300 text-sm">
                        {link.text || link.url}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          </article>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
