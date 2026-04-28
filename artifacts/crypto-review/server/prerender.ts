import { eq, and, desc, sql, asc } from "drizzle-orm";
import {
  db,
  reviewsTable,
  blogPostsTable,
  platformsTable,
  reviewStatsTable,
  redFlagsTable,
  faqItemsTable,
  keyFindingsTable,
  funnelStagesTable,
} from "@workspace/db";
import { WRITER_PERSONAS, type WriterPersona } from "../src/lib/writerPersonas.js";
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
} from "../src/lib/blogSchemaEnrichment.js";
import { resolveReviewTier, type TierInfo } from "../src/lib/reviewTier.js";
import { buildItemReviewedJsonLdNode } from "../src/lib/reviewItemReviewedSchema.js";

const BASE = "https://cryptokiller.org";
const DEFAULT_OG_IMAGE = `${BASE}/opengraph.jpg`;
const ORG_ID = `${BASE}/#organization`;
const WEBSITE_ID = `${BASE}/#website`;
const LEGAL_ENTITY_ID = `${BASE}/#legal-entity`;

// Review tier resolution lives in src/lib/reviewTier.ts (shared with client
// JSON-LD). Keep thresholds in lockstep with Vercel lib/threat-score.js.

// Title headline label. For confirmed/high tiers we ship "Scam Review"
// (the aggressive variant Google has been indexing for high-score brands);
// for elevated/watchlist/low we ship "Investigation" which matches the
// hedged investigative voice PR4 on the Vercel side enforces in the body.
function reviewHeadlineLabel(tier: TierInfo): string {
  return tier.frameAsScam ? "Scam Review" : "Investigation";
}

// Tier → star-rating polarity. Mirrors lib/review-schema.js resolveReviewRating
// on the Vercel side. Confirmed/high → 1 star, elevated → 2, watchlist → 3.
// low tier returns null — we do NOT ship a star rating on low-signal reviews
// because Google's Rich Results renders reviewRating as actual stars, and an
// inverted rating on a hedged review is worse than no rating.
function reviewRatingForTier(tier: TierInfo): { value: number; explanation: string } | null {
  switch (tier.tier) {
    case "confirmed": return { value: 1, explanation: "Confirmed scam. Avoid all contact." };
    case "high":      return { value: 1, explanation: "Very high risk. Evidence of fraudulent activity." };
    case "elevated":  return { value: 2, explanation: "Multiple serious red flags. Exercise extreme caution." };
    case "watchlist": return { value: 3, explanation: "Under investigation. Verify before depositing." };
    case "low":       return null;
  }
}

// Whitelist of schema.org @types accepted for itemReviewed. Anything outside
// this set falls back to "Thing". Mirrors lib/review-schema.js on the Vercel
// side. Brand.entity_type isn't persisted on the Replit side yet, so for now
// the review prerender uses the default "Thing" when the writer hasn't
// included one on the row — this is better than the previous hardcoded
// "Service" + "Crypto trading platform" description which misrepresented
// every non-crypto scam.
const VALID_ENTITY_TYPES = new Set([
  "Product",
  "Service",
  "SoftwareApplication",
  "MobileApplication",
  "FinancialProduct",
  "InvestmentFund",
  "RealEstateAgent",
  "LocalBusiness",
  "Organization",
  "WebSite",
  "Thing",
]);

function resolveItemReviewedType(entityType: unknown): string {
  if (typeof entityType === "string" && VALID_ENTITY_TYPES.has(entityType)) {
    return entityType;
  }
  return "Thing";
}

export interface RenderResult {
  status: number;
  title: string;
  description: string;
  canonical: string;
  ogType: string;
  ogImage: string;
  robots?: string;
  bodyHtml: string;
  jsonLd?: Record<string, unknown>;
  lastModified?: string;
  prevPage?: string;
  nextPage?: string;
}

function esc(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(s: string, max: number): string {
  const plain = s.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max - 1).trimEnd() + "…";
}

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function organizationSameAs(): string[] {
  const envUrls = [
    process.env.CRYPTOKILLER_LINKEDIN_URL,
    process.env.CRYPTOKILLER_TWITTER_URL,
    process.env.CRYPTOKILLER_CRUNCHBASE_URL,
    process.env.CRYPTOKILLER_GITHUB_URL,
    process.env.CRYPTOKILLER_WIKIDATA_URL,
  ]
    .map((u) => clean(u))
    .filter((u) => u.startsWith("https://"));

  if (envUrls.length > 0) return envUrls;

  // Fallback keeps Organization.sameAs populated when env propagation
  // lags between Vercel/Replit; use only canonical profiles.
  return [
    "https://www.linkedin.com/company/cryptokiller/",
    "https://twitter.com/cryptokiller_org",
    "https://www.crunchbase.com/organization/cryptokiller",
    "https://github.com/madrank8",
  ];
}

function organizationNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "CryptoKiller",
    url: BASE,
    logo: `${BASE}/logo.png`,
    description:
      "Independent crypto scam investigation platform that tracks 22,000+ brands across 84+ countries with evidence-based threat scores.",
    parentOrganization: { "@id": LEGAL_ENTITY_ID },
    email: "corrections@cryptokiller.org",
    areaServed: "Worldwide",
    sameAs: organizationSameAs(),
  };
}

function websiteNode(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: BASE,
    name: "CryptoKiller",
    publisher: { "@id": ORG_ID },
    inLanguage: "en",
    // Sitelinks Search Box — Google's on-SERP search affordance. The
    // urlTemplate must resolve to an actual searchable page (investigations
    // listing supports ?q=). Harmless if no rich result unlocks; required
    // for Search Box eligibility when Google decides to render one.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE}/investigations?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

function legalEntityNode(): Record<string, unknown> {
  return {
    "@type": "Organization",
    "@id": LEGAL_ENTITY_ID,
    name: "DEX Algo Technologies Pte Ltd.",
    legalName: "DEX Algo Technologies Pte Ltd.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "SG",
      addressLocality: "Singapore",
    },
  };
}

function breadcrumbList(items: { label: string; href: string }[]): Record<string, unknown> {
  // @id anchors the BreadcrumbList to its terminal page for entity graph
  // cross-referencing. Skip when items is empty or the terminal href is
  // missing — an undefined @id is worse than absence.
  const terminal = items.length ? items[items.length - 1].href : undefined;
  return {
    "@type": "BreadcrumbList",
    ...(terminal ? { "@id": `${terminal}#breadcrumbs` } : {}),
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: it.href,
    })),
  };
}

/**
 * Build a full schema.org/Person node for an author persona.
 * Used as an entity graph node (not a reference). The Review node
 * references this via `author: { "@id": ... }`.
 *
 * YMYL E-E-A-T: every scam review is YMYL per Google QRG 2024, which
 * explicitly requires personal authorship signals. Organization-only
 * authors suppress rich results and reduce E-E-A-T trust score.
 */
function personNode(persona: WriterPersona): Record<string, unknown> {
  const slugId = persona.slug;
  return {
    "@type": "Person",
    "@id": `${BASE}/author/${slugId}#person`,
    name: persona.name,
    url: `${BASE}/author/${slugId}`,
    jobTitle: persona.role,
    description: persona.bio,
    worksFor: { "@id": ORG_ID },
    memberOf: { "@id": ORG_ID },
    knowsAbout: persona.specialties,
    ...(persona.sameAs && persona.sameAs.length ? { sameAs: persona.sameAs } : {}),
    ...(persona.credentials
      ? {
          hasCredential: {
            "@type": "EducationalOccupationalCredential",
            credentialCategory: "Professional Experience",
            description: persona.credentials,
          },
        }
      : {}),
  };
}

/**
 * Resolve authorPersonaId from the review row into a Person reference plus
 * the full Person node to append to the @graph. Always returns both — the
 * reference goes on the Review node's `author` field, the full node goes as
 * a sibling in the top-level @graph.
 *
 * Falls back to the 'webb' persona when the row doesn't have a valid
 * persona id (older reviews pre-migration). Never emits an Organization
 * author — organizational authorship on YMYL content suppresses rich
 * results.
 */
function resolveAuthorPersona(personaId: string | null | undefined): {
  ref: Record<string, unknown>;
  node: Record<string, unknown>;
} {
  const id = typeof personaId === "string" && WRITER_PERSONAS[personaId]
    ? personaId
    : "webb";
  const persona = WRITER_PERSONAS[id];
  const node = personNode(persona);
  const ref = { "@id": `${BASE}/author/${persona.slug}#person` };
  return { ref, node };
}

function siteHeaderHtml(): string {
  return `<header role="banner"><nav aria-label="Primary"><a href="/">CryptoKiller</a> · <a href="/investigations">Investigations</a> · <a href="/blog">Blog</a> · <a href="/methodology">Methodology</a> · <a href="/recovery">Recovery</a> · <a href="/report">Report a Scam</a> · <a href="/about">About</a></nav></header>`;
}

function siteFooterHtml(): string {
  return `<footer role="contentinfo"><p>CryptoKiller is operated by DEX Algo Technologies Pte Ltd. (Singapore). <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="mailto:corrections@cryptokiller.org">Editorial corrections</a></p></footer>`;
}

interface StaticSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

interface StaticFaq {
  question: string;
  answer: string;
}

interface StaticPageInput {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections?: StaticSection[];
  faq?: StaticFaq[];
  ogType?: string;
  jsonLd?: Record<string, unknown>;
}

function renderStaticPage(p: StaticPageInput): RenderResult {
  const canonical = `${BASE}${p.path === "/" ? "/" : p.path.replace(/\/+$/, "")}`;

  const sectionsHtml = (p.sections ?? [])
    .map((s) => {
      const paras = s.paragraphs.map((para) => `<p>${esc(para)}</p>`).join("");
      const list = s.list && s.list.length
        ? `<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`
        : "";
      return `<section><h2>${esc(s.heading)}</h2>${paras}${list}</section>`;
    })
    .join("");

  const faqHtml = p.faq && p.faq.length
    ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently Asked Questions</h2>${p.faq
        .map(
          (f) =>
            `<div><h3>${esc(f.question)}</h3><p>${esc(f.answer)}</p></div>`,
        )
        .join("")}</section>`
    : "";

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · ${esc(p.h1)}</nav>
<article>
<h1>${esc(p.h1)}</h1>
<p>${esc(p.intro)}</p>
${sectionsHtml}
${faqHtml}
<p><a href="/">Back to home</a> · <a href="/investigations">Browse investigations</a> · <a href="/blog">Read the blog</a></p>
</article>
</main>${siteFooterHtml()}`;

  const baseGraph: Record<string, unknown>[] = [
    legalEntityNode(),
    organizationNode(),
    websiteNode(),
    breadcrumbList([
      { label: "Home", href: `${BASE}/` },
      { label: p.h1, href: canonical },
    ]),
    {
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: p.title,
      description: p.description,
      isPartOf: { "@id": WEBSITE_ID },
      inLanguage: "en",
    },
  ];

  if (p.faq && p.faq.length) {
    baseGraph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      inLanguage: "en",
      mainEntity: p.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  return {
    status: 200,
    title: p.title,
    description: p.description,
    canonical,
    ogType: p.ogType ?? "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    jsonLd: p.jsonLd ?? {
      "@context": "https://schema.org",
      "@graph": baseGraph,
    },
  };
}

async function renderHome(): Promise<RenderResult> {
  const [{ count: reviewCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable)
    .where(eq(reviewsTable.status, "published"));

  const recent = await db
    .select({
      slug: reviewsTable.slug,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      platformName: platformsTable.name,
      updatedAt: reviewsTable.updatedAt,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .where(eq(reviewsTable.status, "published"))
    .orderBy(desc(reviewsTable.updatedAt))
    .limit(8);

  const lastModified = recent[0]?.updatedAt
    ? new Date(recent[0].updatedAt).toUTCString()
    : undefined;

  const title = "CryptoKiller — Crypto Scam Checker & Investigations";
  const description =
    "Check any crypto platform before investing. CryptoKiller tracks 1,000+ scam brands — pig butchering, rug pulls, phishing — with evidence and threat scores.";

  const recentList = recent
    .map(
      (r) =>
        `<li><a href="/review/${esc(r.slug)}">${esc(r.platformName)}</a> — Threat ${r.threatScore}/100. ${esc(truncate(r.verdict || "Confirmed scam", 140))}</li>`,
    )
    .join("");

  const bodyHtml = `${siteHeaderHtml()}<main>
<h1>Don't Get Scammed — Check Any Crypto Platform Before You Invest</h1>
<p>CryptoKiller is an independent crypto scam intelligence platform. We currently track <strong>${reviewCount.toLocaleString()} published investigations</strong> across pig butchering, rug pulls, phishing, fake exchanges, AI trading bot scams, and deepfake celebrity endorsement schemes.</p>
<h2>How CryptoKiller works</h2>
<p>Each investigation combines real-time ad surveillance, blockchain forensics, and OSINT to produce an evidence-based threat score from 0 to 100. Every score is auditable and links to the underlying ad creatives, registration patterns, and red flags.</p>
<h2>Recently published investigations</h2>
<ul>${recentList}</ul>
<p><a href="/investigations">Browse all investigations</a> · <a href="/methodology">Read our methodology</a> · <a href="/report">Report a scam</a></p>
</main>${siteFooterHtml()}`;

  return {
    status: 200,
    title,
    description,
    canonical: `${BASE}/`,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    lastModified,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        {
          ...websiteNode(),
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${BASE}/investigations?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        },
        {
          "@type": "WebPage",
          "@id": `${BASE}/#webpage`,
          url: `${BASE}/`,
          name: title,
          description,
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
      ],
    },
  };
}

async function renderInvestigationsList(query: URLSearchParams): Promise<RenderResult> {
  const pageNum = Math.max(1, Number(query.get("page")) || 1);
  const PER_PAGE = 20;
  const offset = (pageNum - 1) * PER_PAGE;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reviewsTable)
    .where(eq(reviewsTable.status, "published"));

  const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
  const clampedPage = Math.min(pageNum, totalPages);

  const rows = await db
    .select({
      slug: reviewsTable.slug,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      platformName: platformsTable.name,
      updatedAt: reviewsTable.updatedAt,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .where(eq(reviewsTable.status, "published"))
    .orderBy(desc(reviewsTable.updatedAt))
    .limit(PER_PAGE)
    .offset((clampedPage - 1) * PER_PAGE);

  const title =
    clampedPage > 1
      ? `Crypto Scam Investigations — Page ${clampedPage} | CryptoKiller`
      : "Crypto Scam Investigations — 1,000+ Platforms | CryptoKiller";
  const description =
    "Browse all active crypto scam investigations. Filter by threat level, sort by threat score, and search 1,000+ tracked platforms with evidence-based reviews.";

  const canonical = clampedPage > 1 ? `${BASE}/investigations?page=${clampedPage}` : `${BASE}/investigations`;

  const lastModified = rows[0]?.updatedAt ? new Date(rows[0].updatedAt).toUTCString() : undefined;

  const itemsHtml = rows
    .map(
      (r) =>
        `<li><h3><a href="/review/${esc(r.slug)}">${esc(r.platformName)} Scam Review</a></h3><p>Threat score ${r.threatScore}/100. ${esc(truncate(r.verdict || "Confirmed scam", 200))}</p></li>`,
    )
    .join("");

  const prevPage = clampedPage > 1 ? `${BASE}/investigations${clampedPage - 1 > 1 ? `?page=${clampedPage - 1}` : ""}` : undefined;
  const nextPage = clampedPage < totalPages ? `${BASE}/investigations?page=${clampedPage + 1}` : undefined;

  const bodyHtml = `${siteHeaderHtml()}<main>
<h1>Crypto Scam Investigations</h1>
<p>${count.toLocaleString()} published investigations. Showing page ${clampedPage} of ${totalPages}.</p>
<ol start="${(clampedPage - 1) * PER_PAGE + 1}">${itemsHtml}</ol>
<nav aria-label="Pagination">${prevPage ? `<a rel="prev" href="${esc(prevPage)}">Previous</a> · ` : ""}${nextPage ? `<a rel="next" href="${esc(nextPage)}">Next</a>` : ""}</nav>
</main>${siteFooterHtml()}`;

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    lastModified,
    prevPage,
    nextPage,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        websiteNode(),
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: "Investigations", href: `${BASE}/investigations` },
        ]),
        {
          "@type": "CollectionPage",
          "@id": `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
      ],
    },
  };
}

async function renderBlogList(): Promise<RenderResult> {
  const rows = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      headline: blogPostsTable.headline,
      summary: blogPostsTable.summary,
      metaDescription: blogPostsTable.metaDescription,
      updatedAt: blogPostsTable.updatedAt,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"))
    .orderBy(desc(blogPostsTable.updatedAt))
    .limit(50);

  const title = "Blog — Crypto Safety Insights & Guides | CryptoKiller";
  const description =
    "Expert guides, analysis, and insights on crypto scams, fraud prevention, and digital asset safety from the CryptoKiller research team.";

  const lastModified = rows[0]?.updatedAt ? new Date(rows[0].updatedAt).toUTCString() : undefined;

  const itemsHtml = rows
    .map(
      (b) =>
        `<li><h3><a href="/blog/${esc(b.slug)}">${esc(b.headline || b.title)}</a></h3><p>${esc(truncate(b.metaDescription || b.summary || "", 220))}</p></li>`,
    )
    .join("");

  const bodyHtml = `${siteHeaderHtml()}<main>
<h1>CryptoKiller Blog — Crypto Safety Insights & Guides</h1>
<p>${description}</p>
<ul>${itemsHtml}</ul>
</main>${siteFooterHtml()}`;

  return {
    status: 200,
    title,
    description,
    canonical: `${BASE}/blog`,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    lastModified,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        websiteNode(),
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: "Blog", href: `${BASE}/blog` },
        ]),
        {
          "@type": "CollectionPage",
          "@id": `${BASE}/blog#webpage`,
          url: `${BASE}/blog`,
          name: title,
          description,
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
      ],
    },
  };
}

/** First 10 chars of an ISO date for Dataset.temporalCoverage intervals. */
function toDatasetIsoDay(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string" && v.trim()) return v.trim().slice(0, 10);
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  return null;
}

/**
 * Writer/sync-persisted `reviews.dataset` JSON can drift from `review_stats`
 * after re-syncs. Reconcile Dataset name, description, and temporalCoverage at
 * SSR time so JSON-LD matches live sidebar / full_article stats.
 */
function datasetJsonAlignedWithReviewStats(
  dataset: unknown,
  params: {
    platformName: string;
    adCreatives: number | null | undefined;
    countriesTargeted: number | null | undefined;
    daysActive: number | null | undefined;
    firstDetected: string | null | undefined;
    lastActive: string | null | undefined;
  },
): unknown {
  if (!dataset || typeof dataset !== "object") return dataset;
  const d = { ...(dataset as Record<string, unknown>) };
  const name = params.platformName.trim() || "this platform";
  d.name = `SpyOwl ${name} Scam Intelligence Dataset`;
  const ads = Number(params.adCreatives ?? 0) || 0;
  const countries = Number(params.countriesTargeted ?? 0) || 0;
  const days = Number(params.daysActive ?? 0) || 0;
  if (ads > 0 || countries > 0 || days > 0) {
    d.description =
      `SpyOwl surveillance dataset for ${name}: ${ads} ad creatives across ${countries} countries over ${days} days.`;
  }
  const start = toDatasetIsoDay(params.firstDetected);
  const end = toDatasetIsoDay(params.lastActive);
  if (start && end) {
    d.temporalCoverage = `${start}/${end}`;
  } else if (start) {
    d.temporalCoverage = start;
  }
  return d;
}

async function renderReview(slug: string): Promise<RenderResult> {
  const [row] = await db
    .select({
      id: reviewsTable.id,
      slug: reviewsTable.slug,
      status: reviewsTable.status,
      threatScore: reviewsTable.threatScore,
      verdict: reviewsTable.verdict,
      summary: reviewsTable.summary,
      heroDescription: reviewsTable.heroDescription,
      warningCallout: reviewsTable.warningCallout,
      methodologyText: reviewsTable.methodologyText,
      disclaimerText: reviewsTable.disclaimerText,
      metaDescription: reviewsTable.metaDescription,
      wordCount: reviewsTable.wordCount,
      readingMinutes: reviewsTable.readingMinutes,
      author: reviewsTable.author,
      investigationDate: reviewsTable.investigationDate,
      updatedAt: reviewsTable.updatedAt,
      // Rich-content columns (migration 0002). Select them alongside the
      // existing scalar review fields so the SSR can render hero image,
      // inline images, sources, protection steps, "not for you", and
      // expertise-depth sections without extra round-trips.
      heroImageUrl: reviewsTable.heroImageUrl,
      heroImageAlt: reviewsTable.heroImageAlt,
      contentImages: reviewsTable.contentImages,
      visualMeta: reviewsTable.visualMeta,
      protectionSteps: reviewsTable.protectionSteps,
      sources: reviewsTable.sources,
      notForYou: reviewsTable.notForYou,
      expertiseDepth: reviewsTable.expertiseDepth,
      fullArticle: reviewsTable.fullArticle,
      // Tier metadata (migration 0003). Drives the <title>, <h1>, schema
      // itemReviewed/reviewRating polarity, and the severity chip.
      threatTier: reviewsTable.threatTier,
      threatLabel: reviewsTable.threatLabel,
      threatBadge: reviewsTable.threatBadge,
      frameAsScam: reviewsTable.frameAsScam,
      // Schema enrichment (migration 0003). Feeds the ClaimReview, HowTo,
      // ItemList, Dataset, Quotation, and Speakable nodes via the builders
      // in lib/blogSchemaEnrichment.ts — same surface as renderBlogPost
      // already uses for blog posts.
      authorPersonaId: reviewsTable.authorPersonaId,
      alternativeHeadline: reviewsTable.alternativeHeadline,
      targetKeyword: reviewsTable.targetKeyword,
      aboutSlugs: reviewsTable.aboutSlugs,
      mentionSlugs: reviewsTable.mentionSlugs,
      speakableSelectors: reviewsTable.speakableSelectors,
      citations: reviewsTable.citations,
      dataset: reviewsTable.dataset,
      itemReviewed: reviewsTable.itemReviewed,
      itemList: reviewsTable.itemList,
      howTo: reviewsTable.howTo,
      quotes: reviewsTable.quotes,
      claims: reviewsTable.claims,
      platformName: platformsTable.name,
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
      weeklyVelocity: reviewStatsTable.weeklyVelocity,
      firstDetected: reviewStatsTable.firstDetected,
      lastActive: reviewStatsTable.lastActive,
      celebrityNames: reviewStatsTable.celebrityNames,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(eq(reviewsTable.slug, slug))
    .limit(1);

  if (!row || row.status !== "published") return renderNotFound(`/review/${slug}`);

  // ── Fetch all narrative child tables in parallel. Each is an ordered
  //    list keyed by review_id. Prior to this change none of these were
  //    rendered into the server HTML, so Google saw ~10% of the actual
  //    investigation content.
  const [redFlags, faqItems, keyFindings, funnelStages] = await Promise.all([
    db
      .select({
        emoji: redFlagsTable.emoji,
        title: redFlagsTable.title,
        description: redFlagsTable.description,
      })
      .from(redFlagsTable)
      .where(eq(redFlagsTable.reviewId, row.id))
      .orderBy(asc(redFlagsTable.orderIndex)),
    db
      .select({
        question: faqItemsTable.question,
        answer: faqItemsTable.answer,
      })
      .from(faqItemsTable)
      .where(eq(faqItemsTable.reviewId, row.id))
      .orderBy(asc(faqItemsTable.orderIndex)),
    db
      .select({ content: keyFindingsTable.content })
      .from(keyFindingsTable)
      .where(eq(keyFindingsTable.reviewId, row.id))
      .orderBy(asc(keyFindingsTable.orderIndex)),
    db
      .select({
        stageNumber: funnelStagesTable.stageNumber,
        title: funnelStagesTable.title,
        description: funnelStagesTable.description,
        statValue: funnelStagesTable.statValue,
        statLabel: funnelStagesTable.statLabel,
        bullets: funnelStagesTable.bullets,
      })
      .from(funnelStagesTable)
      .where(eq(funnelStagesTable.reviewId, row.id))
      .orderBy(asc(funnelStagesTable.stageNumber)),
  ]);

  const platformName = row.platformName || slug;

  // Resolve tier from stored metadata (preferred) or compute from score.
  // This is what fixes the Affitto Casa "Threat Score 0/100" + "CONFIRMED
  // SCAM" bugs — the row now carries tier info from Vercel sync-shape, and
  // even when it doesn't we compute a score-based tier locally rather than
  // defaulting to confirmed/scam/0.
  const tier = resolveReviewTier({
    threatScore: row.threatScore,
    threatTier: row.threatTier,
    threatLabel: row.threatLabel,
    threatBadge: row.threatBadge,
    frameAsScam: row.frameAsScam,
  });
  const headlineLabel = reviewHeadlineLabel(tier);

  // <title> — tier-aware. Only include the score when it's non-zero;
  // shipping "Threat Score 0/100" on a review that lost its score during
  // sync is worse than omitting it. Score > 0 is the floor; below that
  // the writer's alternative_headline (if present) takes the slot.
  const scoreSuffix = row.threatScore && row.threatScore > 0 ? ` — Threat Score ${row.threatScore}/100` : "";
  const title = row.alternativeHeadline
    ? `${truncate(row.alternativeHeadline, 55)} | CryptoKiller`
    : `${platformName} ${headlineLabel}${scoreSuffix} | CryptoKiller`;
  const description = truncate(
    row.metaDescription || row.heroDescription || row.summary || `${platformName} crypto scam investigation. Threat score ${row.threatScore}/100. Evidence, red flags, ad surveillance, and verdict from the CryptoKiller research team.`,
    160,
  );
  const canonical = `${BASE}/review/${slug}`;
  const lastModified = row.updatedAt ? new Date(row.updatedAt).toUTCString() : undefined;
  const datePublished = row.investigationDate ? new Date(row.investigationDate).toISOString() : undefined;
  const dateModified = row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined;

  const summaryText = clean(row.summary || row.heroDescription || row.verdict || "");
  const heroText = clean(row.heroDescription);
  const warningText = clean(row.warningCallout);
  const methodologyText = clean(row.methodologyText);
  const disclaimerText = clean(row.disclaimerText);

  const stats: string[] = [];
  if (row.adCreatives) stats.push(`<li><strong>${row.adCreatives.toLocaleString()}</strong> tracked scam ad creatives</li>`);
  if (row.countriesTargeted) stats.push(`<li><strong>${row.countriesTargeted}</strong> countries targeted</li>`);
  if (row.daysActive) stats.push(`<li>Active for <strong>${row.daysActive}</strong> days</li>`);
  if (row.celebritiesAbused) stats.push(`<li><strong>${row.celebritiesAbused}</strong> celebrities impersonated</li>`);
  if (row.weeklyVelocity) stats.push(`<li><strong>${row.weeklyVelocity}</strong> new ad creatives in the last 7 days</li>`);

  // Render multi-paragraph fields by splitting on newlines
  const paragraphize = (txt: string): string =>
    txt
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");

  // ── Build the new long-form sections ──

  const keyFindingsHtml = keyFindings.length
    ? `<section aria-labelledby="findings-heading"><h2 id="findings-heading">Key findings</h2><ul>${keyFindings
        .map((k) => `<li>${esc(clean(k.content))}</li>`)
        .join("")}</ul></section>`
    : "";

  const redFlagsHtml = redFlags.length
    ? `<section aria-labelledby="red-flags-heading"><h2 id="red-flags-heading">Red flags we identified</h2>${redFlags
        .map(
          (rf) =>
            `<article class="red-flag"><h3>${esc(rf.emoji || "🚩")} ${esc(rf.title)}</h3>${paragraphize(rf.description)}</article>`,
        )
        .join("")}</section>`
    : "";

  const funnelStagesHtml = funnelStages.length
    ? `<section aria-labelledby="funnel-heading"><h2 id="funnel-heading">How the ${esc(platformName)} scam funnel works</h2>${funnelStages
        .map((fs) => {
          const bullets =
            Array.isArray(fs.bullets) && fs.bullets.length
              ? `<ul>${fs.bullets.map((b) => `<li>${esc(String(b))}</li>`).join("")}</ul>`
              : "";
          const stat =
            fs.statValue || fs.statLabel
              ? `<p><strong>${esc(fs.statValue || "")}</strong>${fs.statValue && fs.statLabel ? " — " : ""}${esc(fs.statLabel || "")}</p>`
              : "";
          return `<article class="funnel-stage"><h3>Stage ${fs.stageNumber}: ${esc(fs.title)}</h3>${fs.description ? paragraphize(fs.description) : ""}${stat}${bullets}</article>`;
        })
        .join("")}</section>`
    : "";

  const celebrityNames = Array.isArray(row.celebrityNames) ? row.celebrityNames.filter(Boolean) : [];
  const celebritiesHtml = celebrityNames.length
    ? `<section aria-labelledby="celebs-heading"><h2 id="celebs-heading">Celebrities impersonated</h2><p>The ${esc(platformName)} campaign fabricates endorsements from ${celebrityNames.length} public figures, including:</p><ul>${celebrityNames
        .slice(0, 30)
        .map((n) => `<li>${esc(String(n))}</li>`)
        .join("")}</ul></section>`
    : "";

  const faqHtml = faqItems.length
    ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently asked questions</h2>${faqItems
        .map(
          (f) =>
            `<div class="faq-item"><h3>${esc(f.question)}</h3>${paragraphize(f.answer)}</div>`,
        )
        .join("")}</section>`
    : "";

  // ── Rich content sections (migration 0002 columns) ──
  // All are optional — emit empty string if the column is null/empty so the
  // HTML stays clean for legacy reviews that haven't been re-synced yet.

  const heroImageHtml = row.heroImageUrl
    ? `<figure class="review-hero"><img src="${esc(row.heroImageUrl)}" alt="${esc(row.heroImageAlt || platformName + ' scam investigation')}" loading="eager" fetchpriority="high" width="1200" height="630" /></figure>`
    : "";

  const contentImages = Array.isArray(row.contentImages) ? row.contentImages : [];
  const renderedContentImages = new Set<string>();
  const contentImageByPlacement = (placement: string): string => {
    const found = contentImages.find((c) => c && c.placement === placement && c.url);
    if (!found || renderedContentImages.has(found.url)) return "";
    renderedContentImages.add(found.url);
    const credit = found.credit
      ? `<figcaption>${esc(found.credit)}${found.creditUrl ? ` — <a href="${esc(found.creditUrl)}" rel="nofollow">source</a>` : ""}</figcaption>`
      : "";
    return `<figure class="review-content-image"><img src="${esc(found.url)}" alt="${esc(found.alt || "")}" loading="lazy" />${credit}</figure>`;
  };

  // visual_meta entries are chart/diagram/infographic metadata with a
  // `succeeded` flag. Only render items that succeeded (i.e. polish pipeline
  // resolved the placeholder into a real asset). Skip bare IMAGE entries —
  // those overlap with content_images and would double-render.
  const succeededVisuals = Array.isArray(row.visualMeta)
    ? row.visualMeta.filter((v) => v && v.succeeded && v.url && v.type && v.type !== "IMAGE")
    : [];
  const visualsHtml = succeededVisuals.length
    ? `<section aria-labelledby="visuals-heading"><h2 id="visuals-heading">Evidence visuals</h2>${succeededVisuals
        .map(
          (v) => `<figure class="review-visual review-visual-${v.type.toLowerCase()}"><img src="${esc(v.url!)}" alt="${esc(v.altText || v.description || "")}" loading="lazy" />${v.description ? `<figcaption>${esc(v.description)}</figcaption>` : ""}</figure>`,
        )
        .join("")}</section>`
    : "";

  const protectionStepsText = clean(row.protectionSteps);
  const protectionStepsHtml = protectionStepsText
    ? `<section aria-labelledby="protection-heading"><h2 id="protection-heading">If you've been targeted by ${esc(platformName)}</h2>${paragraphize(protectionStepsText)}</section>`
    : "";

  const notForYouText = clean(row.notForYou);
  const notForYouHtml = notForYouText
    ? `<aside class="review-not-for-you" aria-labelledby="not-for-you-heading"><h2 id="not-for-you-heading">When this review may not apply</h2>${paragraphize(notForYouText)}</aside>`
    : "";

  const expertiseDepthText = clean(row.expertiseDepth);
  const expertiseDepthHtml = expertiseDepthText
    ? `<section aria-labelledby="expertise-heading"><h2 id="expertise-heading">Why trust this investigation</h2>${paragraphize(expertiseDepthText)}</section>`
    : "";

  const sources = Array.isArray(row.sources) ? row.sources : [];
  const sourcesHtml = sources.length
    ? `<section aria-labelledby="sources-heading"><h2 id="sources-heading">Sources &amp; references</h2><ol class="review-sources">${sources
        .map((s) => {
          if (!s || !s.url) return "";
          const typeBadge = s.type ? ` <span class="source-type">[${esc(s.type)}]</span>` : "";
          const meta = [s.publisher, s.date, s.accessed_date && `accessed ${s.accessed_date}`]
            .filter(Boolean)
            .map((m) => esc(String(m)))
            .join(" · ");
          return `<li><a href="${esc(s.url)}" rel="nofollow noopener" target="_blank">${esc(s.title || s.url)}</a>${typeBadge}${meta ? ` <small>${meta}</small>` : ""}</li>`;
        })
        .filter(Boolean)
        .join("")}</ol></section>`
    : "";

  // ── full_article rendering (Task 7E) ──
  // Writer-emitted full_article is a self-contained HTML article page with its
  // own breadcrumb, hero/H1, content sections, and disclaimer. When populated,
  // we render IT as the article body and skip the structured-template body
  // composition below — otherwise the page would have two H1s, two breadcrumbs,
  // two disclaimers, etc.
  //
  // We still keep the structured fields available for JSON-LD generation
  // (FAQPage, ItemList, Dataset, etc.) — only the visual HTML composition
  // changes. The schema graph is unchanged.
  //
  // Sanitisation: strip <script> tags (esp. embedded JSON-LD that would
  // duplicate our SSR jsonLd). Mirrors renderBlogPost's strip behaviour.
  const fullArticleBodyHtml =
    row.fullArticle && row.fullArticle.trim().length > 0
      ? row.fullArticle.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      : "";

  const bodyHtml = fullArticleBodyHtml
    ? // ── Modern path (post-Task 7D rows): writer-emitted full_article ──
      // Writer produces a complete article page with breadcrumb, hero, sections,
      // and disclaimer. We render it inside <article> with the site chrome and
      // append a small navigation footer for crawl-graph signal. No structured
      // sections are emitted here — they live in JSON-LD via the Task 7B graph.
      `${siteHeaderHtml()}<main>
<article id="article-body">
${fullArticleBodyHtml}
</article>
<nav aria-label="Investigation footer"><p><a href="/investigations">Back to all investigations</a> · <a href="/methodology">How we score scams</a> · <a href="/report">Report a related scam</a></p></nav>
</main>${siteFooterHtml()}`
    : // ── Legacy fallback path (pre-Task 7D rows): structured template ──
      // For older review rows that pre-date the full_article migration. Once
      // every published review has been republished after Task 7D, this branch
      // will go unused — but we keep it so legacy rows still render coherently
      // until they're regenerated.
      `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/investigations">Investigations</a> · ${esc(platformName)}</nav>
<article>
<h1>${esc(platformName)} ${headlineLabel}${scoreSuffix}</h1>
${heroImageHtml}
<p><strong>Verdict:</strong> ${esc(row.verdict || `${platformName} ${tier.frameAsScam ? "shows evidence consistent with confirmed scam patterns." : "is currently under investigation pending further evidence."}`)}</p>
${warningText ? `<p role="alert"><strong>Warning:</strong> ${esc(warningText)}</p>` : ""}
${heroText && heroText !== summaryText ? `<p>${esc(heroText)}</p>` : ""}
${summaryText ? `<section><h2>Investigation summary</h2>${paragraphize(summaryText)}</section>` : ""}
${stats.length ? `<section><h2>Investigation at a glance</h2><ul>${stats.join("")}</ul></section>` : ""}
${keyFindingsHtml}
${contentImageByPlacement("section-1")}
${redFlagsHtml}
${contentImageByPlacement("section-2")}
${funnelStagesHtml}
${visualsHtml}
${celebritiesHtml}
${methodologyText ? `<section><h2>How we investigated ${esc(platformName)}</h2>${paragraphize(methodologyText)}</section>` : ""}
${expertiseDepthHtml}
${protectionStepsHtml}
${faqHtml}
${sourcesHtml}
${notForYouHtml}
${disclaimerText ? `<section><h2>Editorial notes &amp; disclaimer</h2>${paragraphize(disclaimerText)}</section>` : ""}
<p><strong>Investigation by:</strong> ${esc(row.author || "CryptoKiller Research Team")}${datePublished ? ` · Published ${new Date(datePublished).toISOString().split("T")[0]}` : ""}${row.readingMinutes ? ` · ${row.readingMinutes}-minute read` : ""}${row.wordCount ? ` · ${row.wordCount.toLocaleString()} words` : ""}</p>
<p><a href="/investigations">Back to all investigations</a> · <a href="/methodology">How we score scams</a> · <a href="/report">Report a related scam</a></p>
</article>
</main>${siteFooterHtml()}`;

  const reviewBodyText = truncate(
    [
      summaryText,
      keyFindings.map((k) => k.content).join(" "),
      redFlags.map((r) => `${r.title}. ${r.description}`).join(" "),
      methodologyText,
    ]
      .filter(Boolean)
      .join(" "),
    5000,
  );

  // Author: resolve to Person node + reference. YMYL E-E-A-T requires
  // personal authorship. Legacy rows without authorPersonaId fall back
  // to 'webb'. The Person node is appended to @graph separately below so
  // Google sees a complete entity, not just a bare @id reference.
  const { ref: authorRef, node: authorNode } = resolveAuthorPersona(row.authorPersonaId);

  // itemReviewed: typed entity node. Reads from row.itemReviewed, which
  // Vercel sync-shape populates from the writer's item_reviewed field
  // (Task 7A) and Replit's /sync/review persists via migration 0004.
  // Pre-migration rows (null) fall through to the helper's synthetic
  // Service fallback.
  const itemReviewed = buildItemReviewedJsonLdNode(
    row.itemReviewed,
    canonical,
    platformName,
    { heroDescription: row.heroDescription, summary: row.summary, threatScore: row.threatScore },
    tier,
  );

  const graph: Record<string, unknown>[] = [
    legalEntityNode(),
    organizationNode(),
    websiteNode(),
    authorNode,
    ...(itemReviewed ? [itemReviewed] : []),
    breadcrumbList([
      { label: "Home", href: `${BASE}/` },
      { label: "Investigations", href: `${BASE}/investigations` },
      { label: `${platformName} ${headlineLabel}`, href: canonical },
    ]),
    {
      // Single type — Review. Dual-typing with Article caused Google to
      // treat it as neither, suppressing rich results. Review covers all
      // the Article-like properties (wordCount, image, speakable) and is
      // the correct type for a brand assessment.
      "@type": "Review",
      "@id": `${canonical}#review`,
      headline: title,
      url: canonical,
      mainEntityOfPage: canonical,
      description,
      inLanguage: "en",
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORG_ID },
      author: authorRef,
      ...(datePublished ? { datePublished } : {}),
      ...(dateModified ? { dateModified } : {}),
      ...(row.wordCount ? { wordCount: row.wordCount } : {}),
      // image is a strong structured-data signal for Google's rich cards and
      // the image-tab indexing pipeline. Use the hero first, fall back to any
      // successfully-resolved visual_meta asset. Omit entirely if nothing
      // resolved so we don't emit a dangling image field.
      ...(row.heroImageUrl
        ? {
            image: {
              "@type": "ImageObject",
              url: row.heroImageUrl,
              caption: row.heroImageAlt || `${platformName} scam investigation visual`,
            },
          }
        : succeededVisuals.length && succeededVisuals[0].url
          ? {
              image: {
                "@type": "ImageObject",
                url: succeededVisuals[0].url,
                caption: succeededVisuals[0].altText || succeededVisuals[0].description || "",
              },
            }
          : {}),
      // citation[] mirrors schema.org's typed citation list. Regulatory and
      // news sources are the highest-value signal here (YMYL) — include the
      // full sources array so Google can evaluate corroboration depth.
      ...(sources.length
        ? {
            citation: sources
              .filter((s) => s && s.url)
              .map((s) => ({
                "@type": "CreativeWork",
                url: s.url,
                name: s.title || s.url,
                ...(s.publisher ? { publisher: { "@type": "Organization", name: s.publisher } } : {}),
                ...(s.date ? { datePublished: s.date } : {}),
              })),
          }
        : {}),
      // itemReviewed: reference to the typed entity node above (not inline).
      // When the helper synthesized a usable node we emit a bare @id ref —
      // otherwise fall back to an inline Service node so Rich Results has
      // something valid to parse.
      itemReviewed: itemReviewed
        ? { "@id": `${canonical}#item-reviewed` }
        : {
            "@type": "Service",
            name: platformName,
            description: `Platform under investigation by CryptoKiller. Threat score ${row.threatScore ?? "?"}/100 (${tier.label}).`,
          },
      // reviewRating with correct polarity: high tiers → 1 star (worst),
      // low tier → no rating node at all. See lib/review-schema.js on the
      // Vercel side for the same decision tree. Google Rich Results renders
      // reviewRating AS STARS, so an inverted formula (the old bug) shipped
      // "5 stars for this scam" to Google — absence here is always safer
      // than an inverted star rating.
      ...(() => {
        const rating = reviewRatingForTier(tier);
        if (!rating) return {};
        return {
          reviewRating: {
            "@type": "Rating",
            ratingValue: rating.value,
            bestRating: 5,
            worstRating: 1,
            ratingExplanation: `${rating.explanation} Based on ${row.adCreatives ?? 0} ad creatives across ${row.countriesTargeted ?? 0} countries over ${row.daysActive ?? 0} days.`,
          },
        };
      })(),
      reviewBody: reviewBodyText,
    },
  ];

  if (faqItems.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      inLanguage: "en",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  }

  // ─── Schema enrichment nodes (migration 0003) ───
  //
  // Each builder is null/empty-safe at the input boundary. They emit a node
  // only when the source field has usable data. Review rows predating the
  // 0003 sync (or brands the writer hasn't re-generated under PR2 on the
  // Vercel side) will have empty/null enrichment fields — those silently
  // produce no extra graph nodes, preserving backward compat.
  //
  // Same surface used by renderBlogPost() below, so the entity graph stays
  // consistent between reviews and blog posts (critical for ENTITY_REGISTRY
  // cross-references and the knowledge graph relationships Google infers).
  //
  // Speakable lives on the Article node itself rather than as a separate
  // @graph entry — attached via the existing review node (it was absent
  // before; adding it here). The rest are top-level graph nodes.
  const aboutNodes    = resolveAbout(row.aboutSlugs);
  const mentionNodes  = resolveMentions(row.mentionSlugs);
  const citationNodes = buildCitations(row.citations);
  // Thread parent datePublished + brand name down so ClaimReview nodes
  // inherit the Article's publication date (no render-time drift) and
  // fall back to the brand name for itemReviewed.author when the writer
  // didn't set `claim.originator`. See blogSchemaEnrichment.buildClaimReviews.
  const claimNodes    = buildClaimReviews(row.claims, canonical, row.author ?? undefined, datePublished, platformName);
  const itemListNode  = buildItemList(row.itemList, canonical);
  const howToNode     = buildHowTo(row.howTo, canonical);
  // Pass canonical so the Dataset node emits a stable `@id` — the Review
  // node below attaches an `isBasedOn` edge pointing at the same `@id`.
  const datasetNode = buildDataset(
    datasetJsonAlignedWithReviewStats(row.dataset, {
      platformName,
      adCreatives: row.adCreatives,
      countriesTargeted: row.countriesTargeted,
      daysActive: row.daysActive,
      firstDetected: row.firstDetected,
      lastActive: row.lastActive,
    }),
    canonical,
  );
  const quotationNodes = buildQuotations(row.quotes);
  const speakableSpec = buildSpeakable(row.speakableSelectors);

  // Patch the existing Review+Article node in place to attach about[],
  // mentions[], citation[] (from typed citations), speakable, and
  // alternativeHeadline/keywords from the enrichment fields. We look up
  // by @id rather than array index so future insertions into the base
  // graph don't silently attach enrichment to the wrong entry.
  const reviewNodeId = `${canonical}#review`;
  const reviewNode = graph.find((n) => n && n["@id"] === reviewNodeId) as Record<string, unknown> | undefined;
  if (reviewNode) {
    if (aboutNodes.length) {
      reviewNode.about = aboutNodes;
    }
    if (mentionNodes.length) {
      reviewNode.mentions = mentionNodes;
    }
    // Prefer typed citations (schema.org CreativeWork enum) over the raw
    // sources array already emitted by the legacy citation block. If both
    // exist, typed wins — it's richer and came from the writer's own
    // citation list, not inferred from the sources table.
    if (citationNodes.length) {
      reviewNode.citation = citationNodes;
    }
    if (row.alternativeHeadline) {
      reviewNode.alternativeHeadline = row.alternativeHeadline;
    }
    if (row.targetKeyword) {
      reviewNode.keywords = row.targetKeyword;
    }
    // Declare the Dataset as the evidence base for this review. Only attach
    // when datasetNode actually rendered, so we never ship a dangling
    // isBasedOn pointing at a node the @graph doesn't contain.
    if (datasetNode) {
      reviewNode.isBasedOn = { "@id": `${canonical}#spyowl-dataset` };
    }
    reviewNode.speakable = speakableSpec;
  }

  // Push the standalone enrichment nodes as siblings in the graph.
  for (const claim of claimNodes) graph.push(claim);
  if (itemListNode) graph.push(itemListNode);
  if (howToNode) graph.push(howToNode);
  if (datasetNode) graph.push(datasetNode);
  for (const quote of quotationNodes) graph.push(quote);

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "article",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    jsonLd: { "@context": "https://schema.org", "@graph": graph },
    lastModified,
  };
}

async function renderBlogPost(slug: string): Promise<RenderResult> {
  const [row] = await db
    .select()
    .from(blogPostsTable)
    .where(and(eq(blogPostsTable.slug, slug), eq(blogPostsTable.status, "published")))
    .limit(1);

  if (!row) return renderNotFound(`/blog/${slug}`);

  // Title selection — prefer the SEO `title` column (writer prompt caps it at
  // 60 chars and instructs the model to include the target keyword) over the
  // editorial `headline` column, which is allowed to be longer. Truncating
  // headline at 55 chars produced sentences ending mid-clause (e.g. "...How to")
  // — never use a truncated headline as the SEO title. Append " | CryptoKiller"
  // only when there is room; otherwise let the brand fall off rather than
  // double-truncate.
  const BRAND_SUFFIX = " | CryptoKiller";
  function pickTitleBase(): string {
    const t = String(row.title || "").trim();
    const h = String(row.headline || "").trim();
    if (t && t.length <= 55) return t;
    if (h && h.length <= 55) return h;
    // Both too long — truncate at the last word boundary before 55 chars.
    const candidate = (t || h).slice(0, 55);
    const lastSpace = candidate.lastIndexOf(" ");
    return (lastSpace > 30 ? candidate.slice(0, lastSpace) : candidate).replace(/[\s—\-:,]+$/, "");
  }
  const titleBase = pickTitleBase();
  const title = titleBase.length + BRAND_SUFFIX.length <= 70
    ? `${titleBase}${BRAND_SUFFIX}`
    : titleBase;
  const description = truncate(
    row.metaDescription || row.summary || row.headline || row.title,
    160,
  );
  const canonical = `${BASE}/blog/${slug}`;
  const lastModified = row.updatedAt ? new Date(row.updatedAt).toUTCString() : undefined;
  const datePublished = (row.publishedAt ?? row.createdAt) ? new Date((row.publishedAt ?? row.createdAt)!).toISOString() : undefined;
  // Always emit dateModified when row.updatedAt is present. For freshly-
  // published articles dateModified will equal datePublished — that is the
  // schema.org-correct semantic ("last modified equals first published")
  // and is what crawlers expect. The previous heuristic that skipped
  // dateModified when within 5 minutes of datePublished produced null
  // values on every new publish, weakening freshness signals on the
  // Article schema. Auto-generation concerns should be addressed by the
  // publish quality gate (which validates declaration-first prose, real
  // entities, etc.), not by dropping required schema fields.
  let dateModified: string | undefined;
  if (row.updatedAt) {
    dateModified = new Date(row.updatedAt).toISOString();
  } else if (datePublished) {
    dateModified = datePublished;
  }

  const persona = row.authorPersonaId ? WRITER_PERSONAS[row.authorPersonaId] : undefined;
  const authorName = persona?.name || "CryptoKiller Research Team";
  const heroImage = row.heroImageUrl || DEFAULT_OG_IMAGE;
  const summaryText = clean(row.summary || row.metaDescription || "");

  const sections = Array.isArray(row.sections) ? (row.sections as Array<{ heading?: string; body?: string }>) : [];
  const faq = Array.isArray(row.faq) ? (row.faq as Array<{ question?: string; answer?: string }>) : [];
  const sources = Array.isArray(row.sources) ? (row.sources as Array<string | { title?: string; url?: string }>) : [];

  let articleBodyHtml = "";
  if (row.fullArticle && row.fullArticle.trim().length > 0) {
    // Strip any <script> tags (esp. embedded JSON-LD) baked into article content.
    // Duplicate schema blocks in the body downgrade structured-data trust signals
    // and are better emitted by the SSR jsonLd pipeline only. Mirrors the same
    // strip performed in artifacts/api-server/src/routes/blog.ts::processContentBody.
    articleBodyHtml = row.fullArticle.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  } else if (sections.length > 0) {
    articleBodyHtml = sections
      .map((s) => `${s.heading ? `<h2>${esc(s.heading)}</h2>` : ""}${s.body ? `<p>${esc(s.body)}</p>` : ""}`)
      .join("");
  }

  // Detect FAQ / Sources blocks already baked into row.fullArticle by older
  // pipeline versions (Vercel admin pre-2026-04-27 wrote both inline). Newer
  // generations stop emitting them, but legacy rows still have them — render
  // the appended faqHtml / sourcesHtml only when fullArticle does NOT already
  // contain that section, otherwise the published page shows two FAQs and
  // two Sources blocks.
  const fullArticleHasFaq = /class=["']faq-section["']|<h2[^>]*>\s*Frequently\s+Asked\s+Questions/i.test(articleBodyHtml);
  const fullArticleHasSources = /class=["']source-ledger["']|<h[23][^>]*>\s*Sources?(?:\s*&(?:amp;)?\s*References)?\s*<\/h[23]>/i.test(articleBodyHtml);

  const faqHtml = (faq.length && !fullArticleHasFaq)
    ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently Asked Questions</h2>${faq
        .map(
          (f) =>
            `<div><h3>${esc(f.question || "")}</h3><p>${esc(f.answer || "")}</p></div>`,
        )
        .join("")}</section>`
    : "";

  const sourcesHtml = (sources.length && !fullArticleHasSources)
    ? `<section aria-labelledby="sources-heading"><h2 id="sources-heading">Sources</h2><ol>${sources
        .map((s) => {
          if (typeof s === "string") return `<li>${esc(s)}</li>`;
          if (s && typeof s === "object" && s.url)
            return `<li><a href="${esc(s.url)}" rel="noopener nofollow">${esc(s.title || s.url)}</a></li>`;
          return `<li>${esc(String((s as { title?: string })?.title || ""))}</li>`;
        })
        .join("")}</ol></section>`
    : "";

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/blog">Blog</a> · ${esc(row.title)}</nav>
<article>
<h1>${esc(row.headline || row.title)}</h1>
<p><strong>By</strong> ${esc(authorName)}${datePublished ? ` · Published ${new Date(datePublished).toISOString().split("T")[0]}` : ""}${row.wordCount ? ` · ${row.wordCount}-word read` : ""}</p>
${summaryText ? `<p class="section-summary">${esc(truncate(summaryText, 500))}</p>` : ""}
${articleBodyHtml}
${faqHtml}
${sourcesHtml}
<p><a href="/blog">Back to blog</a></p>
</article>
</main>${siteFooterHtml()}`;

  // ── Build the enriched @graph ─────────────────────────────────────────────
  // Order: legal entity → organisation → website → breadcrumb → author →
  // about[] entities → mention[] entities → Article (citing everything above
  // via @id refs) → FAQPage → ClaimReview[] → ItemList → HowTo → Dataset →
  // Quotation[]. All extended nodes are additive — if the DB field is absent
  // or empty, the node is simply omitted. Base Article + FAQPage always emit.
  // ── Schema enrichment v2 — prefer full-entity columns, fall back to v1 slugs ──
  // The Vercel pipeline (lib/schema-enrichment-resolver.js) writes complete
  // Schema.org entities to row.about and row.mentions (with Wikidata sameAs +
  // site-internal @id). Use them directly if present. For legacy rows that
  // pre-date the v2 pipeline, fall back to slug-based resolution against the
  // local ENTITY_REGISTRY in blogSchemaEnrichment.ts.
  //
  // NOTE: this means the in-renderer ENTITY_REGISTRY filter is now a fallback
  // path only. Adding new entities should be done in lib/wikidata-registry.js
  // on the Vercel side, where the pipeline can resolve them at generation
  // time. The Replit registry remains for back-compat with legacy rows.
  const aboutFromColumn   = Array.isArray(row.about)    ? (row.about    as Record<string, unknown>[]) : [];
  const mentionsFromColumn = Array.isArray(row.mentions) ? (row.mentions as Record<string, unknown>[]) : [];
  const aboutNodes    = aboutFromColumn.length    > 0 ? aboutFromColumn    : resolveAbout(row.aboutSlugs);
  const mentionNodes  = mentionsFromColumn.length > 0 ? mentionsFromColumn : resolveMentions(row.mentionSlugs);
  const citationNodes = buildCitations(row.citations);
  // Blog posts don't carry a brand name (no platforms join) — pass undefined
  // for brandName; ClaimReview nodes that need itemReviewed.author fall back
  // to omitting the field rather than fabricating an originator.
  const claimNodes    = buildClaimReviews(row.claims, canonical, persona?.name, datePublished);
  const itemListNode  = buildItemList(row.itemList, canonical);
  const howToNode     = buildHowTo(row.howTo, canonical);
  const datasetNode   = buildDataset(row.dataset, canonical);
  const quotationNodes = buildQuotations(row.quotes);

  // Upgrade the base Organization.logo to a full ImageObject (Rich Results
  // requires this for Article.publisher). We shallow-clone the base node and
  // replace the `logo` field with the @id-referenced ImageObject.
  const orgLogo = publisherLogoImage();
  const orgNode = { ...organizationNode(), logo: { "@id": `${BASE}/#organization-logo` } };

  // Author with sameAs (only persona-linked authors; fall back to Organization
  // when no persona is set — we never fabricate sameAs for missing authors).
  const authorNode: Record<string, unknown> = persona
    ? {
        "@type": "Person",
        "@id": `${BASE}/#author-${persona.slug}`,
        name: persona.name,
        url: `${BASE}/author/${persona.slug}`,
        jobTitle: persona.role,
        description: persona.bio,
        knowsAbout: persona.specialties,
        worksFor: { "@id": ORG_ID },
        memberOf: { "@id": ORG_ID },
        // No verified external profiles yet; leave sameAs off rather than
        // invent entries. Add them here once the personas have verified URLs.
      }
    : { "@type": "Organization", name: authorName, url: BASE };

  const articleNode: Record<string, unknown> = {
    "@type": "Article",
    "@id": `${canonical}#article`,
    headline: truncate(row.headline || row.title, 110),
    ...(row.alternativeHeadline ? { alternativeHeadline: row.alternativeHeadline } : {}),
    description,
    url: canonical,
    mainEntityOfPage: canonical,
    image: heroImageNode(heroImage, null),
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": ORG_ID },
    author: persona ? { "@id": `${BASE}/#author-${persona.slug}` } : authorNode,
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
    wordCount: row.wordCount || undefined,
    articleSection: row.topicTitle || "Cryptocurrency fraud awareness",
    ...(row.targetKeyword ? { keywords: row.targetKeyword } : {}),
    // about[] and mentions[] reference the entity nodes by @type/name. Schema
    // parsers will happily correlate these back when the full node is in @graph.
    ...(aboutNodes.length ? { about: aboutNodes } : {}),
    ...(mentionNodes.length ? { mentions: mentionNodes } : {}),
    ...(citationNodes.length ? { citation: citationNodes } : {}),
    // Tie the Article to its evidence base (SpyOwl Dataset) when present.
    // Use the same @id suffix as buildDataset emits; do not drift — the
    // isBasedOn edge becomes dangling otherwise.
    ...(datasetNode ? { isBasedOn: { "@id": `${canonical}#spyowl-dataset` } } : {}),
    speakable: buildSpeakable(row.speakableSelectors),
  };

  const graph: Record<string, unknown>[] = [
    legalEntityNode(),
    orgNode,
    orgLogo,                       // ImageObject referenced by orgNode.logo.@id
    websiteNode(),
    breadcrumbList([
      { label: "Home", href: `${BASE}/` },
      { label: "Blog", href: `${BASE}/blog` },
      { label: row.headline || row.title, href: canonical },
    ]),
  ];

  if (persona) graph.push(authorNode);

  graph.push(articleNode);

  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      inLanguage: "en",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question || "",
        acceptedAnswer: { "@type": "Answer", text: f.answer || "" },
      })),
    });
  }

  for (const claim of claimNodes) graph.push(claim);
  if (itemListNode) graph.push(itemListNode);
  if (howToNode) graph.push(howToNode);
  if (datasetNode) graph.push(datasetNode);
  for (const quote of quotationNodes) graph.push(quote);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "article",
    ogImage: heroImage,
    bodyHtml,
    jsonLd,
    lastModified,
  };
}

function renderAuthor(slug: string): RenderResult {
  const persona: WriterPersona | undefined = WRITER_PERSONAS[slug];
  if (!persona) return renderNotFound(`/author/${slug}`);

  const title = `${persona.name} — ${persona.role} | CryptoKiller`;
  const description = truncate(persona.fullBio || persona.bio, 160);
  const canonical = `${BASE}/author/${persona.slug}`;

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · ${esc(persona.name)}</nav>
<article>
<h1>${esc(persona.name)}</h1>
<p><strong>${esc(persona.role)}</strong> · ${esc(persona.credentials)}</p>
<p>${esc(persona.fullBio || persona.bio)}</p>
<p><strong>Specialties:</strong> ${persona.specialties.map(esc).join(", ")}</p>
<p>${esc(persona.published)} · ${esc(persona.yearsExperience)} of experience</p>
</article>
</main>${siteFooterHtml()}`;

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "profile",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: persona.name, href: canonical },
        ]),
        {
          "@type": "Person",
          "@id": `${BASE}/#author-${persona.slug}`,
          name: persona.name,
          url: canonical,
          jobTitle: persona.role,
          description: persona.fullBio || persona.bio,
          worksFor: { "@id": ORG_ID },
          memberOf: { "@id": ORG_ID },
          knowsAbout: persona.specialties,
        },
        {
          "@type": "ProfilePage",
          url: canonical,
          name: title,
          description,
          mainEntity: { "@id": `${BASE}/#author-${persona.slug}` },
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
        },
      ],
    },
  };
}

function renderNotFound(originalPath: string): RenderResult {
  const canonical = `${BASE}${originalPath}`;
  const title = "Page Not Found — CryptoKiller";
  const description =
    "The page you are looking for does not exist. Browse CryptoKiller's crypto scam investigations or report a scam.";

  const bodyHtml = `${siteHeaderHtml()}<main>
<h1>404 — Page Not Found</h1>
<p>The page you're looking for doesn't exist or has moved.</p>
<p><a href="/">Back to home</a> · <a href="/investigations">Browse investigations</a> · <a href="/blog">Read the blog</a></p>
</main>${siteFooterHtml()}`;

  return {
    status: 404,
    title,
    description,
    canonical,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    robots: "noindex, follow",
    bodyHtml,
  };
}

const STATIC_PAGES: Record<string, () => RenderResult> = {
  "/about": () =>
    renderStaticPage({
      path: "/about",
      title: "About CryptoKiller — Crypto Scam Intelligence Platform",
      description:
        "CryptoKiller is an independent crypto scam intelligence platform tracking 1,000+ fraudulent brands across 84+ countries with evidence-based investigations.",
      h1: "About CryptoKiller",
      intro:
        "CryptoKiller is an independent crypto scam intelligence platform operated by DEX Algo Technologies Pte Ltd. in Singapore. We track over 1,000 fraudulent crypto brands across 84+ countries through real-time ad surveillance and evidence-based investigation. Our team combines blockchain forensics, OSINT, financial-crime research, and digital forensics to publish auditable threat assessments — never pay-to-remove, always evidence first.",
      sections: [
        {
          heading: "What we do",
          paragraphs: [
            "CryptoKiller exists to give every person researching a crypto platform a fast, evidence-based answer to the question \"is this a scam?\". We monitor paid-ad networks in 84+ countries, capture the ad creatives and landing pages scam operators use, and turn that raw evidence into structured investigations tied to specific brand names.",
            "Each investigation we publish includes a numeric threat score backed by six categories of evidence, side-by-side screenshots of the advertisements we captured, a breakdown of the funnel used to extract deposits, and citations to regulatory warnings issued by recognised authorities such as the FCA (United Kingdom), SEC (United States), ASIC (Australia), CONSOB (Italy), AMF (France), BaFin (Germany), and the national fraud agencies of every jurisdiction we cover.",
            "We do not sell listings, accept removal fees, or publish sponsored reviews. Our revenue model — partnerships with regulated exchanges and educational content — is described in our editorial policy below. Every published investigation is reproducible from the evidence we cite.",
          ],
        },
        {
          heading: "Who runs CryptoKiller",
          paragraphs: [
            "CryptoKiller is operated by DEX Algo Technologies Pte Ltd., a company registered in Singapore. The company holds the operational and legal responsibility for the platform and is the publisher of record for all investigations.",
            "Investigations are written by a research team with documented experience in cybercrime analysis, blockchain forensics, financial-crime research, digital forensics, and independent crypto journalism. Each investigation carries the named byline of the analyst responsible, with credentials, specialisations, and public profiles linked from the review page.",
            "The platform is editorially independent. No advertiser, exchange, or affiliate partner has veto power over which brands we investigate or what conclusions we publish. Our editors are the only parties who decide what gets published, when, and how.",
          ],
        },
        {
          heading: "Our investigation approach",
          paragraphs: [
            "Every threat score is built from evidence that is either publicly observable (paid ads, landing pages, domain registration records, regulator bulletins) or directly submitted by victims under our reporting process. We do not include unverifiable rumours, unattributed forum posts, or competitor-sourced claims in any published investigation.",
            "When we cite a regulator, we link to the specific bulletin — not a general warning page. When we quote an ad creative, we show the screenshot. When we cite a statistic about geographic reach or campaign duration, the number comes from our SpyOwl ad-surveillance platform, which scans paid advertising in 84+ countries continuously.",
            "We publish under a model we call \"evidence-first, pay-to-remove-never\". If a brand disputes our findings, the only path to a correction is new evidence — which we will evaluate and publish a correction or full retraction for, if warranted. No brand has ever paid to have a review altered or removed, and no brand ever will.",
          ],
        },
        {
          heading: "How we're funded",
          paragraphs: [
            "CryptoKiller is funded by referral partnerships with regulated cryptocurrency exchanges (such as exchanges licensed under the EU's MiCA framework, U.S. money-service-business registrations, or equivalent jurisdictional licensing) and by sponsored educational content clearly labelled as such. We receive no funding from the subjects of our investigations or from any party with an interest in our editorial conclusions.",
            "Partner exchanges are chosen for their licensing status and track record, not their willingness to pay. Educational sponsorships are disclosed on every page where they appear and never affect our threat-scoring methodology.",
            "We do not run display advertising, tracking cookies, or third-party behavioural analytics. The site exists to serve the reader's question, not to monetise their attention.",
          ],
        },
        {
          heading: "Editorial corrections",
          paragraphs: [
            "If you believe we have published something inaccurate, please email corrections@cryptokiller.org with the URL of the affected page and a clear explanation of the error. We review every correction request — whether it comes from a subject of an investigation, a reader, a victim, or a regulator. We do not charge for corrections and we do not condition corrections on non-publication of other content.",
            "When we make a correction, we publish a dated correction notice on the affected page rather than silently editing. When we retract a full investigation, we leave the original URL in place with a visible retraction notice so the record remains auditable.",
          ],
        },
      ],
      faq: [
        {
          question: "Does CryptoKiller accept payment to remove reviews?",
          answer:
            "No. No brand has ever paid us to remove, alter, or soften an investigation, and no brand ever will. The only way to change a published investigation is to provide new evidence that changes the factual basis. If a brand offers payment for removal, we log it and it becomes part of the public record on the investigation page.",
        },
        {
          question: "How do you decide which brands to investigate?",
          answer:
            "Our SpyOwl ad-surveillance platform continuously scans paid advertising in 84+ countries. When a brand exceeds our threshold signals (ad volume, celebrity impersonation, jurisdictional targeting pattern, consumer-harm complaints), it enters our investigation queue. We also investigate brands reported to us directly through our reporting form.",
        },
        {
          question: "Are your threat scores objective?",
          answer:
            "Threat scores are calculated from six categories of evidence using a documented scoring function (see our methodology page). The inputs are objective — ad volume, number of celebrities impersonated, jurisdictional reach, regulatory warnings, funnel signals, and infrastructure red flags. Two analysts scoring the same brand from the same evidence will arrive at the same score. Human editorial review happens on top of the calculated score to catch edge cases.",
        },
        {
          question: "What jurisdiction is CryptoKiller based in?",
          answer:
            "CryptoKiller is operated by DEX Algo Technologies Pte Ltd., registered in Singapore. Investigations cover brands advertising globally and cite the regulators relevant to each jurisdiction where a scam is active.",
        },
        {
          question: "Can I submit a scam for investigation?",
          answer:
            "Yes. Use the reporting form at /report. Reports are confidential — your identity is never shared publicly. We cross-reference submissions with our SpyOwl intelligence and open investigations when the evidence threshold is met.",
        },
      ],
    }),

  "/methodology": () =>
    renderStaticPage({
      path: "/methodology",
      title: "Investigation Methodology — CryptoKiller",
      description:
        "How CryptoKiller investigates crypto scams — evidence-based scoring across six categories, data sources, investigation process, and editorial standards.",
      h1: "Investigation Methodology",
      intro:
        "Every CryptoKiller threat score is built from six categories of evidence, each weighted according to its correlation with documented consumer harm. This page documents the complete methodology: what we measure, how we measure it, where the evidence comes from, how scores are calculated, how we handle edge cases, and what corrections process applies if we get something wrong. Nothing below is proprietary — the methodology is published in full so any reader can audit our conclusions against our evidence.",
      sections: [
        {
          heading: "The six evidence categories",
          paragraphs: [
            "We score every brand across six categories. Each category contributes to the final threat score out of 100. The categories were chosen because each has an independently documented correlation with consumer harm in crypto fraud, established through regulatory enforcement actions, academic research, and our own investigation archive.",
          ],
          list: [
            "Ad creative volume — total number of paid advertisements we have captured for the brand across all networks and geographies. Higher volume indicates larger marketing spend and greater victim exposure.",
            "Geographic targeting spread — number of countries in which we have captured active ads for the brand. Multi-jurisdictional targeting is a documented signal of organised rather than opportunistic fraud.",
            "Celebrity impersonation — count of public figures whose likeness, voice, or video appears in the brand's advertising without authorisation. Deepfake celebrity endorsement is among the strongest individual predictors of fraud in our archive.",
            "Funnel and registration patterns — signals from the landing page and deposit funnel: domain age, WHOIS privacy, SSL certificate issuer, payment processor, withdrawal friction, KYC patterns, and the step sequence from ad-click to deposit.",
            "Regulatory and infrastructure signals — explicit warnings from recognised regulators (FCA, SEC, ASIC, CONSOB, AMF, BaFin, and equivalents in every jurisdiction we cover), blocklist entries from payment processors, domain takedowns, and hosting infrastructure shared with known scam operations.",
            "Historical pattern matching — similarity to brands we have previously confirmed as fraudulent, measured across advertising creative, domain patterns, payment infrastructure, and funnel design.",
          ],
        },
        {
          heading: "Where the evidence comes from",
          paragraphs: [
            "The ad-creative evidence comes from SpyOwl, our proprietary ad-surveillance platform. SpyOwl continuously scans paid advertising on major ad networks in 84+ countries, capturing creative assets, landing-page destinations, and geographic targeting. SpyOwl data is collected from publicly visible advertising — we do not access private ad dashboards and we do not pay for data we are not entitled to see.",
            "Regulatory evidence comes directly from regulator bulletin pages. When we cite a regulator warning, we link to the specific bulletin. We do not cite \"the regulator said\" without linking the exact source.",
            "Funnel evidence is collected by our analysts through manual inspection of landing pages, deposit flows, and withdrawal processes — without depositing real funds. When real-money interaction is required to establish a finding (for example, documenting a withdrawal-block), we note that explicitly and limit our claims to what can be established without participation.",
            "Victim reports submitted through our /report form are cross-referenced with ad-surveillance data. We only incorporate a submitted claim into a published investigation when it is independently corroborated by at least one other evidence source.",
          ],
        },
        {
          heading: "How the threat score is calculated",
          paragraphs: [
            "The threat score is a weighted sum of normalised values across the six categories, producing a number between 0 and 100. The weights reflect each category's historical correlation with confirmed fraud in our archive — celebrity impersonation and regulatory warnings carry the heaviest weight, historical pattern matching the lightest.",
            "A score of 0-19 is assigned to brands with insufficient signal for any conclusion — we explicitly avoid publishing these as \"clean\" because absence of evidence is not evidence of absence. A score of 20-39 indicates watchlist status: notable signals but not yet conclusive. 40-59 is elevated risk with multiple serious red flags. 60-79 is high risk with strong evidence of fraudulent activity. 80+ is a confirmed scam with regulator-issued warnings, multiple jurisdictional enforcement actions, or documented consumer harm.",
            "The score is a guide, not a verdict. Every investigation page presents the full evidence so the reader can form their own conclusion. We encourage readers to consult the cited regulators directly before acting on any financial decision.",
          ],
        },
        {
          heading: "Editorial process",
          paragraphs: [
            "Every investigation moves through five stages: automated detection (SpyOwl flags the brand), evidence collection (analyst gathers ad creatives, funnel screenshots, domain records, regulator bulletins), analysis and scoring (evidence is weighed against the six-category framework), human editorial review (a second analyst independently verifies the evidence and scoring), and publication (the investigation is published with a named byline).",
            "Investigations are revisited when new evidence emerges — a new regulator warning, a domain change, a payment-processor update, or a victim report. When an update changes the threat score by more than 10 points, we republish with a change-log entry.",
            "No investigation is ever published without passing human editorial review. No investigation is ever unpublished without a documented reason. The full edit history of every published investigation is available on request.",
          ],
        },
        {
          heading: "Corrections and disputes",
          paragraphs: [
            "If a subject of an investigation, a victim, a regulator, or any other party believes we have published something inaccurate, the correction path is email corrections@cryptokiller.org with the URL and a clear explanation of the error. We review every correction request on the merits. Meritorious corrections result in a dated correction notice on the affected page. Substantive factual errors may result in a full retraction — in which case the original URL is preserved with a visible retraction notice, so the record remains auditable.",
            "We do not charge for corrections. We do not condition corrections on payment, silence, partnership, or any other consideration. A correction request is evaluated solely on whether the factual claim in question can be sustained against the cited evidence.",
          ],
        },
      ],
      faq: [
        {
          question: "Can a brand pay to have its threat score lowered?",
          answer:
            "No. Threat scores are calculated from evidence. The only way to change a score is to change the underlying evidence — for example, by ceasing the advertising campaign we are tracking, or by becoming licensed in the jurisdictions where we documented regulatory violations. A brand asking to pay for score changes would be logged as part of the investigation and published.",
        },
        {
          question: "Why do some investigations have scores and others don't?",
          answer:
            "We only assign a threat score when we have enough evidence across multiple categories to make it meaningful. Brands with very limited signal are not scored — we publish them as watchlist entries with the available evidence but no numeric score, because a score based on insufficient evidence is worse than no score at all.",
        },
        {
          question: "Who decides which regulators you cite?",
          answer:
            "We cite the regulator or law-enforcement agency with jurisdiction over the advertising or victim location for each specific fact. If the brand advertises to UK consumers, we cite the FCA. If it advertises to U.S. consumers, the SEC, FTC, and CFTC as applicable. If it advertises to Australian consumers, ASIC. The choice of regulator follows the jurisdiction, not our editorial preference.",
        },
        {
          question: "How do you handle a brand that changes its domain or rebrands?",
          answer:
            "We track brand identity through advertising creative, funnel infrastructure, and payment processing — not just domain names. When a known scam operation rebrands or moves to a new domain, we typically detect the continuation through SpyOwl ad-creative similarity and publish a new investigation with a cross-reference to the previous entity.",
        },
        {
          question: "Are your investigations peer-reviewed?",
          answer:
            "Every investigation goes through internal peer review: a second analyst independently verifies evidence and scoring before publication. We also publish the full evidence base alongside every investigation, so external peer review is possible. Academic researchers studying crypto fraud can contact us for archive access.",
        },
      ],
    }),

  "/recovery": () =>
    renderStaticPage({
      path: "/recovery",
      title: "Crypto Scam Recovery Guide — CryptoKiller",
      description:
        "Step-by-step recovery guide if you have lost crypto to a scam. Immediate actions, reporting authorities in every major jurisdiction, and how to avoid recovery scams.",
      h1: "Crypto Scam Recovery Guide",
      intro:
        "If you have lost crypto to a scam, the next 48 hours matter. The steps below are what we have seen actually help victims: immediate containment, evidence preservation, legitimate reporting channels, and — critically — how to recognise and avoid recovery scams, which target scam victims specifically and have become as common as the original scams themselves. This guide is not legal advice, and the realistic outlook for recovering already-transferred crypto is often poor. But there are actions that meaningfully increase your odds and actions that meaningfully reduce them.",
      sections: [
        {
          heading: "Immediately: stop the bleeding",
          paragraphs: [
            "The first hour is for preventing further loss, not recovering what is already gone.",
          ],
          list: [
            "Stop all payments to the platform. If the scammer is still asking for \"one more deposit to release your withdrawal\" or \"a tax payment to unlock the funds\", that is part of the scam — no legitimate withdrawal has ever required an additional deposit.",
            "Contact your bank or card issuer if you funded the scam through a card or wire transfer. Request a chargeback if within the eligibility window (typically 120 days for cards, shorter for bank transfers). The sooner you report to your bank, the better your odds.",
            "Secure your existing accounts — change passwords on email, exchange accounts, banking, and any wallet where you hold remaining crypto. Enable two-factor authentication everywhere that offers it. If the scam involved remote access to your device (common in \"investment manager\" scams), treat the device as compromised and scan it from a clean device or reinstall the operating system.",
            "Cut all contact with the scammer. Do not engage with follow-up messages, do not threaten legal action in-message, and do not negotiate. Scammers who detect a victim is aware are a documented risk for retaliation via social engineering or doxxing attempts.",
          ],
        },
        {
          heading: "Preserve every piece of evidence",
          paragraphs: [
            "What you preserve in the first 48 hours is what you or a recovery professional will have to work with. Screenshots disappear, chat histories get deleted, wallet addresses get rotated. Copy everything before you do anything else.",
          ],
          list: [
            "Screenshot every conversation with the scammer — full-screen, including timestamps and usernames. Export chat histories from WhatsApp, Telegram, Instagram, or wherever the contact took place.",
            "Save every transaction ID, wallet address, bank reference number, and date. For on-chain transactions, a block explorer link (e.g. etherscan.io, blockchain.com) is sufficient.",
            "Capture the scam platform itself — landing page URL, dashboard screenshots, \"portfolio\" screenshots, any login pages. If the site is still up, use a service like archive.today to create a permanent archived copy.",
            "Save any celebrity endorsement videos or ads that led you to the platform. Deepfake evidence is critical for both prosecution and platform takedowns.",
            "Write a timeline in plain language while the details are fresh — first contact, first deposit, escalating amounts, first withdrawal attempt, moment you realised something was wrong. This becomes the narrative for every report you file.",
          ],
        },
        {
          heading: "Reporting to authorities — by jurisdiction",
          paragraphs: [
            "Report to the police and national fraud agency in your country of residence. Reporting does not guarantee recovery — but it is the only path to official case numbers, which are often required for chargebacks, insurance claims, and any eventual civil action. Many jurisdictions now have dedicated cybercrime or financial-fraud units.",
          ],
          list: [
            "United States — IC3.gov (FBI Internet Crime Complaint Center), ReportFraud.ftc.gov (Federal Trade Commission), and your state attorney general. For securities-related fraud, tips.sec.gov and cftc.gov/complaint.",
            "United Kingdom — Action Fraud (actionfraud.police.uk) and the Financial Conduct Authority (fca.org.uk/contact/report-scam-unauthorised-firm).",
            "European Union — Your national police fraud unit. In Germany, BaFin and your local Polizei. In France, Pharos (internet-signalement.gouv.fr) and AMF. In Italy, CONSOB and Polizia Postale.",
            "Australia — Scamwatch (scamwatch.gov.au), ReportCyber (cyber.gov.au/report), and ASIC (asic.gov.au/report-a-concern).",
            "Canada — Canadian Anti-Fraud Centre (antifraudcentre-centreantifraude.ca) and the RCMP.",
            "Other jurisdictions — Your national police cybercrime unit and financial regulator. Most countries now have an online reporting portal for financial fraud.",
          ],
        },
        {
          heading: "Recovery scams: avoid at all costs",
          paragraphs: [
            "Recovery scams target people who have just been scammed. They advertise heavily on the same platforms (social media, YouTube comments, Telegram, forums) and offer to recover your funds — for an upfront fee, or for \"tax\", \"escrow\", or \"blockchain unlock\" payments. They are almost always the same criminal networks behind the original scam, or closely adjacent ones working off the same leaked victim lists.",
            "There is no legitimate recovery service that requires payment before work begins. There is no \"blockchain unlock fee\", \"wallet freezing fee\", or \"government tax\" that you can pay to release your crypto. There is no hacker who can \"reverse the transaction\" on Bitcoin or Ethereum — the chains do not work that way, and anyone claiming to offer this is lying.",
          ],
          list: [
            "Red flag — Upfront fees, \"tax\" payments, \"escrow\" deposits, or any payment required before the service produces results.",
            "Red flag — Guarantees of recovery. No legitimate service guarantees recovery because no legitimate service has that power.",
            "Red flag — Contact through unsolicited direct message (DM), email, or phone call after your original loss — especially if the contact mentions specific details of your case that you did not make public.",
            "Red flag — \"Partnerships\" with recognisable authorities or companies (FBI, Interpol, banks) that cannot be verified by calling the authority directly.",
            "Red flag — High-pressure timelines, \"limited-time offers\", or any urgency to act before you can verify the service.",
            "Red flag — Requests for remote access to your device, your exchange accounts, or your existing wallets.",
          ],
        },
        {
          heading: "Legitimate paths to work through",
          paragraphs: [
            "Genuine routes to possible recovery are slower, unglamorous, and often partial — but they exist.",
          ],
          list: [
            "Chargeback through your card issuer or bank, if within the eligibility window. This is the highest-probability recovery path for card-funded scams.",
            "Exchange account freezing — if the scammer's wallet is linked to a known custodial exchange, law enforcement can sometimes freeze funds before they move. Report early enough and with enough specificity for this to be possible.",
            "Civil action against the platform operator — only realistic if the operator is identifiable and within a jurisdiction that will enforce a judgment. Requires a lawyer and is typically cost-effective only above six-figure losses.",
            "Insurance — some crypto platforms, custodial wallets, and payment providers carry policies covering specific fraud scenarios. Check the terms of any platform through which the funds transited.",
            "Class action — for large scams with many victims, class-action suits are sometimes filed. These are typically organised by law firms specialising in financial fraud, not by individual victims.",
          ],
        },
        {
          heading: "What we can do",
          paragraphs: [
            "CryptoKiller is an investigation platform, not a recovery service. We do not offer to recover funds and we do not take fees from victims. What we do is investigate and publish the brand you lost funds to, so future victims are warned. Your submitted report — through /report — becomes part of the evidence base and materially increases the visibility of the scam.",
            "If your case involves details that law enforcement or a regulator is already investigating, we will coordinate with them when appropriate. We do not share victim reports publicly without consent. Reporter identity is never disclosed.",
          ],
        },
      ],
      faq: [
        {
          question: "I just sent crypto to a scam — is there any way to reverse it?",
          answer:
            "Blockchain transactions cannot be reversed by the protocol itself. However, if the destination wallet is hosted at a custodial exchange (Coinbase, Binance, Kraken, etc.) and you report quickly, law enforcement can sometimes freeze the funds before they are moved off-exchange. Report to the exchange's abuse team, your local police, and your national fraud agency within 24 hours for the best chance.",
        },
        {
          question: "Someone contacted me offering to recover my lost funds for a fee. Is this legitimate?",
          answer:
            "Almost certainly no. There is no legitimate recovery service that requires upfront payment, and no legitimate recovery service contacts victims through unsolicited DM, email, or phone call. Recovery scammers specifically target recent scam victims using leaked victim lists. If someone contacts you out of the blue claiming they can recover your funds, treat it as a second scam attempt.",
        },
        {
          question: "The scammer is asking for a \"release fee\" to let me withdraw. Should I pay?",
          answer:
            "No. There is no legitimate financial mechanism that requires an additional deposit before a withdrawal is processed. \"Tax fees\", \"anti-money-laundering fees\", \"account verification fees\", \"unlocking fees\" — all of these are scam scripts. Every additional payment is another loss. Stop, preserve evidence, and report.",
        },
        {
          question: "Can I report the scam if I don't know the scammer's real identity?",
          answer:
            "Yes. Most scam reports start with only the platform name, wallet addresses, and communication evidence. Police cybercrime units are accustomed to working from this starting point. The more evidence you preserve — transaction IDs, screenshots, chat logs — the more useful your report is, even without knowing who is behind the operation.",
        },
        {
          question: "How long do I have to report?",
          answer:
            "Different deadlines apply for different paths. Card chargebacks typically have a 120-day window from transaction date, sometimes shorter. Bank wire reversals must be attempted within days, often hours. Police and regulator reports have no hard deadline, but evidence availability decreases over time — scam platforms go offline, chat logs get deleted, witnesses move on. File within the first week if at all possible.",
        },
      ],
    }),

  "/report": () =>
    renderStaticPage({
      path: "/report",
      title: "Report a Crypto Scam — Submit Evidence | CryptoKiller",
      description:
        "Report a crypto scam to CryptoKiller. Your confidential report helps us investigate fraudulent platforms, warn future victims, and build evidence for authorities.",
      h1: "Report a Crypto Scam",
      intro:
        "Submit a confidential report to the CryptoKiller research team. Your identity is never shared publicly — we do not publish reporter names, email addresses, or any identifying details unless you explicitly request otherwise. Reports are cross-referenced with our SpyOwl ad-surveillance intelligence and feed directly into published investigations that warn future victims. This page explains what happens after you submit, what we do with the information, and what we cannot do.",
      sections: [
        {
          heading: "What to include in a report",
          paragraphs: [
            "The more specific the report, the more useful it is. You do not need to have all of this — send what you have. We will follow up by email if clarification is needed.",
          ],
          list: [
            "The platform name or brand as it appeared in the advertising, landing page, or chat messages.",
            "The domain or domains you were directed to (including any subdomains, URL shorteners, or redirect chains you can recall).",
            "How you were contacted or how you found the platform — ad network, social media platform, search result, direct message, phone call, email.",
            "The names or descriptions of any celebrities, public figures, or authorities whose likeness was used in the promotion.",
            "Any wallet addresses, bank account numbers, or payment-processor references you used to transfer funds.",
            "Screenshots of the platform dashboard, chat conversations, emails, or any other direct communications.",
            "A rough timeline — first contact, first deposit, moment you became suspicious.",
            "Your jurisdiction (country and region), so we know which regulator to cite.",
          ],
        },
        {
          heading: "What happens after you submit",
          paragraphs: [
            "Every report is reviewed by a member of our research team within 72 hours. If the brand is already in our investigation archive, your report is added to the evidence base and any new details update our threat score. If it is a new brand, it enters our investigation queue.",
            "We send a reply by email acknowledging the submission and explaining the next step. You will not be contacted by anyone claiming to represent CryptoKiller through any other channel — no phone calls, no social-media DMs, no follow-up asking for payment. If someone contacts you claiming to work with us and asking for money, treat it as a recovery scam (see our recovery guide).",
            "When an investigation based in part on your report is published, we notify you by email. Your name, email address, and identifying details never appear in the published investigation.",
          ],
        },
        {
          heading: "What we can and cannot do",
          paragraphs: [
            "We can investigate, publish, and warn. We can cross-reference your report against 1,000+ tracked brands and 84+ countries of ad surveillance. We can cite the regulators with jurisdiction over your case and link directly to their warning bulletins. We can coordinate with law enforcement when they ask.",
            "We cannot recover your funds. Nobody can guarantee fund recovery, and anyone who claims they can is running a second scam on top of the first one. We cannot file police reports on your behalf — that must come from you, through your national reporting channel. We cannot freeze wallets, reverse transactions, or negotiate with the scammer.",
            "If your primary need is fund recovery, see our recovery guide for the legitimate paths — chargebacks, exchange reporting, law enforcement. These are slower and less certain than recovery scammers advertise, but they are the only real options.",
          ],
        },
        {
          heading: "Confidentiality and privacy",
          paragraphs: [
            "Reports are stored in our internal intelligence system, which is accessed only by authorised research-team members under an NDA. Your identifying details are never published. Your email address is never shared with third parties, never added to a mailing list, and never sold.",
            "We may share report details with law enforcement or regulators when they make a specific request tied to an investigation they are running — but only with prior consent from you, and only to the extent legally required. If you request that your report be treated as fully confidential even from authorities, we honour that request.",
            "If you change your mind after submitting, email corrections@cryptokiller.org and we will delete the report from our intelligence system. Published investigation content based on multiple corroborated sources will remain, but your specific submission and any reference to it will be removed.",
          ],
        },
      ],
      faq: [
        {
          question: "Will my name appear in the investigation?",
          answer:
            "No. Reporter identities are never disclosed in published investigations. We may quote the substance of a report (for example, describing the deposit pattern you experienced) but without any identifying details. If you want to be quoted by name — as a victim speaking publicly about the scam — you must explicitly request it, and we will review the request before agreeing.",
        },
        {
          question: "I don't have much evidence — is it still worth reporting?",
          answer:
            "Yes. Even a partial report with just the brand name and one screenshot adds signal. When multiple reports cluster around the same brand, the aggregate picture becomes actionable even if each individual report is sparse. Report what you have.",
        },
        {
          question: "Do I need to report to the police too?",
          answer:
            "Yes — CryptoKiller does not file police reports on your behalf. If you have lost funds, a police report in your jurisdiction is the prerequisite for chargebacks, insurance claims, and any civil action. Our recovery guide lists the reporting channels for major jurisdictions.",
        },
        {
          question: "How long before I hear back?",
          answer:
            "Within 72 hours for the initial acknowledgement. Substantive investigation can take 1-6 weeks depending on complexity, existing evidence, and ongoing surveillance data. We email when an investigation based on your report is published.",
        },
        {
          question: "Can I submit a report about a platform that hasn't scammed me yet but looks suspicious?",
          answer:
            "Yes — preventative tips are welcome and valuable. Describe what made you suspicious (the advertising pattern, the celebrity endorsement, the platform interface, the deposit process). We treat these with the same confidentiality as victim reports.",
        },
      ],
    }),

  "/privacy": () =>
    renderStaticPage({
      path: "/privacy",
      title: "Privacy Policy — CryptoKiller",
      description:
        "CryptoKiller privacy policy. How we collect, use, and protect your information. GDPR and CCPA compliant. No tracking cookies or third-party analytics.",
      h1: "Privacy Policy",
      intro:
        "This privacy policy explains what personal data CryptoKiller collects, why we collect it, how we store and protect it, who we share it with, and what rights you have over your data. It applies to all visitors of cryptokiller.org and to anyone who submits a report through our reporting form. This policy is written to comply with the European Union General Data Protection Regulation (GDPR), the California Consumer Privacy Act (CCPA) and its successor legislation, the UK Data Protection Act, and equivalent frameworks in the jurisdictions where our readers are based. Last updated: 2026-04-24.",
      sections: [
        {
          heading: "Who is the data controller",
          paragraphs: [
            "The data controller for cryptokiller.org is DEX Algo Technologies Pte Ltd., a company registered in Singapore. All questions about this privacy policy, data requests, or complaints should be directed to corrections@cryptokiller.org.",
            "For EU/UK data subjects, we have appointed a representative who can be contacted at the same email address. For CCPA requests from California residents, the verified-request process is described in the \"Your rights\" section below.",
          ],
        },
        {
          heading: "What information we collect",
          paragraphs: [
            "We practise data minimisation: we collect only what we need for the specific, disclosed purpose, and we keep it only as long as we need it.",
          ],
          list: [
            "When you submit a scam report through our reporting form, we collect the information you provide in that form — which typically includes your name or pseudonym, your email address, and the details of the scam incident. This is the only category of personal information we actively collect.",
            "Standard server access logs (IP address, user agent, referring URL, timestamp) are recorded for security, abuse prevention, and to detect infrastructure issues. These logs are retained for 30 days and then deleted.",
            "We do not use tracking cookies. We do not use third-party analytics (Google Analytics, Facebook Pixel, or equivalents). We do not use behavioural advertising pixels of any kind.",
            "We do not collect biometric data, precise geolocation, health information, or any special category of personal data under GDPR Article 9.",
            "We do not knowingly collect personal information from children under 16 years of age. If you believe a minor has submitted information to us, please contact corrections@cryptokiller.org and we will delete it.",
          ],
        },
        {
          heading: "Why we collect it — our legal basis",
          paragraphs: [
            "Under GDPR Article 6, we rely on the following legal bases:",
          ],
          list: [
            "Consent (Article 6(1)(a)) — when you submit a scam report, you consent to us processing the details of that report for the specific purpose of investigating and publishing about the brand in question.",
            "Legitimate interest (Article 6(1)(f)) — for server access logs and basic site operation. Our legitimate interest is in maintaining site security and detecting infrastructure abuse, balanced against your privacy interests. IP addresses are not used for profiling or advertising.",
            "Legal obligation (Article 6(1)(c)) — when law enforcement or a regulator makes a legally binding request for specific information, we comply with the minimum disclosure required by law.",
          ],
        },
        {
          heading: "How we share your information",
          paragraphs: [
            "We do not sell personal information. We do not share personal information with advertisers, data brokers, or marketing services. We do not license our data.",
          ],
          list: [
            "Reporter information is shared only with the CryptoKiller research team, bound by internal NDAs.",
            "Reporter information may be shared with law enforcement or regulators when they make a specific legal request tied to an active investigation — with prior notice to you where legally permitted.",
            "Server access logs may be provided to law enforcement pursuant to a valid subpoena or legal process.",
            "We use a small number of service providers (email hosting, server hosting) that act as data processors under our instructions. These processors are under GDPR-compliant Data Processing Agreements and do not use the data for their own purposes.",
          ],
        },
        {
          heading: "How long we keep it",
          paragraphs: [
            "Reports are retained in our internal intelligence system for as long as they remain relevant to an ongoing or archived investigation. You can request deletion at any time by emailing corrections@cryptokiller.org — see the \"Your rights\" section.",
            "Server access logs are retained for 30 days and then deleted.",
            "Email correspondence with you is retained for three years or until you request deletion, whichever comes first.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "Under GDPR, CCPA, and equivalent frameworks, you have the following rights with respect to your personal information:",
          ],
          list: [
            "Right of access — you can request a copy of any personal information we hold about you.",
            "Right to rectification — you can request correction of inaccurate personal information.",
            "Right to erasure (\"right to be forgotten\") — you can request deletion of your personal information. We honour erasure requests in full for reporter submissions and email correspondence.",
            "Right to restriction — you can request that we stop processing your information while a dispute is being resolved.",
            "Right to object — you can object to processing based on legitimate interest.",
            "Right to data portability — you can request a copy of your information in a machine-readable format.",
            "For California residents under CCPA — the right to know what personal information is collected, the right to delete personal information, the right to opt out of sale (we do not sell personal information regardless), and the right to non-discrimination for exercising these rights.",
            "Right to lodge a complaint with your data protection authority if you believe we have mishandled your information. The lead supervisory authority for our EU/UK representative is available on request.",
          ],
        },
        {
          heading: "How we protect your information",
          paragraphs: [
            "Transport encryption — all traffic to cryptokiller.org is served over HTTPS with modern TLS.",
            "Storage encryption — our databases are encrypted at rest. Reporter submissions are additionally encrypted with a separate key held only by the research team.",
            "Access controls — only named research-team members with NDAs and multi-factor authentication can access reporter data. Access is logged and audited.",
            "Data minimisation — we simply do not collect what we do not need. The less data we hold, the less there is to lose in a worst-case scenario.",
          ],
        },
        {
          heading: "Changes to this policy",
          paragraphs: [
            "We update this policy when our practices change or when legal requirements change. Material changes are announced at the top of this page and by email to anyone who has submitted a report. The last-updated date at the top of this policy is always current.",
          ],
        },
      ],
      faq: [
        {
          question: "Do you use Google Analytics?",
          answer:
            "No. We do not use Google Analytics or any third-party behavioural analytics service. We also do not use Facebook Pixel, advertising trackers, or session-recording tools. The only logging we do is standard server access logs, retained for 30 days.",
        },
        {
          question: "Do you use cookies?",
          answer:
            "We use a minimal set of technical cookies required for the site to function. We do not use tracking cookies, marketing cookies, or third-party advertising cookies.",
        },
        {
          question: "If I submit a report, can I later delete it?",
          answer:
            "Yes. Email corrections@cryptokiller.org requesting deletion of your report, and we will remove it from our intelligence system within 30 days. Published investigation content based on multiple corroborated sources may remain, but your specific submission and any reference to it will be removed.",
        },
        {
          question: "How do I exercise my GDPR or CCPA rights?",
          answer:
            "Email corrections@cryptokiller.org with your request. For erasure, access, rectification, and portability requests, we respond within 30 days (or one month under GDPR). We may ask you to verify your identity before processing substantive requests to prevent impersonation.",
        },
        {
          question: "Do you sell personal information?",
          answer:
            "No. We do not sell personal information. We do not share personal information with advertisers, marketers, or data brokers. This is as true for CCPA as it is for any other framework — our business model does not depend on user data.",
        },
      ],
    }),

  "/terms": () =>
    renderStaticPage({
      path: "/terms",
      title: "Terms of Service — CryptoKiller",
      description:
        "CryptoKiller terms of service. Rules governing use of our crypto scam investigation platform, report submissions, and published content.",
      h1: "Terms of Service",
      intro:
        "These terms govern your use of cryptokiller.org and all services we provide. By using the site, browsing investigations, or submitting a report, you agree to the terms described here. If you do not agree with any part of these terms, please do not use the site. These terms apply to all visitors worldwide, with jurisdiction-specific provisions where relevant. Last updated: 2026-04-24.",
      sections: [
        {
          heading: "Who we are",
          paragraphs: [
            "cryptokiller.org is operated by DEX Algo Technologies Pte Ltd., a company registered in Singapore. References to \"CryptoKiller\", \"we\", \"us\", or \"our\" in these terms refer to DEX Algo Technologies Pte Ltd. and its authorised representatives. References to \"you\" or \"your\" refer to the individual or entity accessing the site.",
          ],
        },
        {
          heading: "Nature of our content",
          paragraphs: [
            "CryptoKiller publishes evidence-based investigations into cryptocurrency-related brands, products, and advertising campaigns. Our investigations draw conclusions — including threat scores and verbal characterisations such as \"scam\", \"high risk\", or \"confirmed fraudulent\" — from the evidence cited in each investigation. These conclusions are our editorial assessment based on the evidence available at the time of publication.",
            "Our content is not financial advice, not investment advice, and not legal advice. We do not recommend specific investments, and we do not certify any product as safe. A brand we have not investigated, or that we have assessed as low risk, is not endorsed by us — absence of a CryptoKiller investigation is not a signal of legitimacy.",
            "Investigations are updated when new evidence emerges. The latest version of any investigation is the version currently served at its canonical URL. We do not guarantee that archived snapshots of earlier versions reflect our current assessment.",
          ],
        },
        {
          heading: "Content licensing and usage",
          paragraphs: [
            "Our investigations, methodology documentation, and related written content are protected by copyright and are the property of DEX Algo Technologies Pte Ltd. You may:",
          ],
          list: [
            "Read, share, and reference our content for personal, educational, and journalistic purposes.",
            "Quote short excerpts with attribution to CryptoKiller and a link to the original source.",
            "Link to our investigations from your own site, blog, forum post, or social media.",
            "Use our published evidence — including the threat scores and red flag summaries — as a starting point for your own due diligence.",
          ],
        },
        {
          heading: "What you may not do",
          paragraphs: [
            "The following are prohibited uses of the site and its content:",
          ],
          list: [
            "Wholesale reproduction of investigation content on other sites, with or without attribution. Quote short excerpts, link to the original — do not republish full investigations.",
            "Automated scraping or crawling of the site at rates that burden our infrastructure, including bulk-downloading investigation content or evidence archives. Reasonable crawling by search engines and AI answer systems is welcomed and explicitly permitted by our robots.txt.",
            "Using our brand name, logo, or reputation to imply endorsement of any product, service, or platform.",
            "Submitting fabricated scam reports, reports about non-scam parties intended to harass, or reports designed to manipulate our threat scores for competitive or financial reasons.",
            "Any use of the site that attempts to circumvent security controls, access unauthorised data, or disrupt service for other users.",
            "Use of the site content to train machine-learning models for commercial systems without a separate agreement. AI answer engines and search systems citing our investigations in response to user queries are explicitly welcomed; bulk training on our content without attribution or permission is not.",
          ],
        },
        {
          heading: "Report submissions",
          paragraphs: [
            "When you submit a report through our reporting form, you represent that the information you provide is accurate to the best of your knowledge. You grant CryptoKiller a non-exclusive, royalty-free licence to use the submitted information for the purpose of investigation and publication, subject to the confidentiality commitments in our privacy policy.",
            "You retain all rights to your own underlying information. You can request deletion of your submission at any time — see the privacy policy for the procedure.",
            "We reserve the right to decline to publish or investigate based on submitted reports, without obligation to explain the specific decision. Submission does not guarantee investigation.",
          ],
        },
        {
          heading: "Disclaimer of warranties",
          paragraphs: [
            "The site and its content are provided \"as is\" and \"as available\". To the maximum extent permitted by applicable law, we disclaim all warranties — express, implied, or statutory — including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement.",
            "We do not warrant that our investigations cover every scam, that our threat scores are absolute measures of risk, or that the absence of an investigation means a platform is legitimate. Due diligence beyond CryptoKiller is always your responsibility before making any financial decision.",
            "We do not warrant that the site will be uninterrupted, error-free, or free of viruses or other harmful components — though we make reasonable efforts to ensure all three.",
          ],
        },
        {
          heading: "Limitation of liability",
          paragraphs: [
            "To the maximum extent permitted by law, CryptoKiller and its operators, employees, and representatives are not liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the site, inability to use the site, or reliance on any content we publish.",
            "If despite the above disclaimers a court finds we are liable to you, our total aggregate liability is limited to USD 100 or the amount you have paid us in the preceding twelve months, whichever is greater. Since we do not charge users of the site, USD 100 is the typical maximum.",
            "Some jurisdictions do not permit certain liability limitations. In those jurisdictions, the limitations above apply to the maximum extent permitted by applicable law.",
          ],
        },
        {
          heading: "Governing law and dispute resolution",
          paragraphs: [
            "These terms are governed by the laws of Singapore, without regard to conflict-of-laws principles. Disputes arising from these terms or your use of the site are subject to the exclusive jurisdiction of the courts of Singapore — except that, where local consumer-protection law grants you non-waivable rights to bring claims in your local courts, those rights are not affected.",
            "Before pursuing any formal legal action, you agree to first contact us in good faith at corrections@cryptokiller.org and allow us 30 days to resolve the dispute informally.",
          ],
        },
        {
          heading: "Changes to these terms",
          paragraphs: [
            "We may update these terms as our practices or legal requirements change. Material changes are announced at the top of this page, and the last-updated date is always current. Continued use of the site after material changes constitutes acceptance of the new terms. If you do not agree with updated terms, please discontinue use of the site.",
          ],
        },
        {
          heading: "Contact",
          paragraphs: [
            "For any question about these terms, including dispute resolution, correction requests, or licensing queries, contact corrections@cryptokiller.org.",
          ],
        },
      ],
      faq: [
        {
          question: "Can I republish CryptoKiller investigations on my site?",
          answer:
            "No — wholesale republication of investigations is not permitted. You may quote short excerpts (a few sentences) with attribution and a link to the original source, and you may freely link to our investigations from your content. If you are a journalist or researcher requiring broader reproduction rights, contact corrections@cryptokiller.org to discuss a specific arrangement.",
        },
        {
          question: "Can AI systems cite your investigations?",
          answer:
            "Yes. AI search and answer systems (Google AI Overviews, ChatGPT Search, Perplexity, and similar) citing our investigations in response to user queries are explicitly welcomed. We publish with structured data specifically to make this citation accurate and attributed. Bulk-scraping our content to train models without attribution or agreement, however, is not permitted.",
        },
        {
          question: "What if I disagree with a threat score you've assigned to a brand?",
          answer:
            "The correction path is email corrections@cryptokiller.org with the investigation URL and a specific, evidence-based explanation of what you believe is incorrect. We review every correction request on its merits, regardless of who it comes from. We do not charge for corrections and we do not condition them on any form of payment or quiet agreement.",
        },
        {
          question: "If I suffer a financial loss based on trusting or not trusting a CryptoKiller investigation, are you liable?",
          answer:
            "No. Our content is editorial assessment based on cited evidence. It is not financial advice, and we disclaim liability for losses arising from reliance on our content. Any investment decision requires your own due diligence beyond CryptoKiller, including consulting the primary regulatory sources we cite and, where appropriate, qualified professional advisors.",
        },
        {
          question: "How do I report a legal or copyright concern?",
          answer:
            "Email corrections@cryptokiller.org with the URL of the content at issue and a clear description of the concern. For copyright claims, please include the specific material you claim is infringed, your contact information, and a good-faith statement that you are the rightsholder or authorised to act on their behalf. We review all legal notices promptly and act in accordance with the applicable copyright law.",
        },
      ],
    }),
};

// ─────────────────────────────────────────────────────────────────────────
// Topic-cluster pages — /topics and /topics/:slug
//
// Each entry in an article's about[] / mentions[] arrays carries an @id of
// the form `${BASE}/topics/{slug}#topic`. The renderer needs those URLs
// to resolve to real pages so Google's entity graph can read them as
// canonical references. These functions self-bootstrap from existing
// blog_posts.about_slugs — every topic referenced by ≥1 published article
// auto-gets a stub page; legacy articles (pre-v2) work via the slug
// array fallback.
//
// Topic name + sameAs is resolved from the FIRST matching article's
// about[] jsonb (which already carries Wikidata sameAs from the v2
// pipeline). Legacy articles fall back to title-cased slug + no sameAs.
// ─────────────────────────────────────────────────────────────────────────

// Common 2-3 letter acronyms preserved as UPPERCASE in slug-derived names.
// Matches the casing rule in lib/wikidata-registry.js / schema-enrichment-resolver.js
// on the Vercel side so titles stay consistent across the system.
const TOPIC_ACRONYMS = new Set([
  "ai", "api", "aml", "bbb", "btc", "ceo", "crm", "dao", "dex", "dns",
  "eth", "eu", "fbi", "ftc", "gdp", "hr", "iot", "ip", "irs", "kyc",
  "llm", "nft", "os", "pii", "sec", "seo", "sql", "tos", "uk", "un",
  "us", "usa", "usd", "vpn",
]);

function titleCaseSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => {
      const lower = w.toLowerCase();
      if (TOPIC_ACRONYMS.has(lower)) return lower.toUpperCase();
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

interface TopicArticle {
  slug: string;
  title: string;
  headline: string;
  summary: string;
  metaDescription: string;
  publishedAt: Date | null;
  updatedAt: Date | null;
  heroImageUrl: string | null;
  about: unknown;
}

interface TopicEntity {
  type: string;
  name: string;
  sameAs: string[];
  description?: string;
}

/**
 * Resolve a topic slug to its canonical entity by inspecting the about[]
 * jsonb on any article tagged with the slug. Falls back to a title-cased
 * Thing if no v2 metadata is present (legacy article).
 */
function resolveTopicEntity(slug: string, articles: TopicArticle[]): TopicEntity {
  const expectedId = `${BASE}/topics/${slug}#topic`;
  for (const article of articles) {
    const about = Array.isArray(article.about) ? (article.about as Record<string, unknown>[]) : [];
    for (const entry of about) {
      if (entry && typeof entry === "object" && entry["@id"] === expectedId) {
        const name = typeof entry.name === "string" ? entry.name : titleCaseSlug(slug);
        const type = typeof entry["@type"] === "string" ? entry["@type"] : "Thing";
        const sameAs = Array.isArray(entry.sameAs)
          ? (entry.sameAs as unknown[]).filter((x): x is string => typeof x === "string")
          : [];
        return { type, name, sameAs };
      }
    }
  }
  // Legacy fallback — no v2 about[] yet on this slug's articles.
  return { type: "Thing", name: titleCaseSlug(slug), sameAs: [] };
}

/**
 * Fetch articles tagged with a given topic slug. Uses the jsonb `@>`
 * containment operator on blog_posts.about_slugs (a jsonb array of
 * strings) to find any article whose about_slugs array contains the
 * target slug. Equivalent in semantics to `aboutSlugs ? slug` but
 * parameterizes more reliably across Drizzle's sql-template implementations.
 * Returns articles ordered most-recent first.
 */
async function fetchArticlesForTopic(slug: string, limit = 50): Promise<TopicArticle[]> {
  const containsSlug = JSON.stringify([slug]);
  const rows = await db
    .select({
      slug: blogPostsTable.slug,
      title: blogPostsTable.title,
      headline: blogPostsTable.headline,
      summary: blogPostsTable.summary,
      metaDescription: blogPostsTable.metaDescription,
      publishedAt: blogPostsTable.publishedAt,
      updatedAt: blogPostsTable.updatedAt,
      heroImageUrl: blogPostsTable.heroImageUrl,
      about: blogPostsTable.about,
    })
    .from(blogPostsTable)
    .where(
      and(
        eq(blogPostsTable.status, "published"),
        sql`${blogPostsTable.aboutSlugs} @> ${containsSlug}::jsonb`,
      ),
    )
    .orderBy(desc(blogPostsTable.publishedAt))
    .limit(limit);
  return rows as TopicArticle[];
}

/**
 * List every distinct topic slug across all published articles. Used by
 * /topics index and the sitemap. Returns slug + article count + most
 * recent updatedAt (for sitemap lastmod).
 */
async function listAllTopics(): Promise<Array<{ slug: string; articleCount: number; lastUpdated: Date | null }>> {
  // Unnest the jsonb array into a string set, group by slug, count.
  const rows = await db.execute(sql`
    SELECT slug, COUNT(*)::int AS article_count, MAX(updated_at) AS last_updated
    FROM (
      SELECT jsonb_array_elements_text(about_slugs) AS slug, updated_at
      FROM blog_posts
      WHERE status = 'published' AND jsonb_typeof(about_slugs) = 'array'
    ) t
    GROUP BY slug
    ORDER BY article_count DESC, slug ASC
  `);
  // drizzle-orm returns { rows } from execute(); fall back if shape differs.
  const r = (rows as unknown as { rows?: unknown[] }).rows ?? (rows as unknown[]);
  return (r as Array<{ slug: string; article_count: number; last_updated: string | Date | null }>).map((x) => ({
    slug: String(x.slug),
    articleCount: Number(x.article_count) || 0,
    lastUpdated: x.last_updated ? new Date(x.last_updated) : null,
  }));
}

async function renderTopicsList(): Promise<RenderResult> {
  const topics = await listAllTopics();

  const title = "Topics — Crypto Scam Investigations & Guides | CryptoKiller";
  const description =
    "Browse CryptoKiller investigations and guides by topic. Romance scams, pig butchering, exchange fraud, dating-app fraud, deepfake schemes, and more — organized for fast reference.";
  const canonical = `${BASE}/topics`;

  if (topics.length === 0) {
    // No topics yet — render a sparse landing page rather than 404.
    const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · Topics</nav>
<h1>Topics</h1>
<p>${esc(description)}</p>
<p>No topics have been indexed yet. Browse our latest <a href="/blog">blog posts</a> or <a href="/investigations">investigations</a>.</p>
</main>${siteFooterHtml()}`;
    return {
      status: 200,
      title,
      description,
      canonical,
      ogType: "website",
      ogImage: DEFAULT_OG_IMAGE,
      bodyHtml,
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          legalEntityNode(),
          organizationNode(),
          websiteNode(),
          breadcrumbList([
            { label: "Home", href: `${BASE}/` },
            { label: "Topics", href: canonical },
          ]),
          {
            "@type": "CollectionPage",
            "@id": `${canonical}#webpage`,
            url: canonical,
            name: title,
            description,
            isPartOf: { "@id": WEBSITE_ID },
            inLanguage: "en",
          },
        ],
      },
    };
  }

  const itemsHtml = topics
    .map((t) => {
      const name = titleCaseSlug(t.slug);
      const countLabel = t.articleCount === 1 ? "1 article" : `${t.articleCount} articles`;
      return `<li><a href="/topics/${esc(t.slug)}">${esc(name)}</a> <span class="topic-count">(${esc(countLabel)})</span></li>`;
    })
    .join("");

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · Topics</nav>
<h1>Topics</h1>
<p class="section-summary">${esc(description)}</p>
<ul class="topics-index">${itemsHtml}</ul>
</main>${siteFooterHtml()}`;

  const lastModified = topics
    .map((t) => t.lastUpdated)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    lastModified: lastModified ? lastModified.toUTCString() : undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        websiteNode(),
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: "Topics", href: canonical },
        ]),
        {
          "@type": "CollectionPage",
          "@id": `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
          mainEntity: {
            "@type": "ItemList",
            "@id": `${canonical}#topic-list`,
            numberOfItems: topics.length,
            itemListElement: topics.map((t, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${BASE}/topics/${t.slug}`,
              name: titleCaseSlug(t.slug),
            })),
          },
        },
      ],
    },
  };
}

async function renderTopicPage(slug: string): Promise<RenderResult> {
  const articles = await fetchArticlesForTopic(slug);
  if (articles.length === 0) {
    return renderNotFound(`/topics/${slug}`);
  }

  const entity = resolveTopicEntity(slug, articles);
  const canonical = `${BASE}/topics/${slug}`;
  const topicId = `${canonical}#topic`;

  // SEO copy — synthesized from real article count + entity name. Stays
  // factual and does not fabricate counts. Used for both meta description
  // and the body intro paragraph.
  const articleCountLabel = articles.length === 1 ? "1 article" : `${articles.length} articles`;
  const description = entity.sameAs.length > 0
    ? `${articleCountLabel} on CryptoKiller covering ${entity.name}, including investigations, red-flag analyses, and scam-prevention guides cross-referenced to Wikidata-canonical entity sources.`
    : `${articleCountLabel} on CryptoKiller covering ${entity.name}, including investigations, red-flag analyses, and scam-prevention guides.`;
  const title = `${entity.name} — ${articleCountLabel} on CryptoKiller`;

  const lastModified = articles
    .map((a) => a.updatedAt)
    .filter((d): d is Date => d != null)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const itemsHtml = articles
    .map((a) => {
      const datePart = a.publishedAt
        ? `<time datetime="${esc(new Date(a.publishedAt).toISOString())}">${esc(new Date(a.publishedAt).toISOString().slice(0, 10))}</time> · `
        : "";
      const excerpt = truncate(a.metaDescription || a.summary || "", 220);
      return `<li>
<h3><a href="/blog/${esc(a.slug)}">${esc(a.headline || a.title)}</a></h3>
<p>${datePart}${esc(excerpt)}</p>
</li>`;
    })
    .join("");

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/topics">Topics</a> · ${esc(entity.name)}</nav>
<article id="topic">
<h1>${esc(entity.name)}</h1>
<p class="section-summary">${esc(description)}</p>
${entity.sameAs.length > 0
  ? `<p class="topic-references">External references: ${entity.sameAs.map((url, i) => `<a href="${esc(url)}" rel="noopener nofollow">${esc(new URL(url).host)}</a>${i < entity.sameAs.length - 1 ? ", " : ""}`).join("")}</p>`
  : ""}
<h2>${articleCountLabel} in this topic</h2>
<ul class="topic-articles">${itemsHtml}</ul>
</article>
</main>${siteFooterHtml()}`;

  // Build the @graph. The topic entity gets its own node with the SAME @id
  // that articles reference in their about[] — this closes the entity graph.
  // The CollectionPage has about: { @id: topic } as a backreference.
  const topicEntityNode: Record<string, unknown> = {
    "@type": entity.type,
    "@id": topicId,
    name: entity.name,
    description,
    url: canonical,
  };
  if (entity.sameAs.length > 0) topicEntityNode.sameAs = entity.sameAs;

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "website",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    lastModified: lastModified ? lastModified.toUTCString() : undefined,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        legalEntityNode(),
        organizationNode(),
        websiteNode(),
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: "Topics", href: `${BASE}/topics` },
          { label: entity.name, href: canonical },
        ]),
        topicEntityNode,
        {
          "@type": "CollectionPage",
          "@id": `${canonical}#webpage`,
          url: canonical,
          name: title,
          description,
          about: { "@id": topicId },
          isPartOf: { "@id": WEBSITE_ID },
          inLanguage: "en",
          mainEntity: {
            "@type": "ItemList",
            "@id": `${canonical}#articles-list`,
            numberOfItems: articles.length,
            itemListElement: articles.map((a, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `${BASE}/blog/${a.slug}`,
              name: a.headline || a.title,
            })),
          },
        },
      ],
    },
  };
}

export async function renderPage(rawPath: string): Promise<RenderResult> {
  const [pathOnly, queryString = ""] = rawPath.split("?");
  const search = new URLSearchParams(queryString);
  const cleaned = pathOnly.replace(/\/+$/, "") || "/";

  if (cleaned === "/") return renderHome();
  if (cleaned === "/investigations") return renderInvestigationsList(search);
  if (cleaned === "/blog") return renderBlogList();
  if (cleaned === "/topics") return renderTopicsList();

  const reviewMatch = cleaned.match(/^\/review\/([^/]+)$/);
  if (reviewMatch) return renderReview(decodeURIComponent(reviewMatch[1]));

  const blogMatch = cleaned.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return renderBlogPost(decodeURIComponent(blogMatch[1]));

  // /topics/:slug — topic-cluster stub pages. Every published article's
  // about_slugs auto-bootstraps a topic page here. The @id pattern
  // `${BASE}/topics/{slug}#topic` is the same one articles reference in
  // their about[] arrays, closing the entity graph.
  const topicMatch = cleaned.match(/^\/topics\/([^/]+)$/);
  if (topicMatch) return renderTopicPage(decodeURIComponent(topicMatch[1]));

  const authorMatch = cleaned.match(/^\/author\/([^/]+)$/);
  if (authorMatch) return renderAuthor(decodeURIComponent(authorMatch[1]));

  const staticHandler = STATIC_PAGES[cleaned];
  if (staticHandler) return staticHandler();

  return renderNotFound(cleaned);
}
