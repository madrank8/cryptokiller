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

const BASE = "https://cryptokiller.org";
const DEFAULT_OG_IMAGE = `${BASE}/opengraph.jpg`;
const ORG_ID = `${BASE}/#organization`;
const WEBSITE_ID = `${BASE}/#website`;
const LEGAL_ENTITY_ID = `${BASE}/#legal-entity`;

// ─── Review tier helpers (migration 0003) ───
//
// These mirror the tier decisions made in Vercel's lib/threat-score.js (source
// of truth) so the prerender can fall back to a locally-computed tier when a
// review row predates migration 0003 and has null threat_tier. The Vercel side
// always ships tier metadata on sync, so in practice this fallback only fires
// for rows synced before RP1/RP2 landed.
//
// Keep the tier labels and thresholds in lockstep with lib/threat-score.js on
// the Vercel side. If that file changes, update this block too.

type ReviewTier = "confirmed" | "high" | "elevated" | "watchlist" | "low";

interface TierInfo {
  tier: ReviewTier;
  label: string;        // Human-readable badge text ("Confirmed Scam", "Low Signal")
  badge: string;        // Short chip text ("SCAM", "CAUTION", "WATCHLIST")
  frameAsScam: boolean; // True only for confirmed + high
}

function tierFromScore(score: number): TierInfo {
  if (score >= 80) return { tier: "confirmed", label: "Confirmed Scam",        badge: "SCAM",      frameAsScam: true };
  if (score >= 60) return { tier: "high",      label: "High Risk",             badge: "HIGH RISK", frameAsScam: true };
  if (score >= 40) return { tier: "elevated",  label: "Elevated Concern",      badge: "CAUTION",   frameAsScam: false };
  if (score >= 20) return { tier: "watchlist", label: "On Watchlist",          badge: "WATCHLIST", frameAsScam: false };
  return               { tier: "low",        label: "Low Signal",            badge: "LOW",       frameAsScam: false };
}

// Resolve the tier for a review row, preferring what the Vercel sync-shape
// already classified. If the DB column is null (pre-RP1 data), compute from
// the score instead of assuming "confirmed" — that was the silent bug behind
// the Affitto Casa page rendering "CONFIRMED SCAM" at score 3.
function resolveReviewTier(row: {
  threatScore: number | null;
  threatTier: string | null;
  threatLabel: string | null;
  threatBadge: string | null;
  frameAsScam: boolean | null;
}): TierInfo {
  const score = row.threatScore ?? 0;
  const fallback = tierFromScore(score);
  const tier = (row.threatTier as ReviewTier | null) ?? fallback.tier;
  return {
    tier,
    label: row.threatLabel ?? fallback.label,
    badge: row.threatBadge ?? fallback.badge,
    frameAsScam: row.frameAsScam ?? fallback.frameAsScam,
  };
}

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

/**
 * Build the Review's itemReviewed as a standalone typed entity node.
 * Reads from `row.itemReviewed` which Vercel's sync-shape populates
 * from the writer's typed item_reviewed field (Task 7A).
 *
 * Whitelist-guarded types: FinancialProduct | Service | SoftwareApplication
 * | Organization. Fallback is "Service" — never "Thing" (which fails
 * Google's Review rich result eligibility).
 *
 * Returns null only when there's no brand name to work with; otherwise
 * always emits a usable typed node even if the writer hasn't shipped
 * item_reviewed yet (synthetic Service with the brand name + tier-aware
 * description).
 */
function itemReviewedNode(
  rawItemReviewed: unknown,
  canonical: string,
  platformName: string,
  row: { heroDescription?: string | null; summary?: string | null; threatScore?: number | null },
  tier: TierInfo,
): Record<string, unknown> | null {
  const VALID_TYPES = new Set([
    "FinancialProduct",
    "Service",
    "SoftwareApplication",
    "Organization",
  ]);
  const input = rawItemReviewed && typeof rawItemReviewed === "object"
    ? (rawItemReviewed as Record<string, unknown>)
    : null;

  const rawType = input?.type;
  const type = typeof rawType === "string" && VALID_TYPES.has(rawType)
    ? rawType
    : "Service";

  const rawName = typeof input?.name === "string" ? input.name.trim() : "";
  const name = rawName || platformName;
  if (!name) return null;

  const rawDesc = typeof input?.description === "string" ? input.description.trim() : "";
  const description = rawDesc
    ? rawDesc
    : (row.heroDescription || row.summary
        ? truncate(clean(row.heroDescription || row.summary), 250)
        : `Platform under investigation by CryptoKiller. Threat score ${row.threatScore ?? "?"}/100 (${tier.label}).`);

  const url = typeof input?.url === "string" && (input.url as string).startsWith("http")
    ? (input.url as string)
    : undefined;

  const alternateName = Array.isArray(input?.alternateName) && input.alternateName.length
    ? (input.alternateName as unknown[]).filter((v): v is string => typeof v === "string")
    : undefined;

  const sameAs = Array.isArray(input?.sameAs) && input.sameAs.length
    ? (input.sameAs as unknown[]).filter((v): v is string => typeof v === "string" && v.startsWith("http"))
    : undefined;

  return {
    "@type": type,
    "@id": `${canonical}#item-reviewed`,
    name,
    description,
    ...(url ? { url } : {}),
    ...(alternateName && alternateName.length ? { alternateName } : {}),
    ...(sameAs && sameAs.length ? { sameAs } : {}),
    // `subjectOf` links back to the Review — creates a bidirectional
    // relationship Google's entity graph ingestion uses to attribute
    // the review back to the platform entity.
    subjectOf: { "@id": `${canonical}#review` },
  };
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
        breadcrumbList([
          { label: "Home", href: `${BASE}/` },
          { label: "Blog", href: `${BASE}/blog` },
        ]),
        {
          "@type": "CollectionPage",
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

  const bodyHtml = `${siteHeaderHtml()}<main>
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

  // itemReviewed: typed entity node (Task 7B). Reads from row.itemReviewed
  // which Vercel sync-shape populates from the writer's item_reviewed field
  // (Task 7A). The Replit DB schema doesn't carry this column yet — access
  // via unchecked cast so pre-migration rows cleanly take the fallback
  // path (synthetic Service node from platformName + tier).
  const rawItemReviewed = (row as Record<string, unknown>).itemReviewed;
  const itemReviewed = itemReviewedNode(
    rawItemReviewed,
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
  const datasetNode   = buildDataset(row.dataset, canonical);
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

  const title = `${truncate(row.headline || row.title, 55)} | CryptoKiller`;
  const description = truncate(
    row.metaDescription || row.summary || row.headline || row.title,
    160,
  );
  const canonical = `${BASE}/blog/${slug}`;
  const lastModified = row.updatedAt ? new Date(row.updatedAt).toUTCString() : undefined;
  const datePublished = (row.publishedAt ?? row.createdAt) ? new Date((row.publishedAt ?? row.createdAt)!).toISOString() : undefined;
  const dateModified = row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined;

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

  const faqHtml = faq.length
    ? `<section aria-labelledby="faq-heading"><h2 id="faq-heading">Frequently Asked Questions</h2>${faq
        .map(
          (f) =>
            `<div><h3>${esc(f.question || "")}</h3><p>${esc(f.answer || "")}</p></div>`,
        )
        .join("")}</section>`
    : "";

  const sourcesHtml = sources.length
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
${summaryText ? `<p>${esc(truncate(summaryText, 500))}</p>` : ""}
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
  const aboutNodes    = resolveAbout(row.aboutSlugs);
  const mentionNodes  = resolveMentions(row.mentionSlugs);
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
    articleSection: row.contentType || "Crypto Scam Investigation",
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
        "CryptoKiller is an independent crypto scam intelligence platform operated by DEX Algo Technologies Pte Ltd. (Singapore). We track over 1,000 fraudulent crypto brands across 84+ countries through real-time ad surveillance and evidence-based investigation. Our team combines blockchain forensics, OSINT, financial-crime research, and digital forensics to publish auditable threat assessments — never pay-to-remove, always evidence first.",
    }),
  "/methodology": () =>
    renderStaticPage({
      path: "/methodology",
      title: "Investigation Methodology — CryptoKiller",
      description:
        "How CryptoKiller investigates crypto scams — evidence-based scoring, data sources, investigation process, and editorial standards backed by public data.",
      h1: "Investigation Methodology",
      intro:
        "Every CryptoKiller threat score is built from six categories of evidence: ad creative volume, geographic targeting spread, celebrity impersonation, funnel and registration patterns, regulatory and infrastructure signals, and historical pattern matching. Our editorial process moves from automated detection through evidence collection, analysis and scoring, and finally human editorial review before publication.",
    }),
  "/recovery": () =>
    renderStaticPage({
      path: "/recovery",
      title: "Crypto Scam Recovery Guide — CryptoKiller",
      description:
        "Step-by-step guide to recovering from a crypto scam. Immediate steps, reporting to authorities, chargebacks, and how to avoid recovery scams.",
      h1: "Crypto Scam Recovery Guide",
      intro:
        "If you've lost crypto to a scam: stop all payments, contact your bank, secure your accounts with new passwords and 2FA, preserve every screenshot and transaction record, report to local police and your national fraud agency, and cut all contact with the scammer. Beware of recovery scams — anyone asking for an upfront fee to recover stolen crypto is also a scammer.",
    }),
  "/report": () =>
    renderStaticPage({
      path: "/report",
      title: "Report a Crypto Scam — Submit Evidence | CryptoKiller",
      description:
        "Report a crypto scam to CryptoKiller. Your confidential report helps us investigate fraudulent platforms, warn victims, and build evidence for authorities.",
      h1: "Report a Crypto Scam",
      intro:
        "Submit a confidential report to the CryptoKiller research team. Your identity is never shared publicly. Reports are cross-referenced with our scam intelligence systems and feed directly into published investigations that warn future victims.",
    }),
  "/privacy": () =>
    renderStaticPage({
      path: "/privacy",
      title: "Privacy Policy — CryptoKiller",
      description:
        "CryptoKiller privacy policy. Learn how we collect, use, and protect your information. GDPR and CCPA compliant. No tracking cookies or third-party analytics.",
      h1: "Privacy Policy",
      intro:
        "CryptoKiller is committed to privacy. We do not use tracking cookies or third-party analytics. This policy explains what information we collect when you submit a scam report, how it is stored, and the rights you have under GDPR and CCPA.",
    }),
  "/terms": () =>
    renderStaticPage({
      path: "/terms",
      title: "Terms of Service — CryptoKiller",
      description:
        "CryptoKiller terms of service. Rules governing use of our crypto scam investigation platform, report submissions, and published content.",
      h1: "Terms of Service",
      intro:
        "These terms govern your use of CryptoKiller. By using the site or submitting a report, you agree to the rules described here covering content licensing, acceptable use, editorial corrections, and liability.",
    }),
};

export async function renderPage(rawPath: string): Promise<RenderResult> {
  const [pathOnly, queryString = ""] = rawPath.split("?");
  const search = new URLSearchParams(queryString);
  const cleaned = pathOnly.replace(/\/+$/, "") || "/";

  if (cleaned === "/") return renderHome();
  if (cleaned === "/investigations") return renderInvestigationsList(search);
  if (cleaned === "/blog") return renderBlogList();

  const reviewMatch = cleaned.match(/^\/review\/([^/]+)$/);
  if (reviewMatch) return renderReview(decodeURIComponent(reviewMatch[1]));

  const blogMatch = cleaned.match(/^\/blog\/([^/]+)$/);
  if (blogMatch) return renderBlogPost(decodeURIComponent(blogMatch[1]));

  const authorMatch = cleaned.match(/^\/author\/([^/]+)$/);
  if (authorMatch) return renderAuthor(decodeURIComponent(authorMatch[1]));

  const staticHandler = STATIC_PAGES[cleaned];
  if (staticHandler) return staticHandler();

  return renderNotFound(cleaned);
}
