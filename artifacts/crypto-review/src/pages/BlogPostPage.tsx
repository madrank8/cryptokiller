import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePageMeta } from "@/hooks/usePageMeta";
import { Calendar, Clock, ArrowLeft, ExternalLink, BookOpen, User, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthorBox from "@/components/AuthorBox";
import Breadcrumbs, { breadcrumbJsonLd } from "@/components/Breadcrumbs";
import { WRITER_PERSONAS } from "@/lib/writerPersonas";
import { BLOG_SCHEMA_MAP } from "@/lib/blogSchemaMap";
import { organizationNode, websiteNode, personNode, personRef, orgRef, websiteRef } from "@/lib/schemaBuilder";
import {
  resolveAbout,
  resolveMentions,
  buildCitations,
  buildClaimReviews,
  buildItemList,
  buildHowTo,
  buildDataset,
  buildQuotations,
  buildSpeakable,
  publisherLogoImage,
  heroImageNode,
} from "@/lib/blogSchemaEnrichment";
import { useState, useMemo } from "react";

interface VisualMetaItem {
  url?: string;
  altText?: string;
  succeeded?: boolean;
  type?: string;
}

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
  keyTakeaways: string | null;
  notForYou: string | null;
  wordCount: number;
  status: string;
  topicTitle: string;
  targetKeyword: string;
  publishedAt: string;
  updatedAt: string;
  authorPersonaId: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  visualMeta: VisualMetaItem[] | null;

  // Schema enrichment (v1) — see lib/db/src/schema/blog_posts.ts. All optional
  // on the wire; BlogPost defaults them in the jsonLd builder so old posts
  // without these fields render the base @graph.
  alternativeHeadline?: string | null;
  aboutSlugs?: string[] | null;
  mentionSlugs?: string[] | null;
  speakableSelectors?: string[] | null;
  citations?: unknown[] | null;
  dataset?: unknown;
  itemList?: unknown;
  howTo?: unknown;
  quotes?: unknown[] | null;
  claims?: unknown[] | null;
}

const BASE = "https://cryptokiller.org";

const PROSE_CLASSES = `prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed
  [&_p]:mb-4 [&_p]:text-base [&_p]:leading-7
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4
  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4
  [&_li]:mb-1.5 [&_li]:leading-7
  [&_a]:text-red-400 [&_a:hover]:text-red-300 [&_a]:underline [&_a]:underline-offset-2
  [&_strong]:text-white [&_strong]:font-semibold
  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-10 [&_h2]:mb-4
  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-6 [&_h3]:mb-3
  [&_blockquote]:border-l-2 [&_blockquote]:border-red-500/50 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-400
  [&_blockquote.ck-expert-quote]:border-l-amber-500/60 [&_blockquote.ck-expert-quote]:text-slate-300
  [&_blockquote.ck-social-proof]:border-l-indigo-500/60 [&_blockquote.ck-social-proof]:text-slate-300 [&_blockquote.ck-social-proof]:not-italic
  [&_cite]:block [&_cite]:mt-2 [&_cite]:text-sm [&_cite]:text-slate-500 [&_cite]:not-italic
  [&_figure]:my-8 [&_figure]:rounded-xl [&_figure]:overflow-hidden [&_figure]:border [&_figure]:border-slate-800
  [&_figure_img]:w-full [&_figure_img]:object-contain [&_figure_img]:bg-slate-900
  [&_figcaption]:text-xs [&_figcaption]:text-slate-500 [&_figcaption]:px-4 [&_figcaption]:py-2.5 [&_figcaption]:bg-slate-900/80 [&_figcaption]:italic
  [&_img:not(figure_img)]:rounded-xl [&_img:not(figure_img)]:border [&_img:not(figure_img)]:border-slate-800 [&_img:not(figure_img)]:my-6
  [&_table]:w-full [&_table]:border-collapse [&_table]:my-6
  [&_th]:text-left [&_th]:text-white [&_th]:text-sm [&_th]:font-semibold [&_th]:border-b [&_th]:border-slate-700 [&_th]:pb-2 [&_th]:pr-4
  [&_td]:text-sm [&_td]:py-2 [&_td]:pr-4 [&_td]:border-b [&_td]:border-slate-800/50
  [&_.ck-key-takeaways_h2]:text-lg [&_.ck-key-takeaways_h2]:font-semibold [&_.ck-key-takeaways_h2]:text-red-400 [&_.ck-key-takeaways_h2]:mt-0 [&_.ck-key-takeaways_h2]:mb-3
  [&_.ck-key-takeaways_li]:text-sm
  [&_.ck-callout_strong]:block [&_.ck-callout_strong]:mb-1
  [&_.ck-callout--warning_strong]:text-red-300
  [&_.ck-callout--tip_strong]:text-emerald-300
  [&_.ck-not-for-you_h2]:text-base [&_.ck-not-for-you_h2]:text-slate-400 [&_.ck-not-for-you_h2]:mt-0 [&_.ck-not-for-you_h2]:mb-2
  [&_.ck-not-for-you_p]:text-sm [&_.ck-not-for-you_p]:text-slate-500
  [&_details]:bg-slate-900/50 [&_details]:border [&_details]:border-slate-800 [&_details]:rounded-lg [&_details]:my-3
  [&_summary]:p-4 [&_summary]:cursor-pointer [&_summary]:text-white [&_summary]:font-semibold
  [&_details>p]:px-4 [&_details>p]:pb-4 [&_details>p]:text-slate-400`;

function isUsableHeroUrl(url: string): boolean {
  if (/oaidalleapiprodscus\.blob\.core\.windows\.net/.test(url)) return false;
  if (/quickchart\.io/.test(url)) return false;
  if (/mermaid\.ink/.test(url)) return false;
  return true;
}

function resolveHeroImage(post: BlogPost): { url: string | null; alt: string | null } {
  if (post.heroImageUrl && isUsableHeroUrl(post.heroImageUrl)) return { url: post.heroImageUrl, alt: post.heroImageAlt };
  const items = Array.isArray(post.visualMeta) ? post.visualMeta : [];
  const usable = items.filter(v => v.url && isUsableHeroUrl(v.url));
  const best = usable.find(v => v.succeeded !== false) ?? usable.find(v => !!v.url);
  return { url: best?.url ?? null, alt: best?.altText ?? null };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function TableOfContents({ sections }: { sections: { heading: string }[] }) {
  const [open, setOpen] = useState(true);
  if (sections.length < 3) return null;
  return (
    <nav className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 mb-10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white font-semibold text-sm uppercase tracking-wider w-full"
      >
        <List className="h-4 w-4 text-red-400" />
        Table of Contents
        <span className="ml-auto text-slate-500 text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ol className="mt-4 space-y-2 list-decimal list-inside text-sm">
          {sections.map((s, i) => (
            <li key={i}>
              <a
                href={`#${slugify(s.heading)}`}
                className="text-slate-400 hover:text-red-400 transition-colors"
              >
                {s.heading}
              </a>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}

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

  const heroImage = useMemo(() => post ? resolveHeroImage(post) : null, [post]);
  const persona = post?.authorPersonaId ? WRITER_PERSONAS[post.authorPersonaId] : undefined;

  const jsonLd = useMemo(() => {
    if (!post) return { "@context": "https://schema.org", ...breadcrumbJsonLd(crumbs) };

    const curatedSchema = slug ? BLOG_SCHEMA_MAP[slug] : undefined;
    if (curatedSchema) return curatedSchema as Record<string, unknown>;

    const pageUrl = `${BASE}/blog/${slug}`;

    // Enrichment nodes — see artifacts/crypto-review/src/lib/blogSchemaEnrichment.ts.
    // Mirrors the SSR @graph built in server/prerender.ts::renderBlogPost so the
    // hydrated DOM matches what Googlebot sees pre-JS.
    const aboutNodes     = resolveAbout(post.aboutSlugs);
    const mentionNodes   = resolveMentions(post.mentionSlugs);
    const citationNodes  = buildCitations(post.citations);
    const claimNodes     = buildClaimReviews(post.claims, pageUrl, persona?.name);
    const itemListNode   = buildItemList(post.itemList, pageUrl);
    const howToNode      = buildHowTo(post.howTo, pageUrl);
    const datasetNode    = buildDataset(post.dataset);
    const quotationNodes = buildQuotations(post.quotes);

    // Upgrade the base organization.logo to a full ImageObject (Rich Results).
    const orgLogo = publisherLogoImage();
    const orgNode = { ...organizationNode(), logo: { "@id": `${BASE}/#organization-logo` } };

    const graph: Record<string, unknown>[] = [
      orgNode,
      orgLogo,
      websiteNode(),
    ];

    if (persona) {
      graph.push(personNode(persona));
    }

    graph.push({
      "@type": "WebPage",
      "@id": `${pageUrl}/#webpage`,
      url: pageUrl,
      name: post.headline || post.title,
      isPartOf: websiteRef(),
      inLanguage: "en",
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
    });

    graph.push(breadcrumbJsonLd(crumbs));

    const articleSchema: Record<string, unknown> = {
      "@type": "BlogPosting",
      "@id": `${pageUrl}/#article`,
      headline: post.headline || post.title,
      ...(post.alternativeHeadline ? { alternativeHeadline: post.alternativeHeadline } : {}),
      description: post.metaDescription || post.summary,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt,
      author: persona ? personRef(persona) : orgRef(),
      publisher: orgRef(),
      mainEntityOfPage: { "@id": `${pageUrl}/#webpage` },
      wordCount: post.wordCount,
      inLanguage: "en",
      articleSection: post.contentType || "Crypto Scam Investigation",
      ...(post.targetKeyword ? { keywords: post.targetKeyword } : {}),
      ...(heroImage?.url ? { image: heroImageNode(heroImage.url, heroImage.alt) } : {}),
      ...(aboutNodes.length ? { about: aboutNodes } : {}),
      ...(mentionNodes.length ? { mentions: mentionNodes } : {}),
      ...(citationNodes.length ? { citation: citationNodes } : {}),
      speakable: buildSpeakable(post.speakableSelectors),
    };
    graph.push(articleSchema);

    if (Array.isArray(post.faq) && post.faq.length > 0) {
      graph.push({
        "@type": "FAQPage",
        "@id": `${pageUrl}/#faq`,
        mainEntity: post.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      });
    }

    for (const claim of claimNodes) graph.push(claim);
    if (itemListNode) graph.push(itemListNode);
    if (howToNode) graph.push(howToNode);
    if (datasetNode) graph.push(datasetNode);
    for (const quote of quotationNodes) graph.push(quote);

    return { "@context": "https://schema.org", "@graph": graph };
  }, [post, persona, heroImage, slug, crumbs]);

  usePageMeta({
    title: post ? `${post.title} | CryptoKiller` : "Blog | CryptoKiller",
    description: post?.metaDescription || post?.summary || "CryptoKiller blog — crypto safety insights and guides.",
    canonical: `${BASE}/blog/${slug}`,
    ogImage: heroImage?.url ?? undefined,
    jsonLd,
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
            <Skeleton className="aspect-[2/1] w-full bg-slate-800 rounded-xl" />
            <Skeleton className="h-64 w-full bg-slate-800" />
          </div>
        )}

        {error && (
          <div className="mt-8 text-center py-16">
            <h1 className="text-3xl font-bold text-white mb-4">Post Not Found</h1>
            <p className="text-slate-400 mb-6">The blog post you're looking for doesn't exist or hasn't been published yet.</p>
            <Link href="/blog" className="text-red-400 hover:text-red-300 inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </div>
        )}

        {post && (
          <article className="mt-6">
            <header className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mb-4">
                {post.headline || post.title}
              </h1>
              {post.summary && (
                <p className="text-lg text-slate-400 leading-relaxed mb-5">{post.summary}</p>
              )}

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500 mb-6">
                {persona && (
                  <span className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span className="text-slate-300">{persona.name}</span>
                    <span className="text-slate-600">·</span>
                    <span>{persona.role}</span>
                  </span>
                )}
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

              {heroImage?.url && (
                <figure className="rounded-xl overflow-hidden border border-slate-800 mb-2">
                  <img
                    src={heroImage.url}
                    alt={heroImage.alt || post.headline || post.title}
                    width={1200}
                    height={480}
                    className="w-full object-cover max-h-[480px]"
                  />
                  {heroImage.alt && (
                    <figcaption className="text-xs text-slate-500 px-4 py-2.5 bg-slate-900/80 italic">
                      {heroImage.alt}
                    </figcaption>
                  )}
                </figure>
              )}
            </header>

            <div className="border-t border-slate-800 pt-8">
              {Array.isArray(post.sections) && post.sections.length > 0 ? (
                <>
                  <TableOfContents sections={post.sections.filter(s => s.heading)} />

                  {post.keyTakeaways && (
                    <div
                      className={`mb-10 ${PROSE_CLASSES}`}
                      dangerouslySetInnerHTML={{ __html: post.keyTakeaways }}
                    />
                  )}

                  <div className="space-y-12">
                    {post.sections.map((section, i) => (
                      <section key={i} id={section.heading ? slugify(section.heading) : undefined}>
                        {section.heading && (
                          <h2 className="text-2xl font-bold text-white mb-4 scroll-mt-24">{section.heading}</h2>
                        )}
                        <div
                          className={PROSE_CLASSES}
                          dangerouslySetInnerHTML={{ __html: section.body }}
                        />
                      </section>
                    ))}
                  </div>

                  {post.notForYou && (
                    <div
                      className={`mt-12 ${PROSE_CLASSES}`}
                      dangerouslySetInnerHTML={{ __html: post.notForYou }}
                    />
                  )}
                </>
              ) : post.fullArticle ? (
                <div
                  className={PROSE_CLASSES}
                  dangerouslySetInnerHTML={{ __html: post.fullArticle }}
                />
              ) : null}
            </div>

            <div className="mt-12 border-t border-slate-800 pt-8">
              <AuthorBox {...(persona || {})} />
            </div>

            {Array.isArray(post.faq) && post.faq.length > 0 && (
              <section className="mt-12 border-t border-slate-800 pt-8">
                <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-4">
                  {post.faq.map((item, i) => (
                    <details key={i} className="group bg-slate-900/50 border border-slate-800 rounded-lg">
                      <summary className="p-5 cursor-pointer text-white font-semibold flex items-center justify-between list-none">
                        {item.question}
                        <span className="text-slate-500 group-open:rotate-180 transition-transform ml-3 flex-shrink-0">▾</span>
                      </summary>
                      <div className="px-5 pb-5 -mt-1">
                        <p className="text-slate-400 leading-relaxed">{item.answer}</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {Array.isArray(post.sources) && post.sources.length > 0 && (
              <section className="mt-12 border-t border-slate-800 pt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Sources</h2>
                <ul className="space-y-2">
                  {post.sources.map((source, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-600 text-sm font-mono mt-0.5 w-5 flex-shrink-0 text-right">{i + 1}.</span>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-400 hover:text-red-300 inline-flex items-center gap-1.5 text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
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
