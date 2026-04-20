import { eq, and, desc, sql } from "drizzle-orm";
import {
  db,
  reviewsTable,
  blogPostsTable,
  platformsTable,
  reviewStatsTable,
} from "@workspace/db";
import { WRITER_PERSONAS, type WriterPersona } from "../src/lib/writerPersonas.js";

const BASE = "https://cryptokiller.org";
const DEFAULT_OG_IMAGE = `${BASE}/opengraph.jpg`;
const ORG_ID = `${BASE}/#organization`;
const WEBSITE_ID = `${BASE}/#website`;
const LEGAL_ENTITY_ID = `${BASE}/#legal-entity`;

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
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.label,
      item: it.href,
    })),
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
      metaDescription: reviewsTable.metaDescription,
      author: reviewsTable.author,
      investigationDate: reviewsTable.investigationDate,
      updatedAt: reviewsTable.updatedAt,
      platformName: platformsTable.name,
      adCreatives: reviewStatsTable.adCreatives,
      countriesTargeted: reviewStatsTable.countriesTargeted,
      daysActive: reviewStatsTable.daysActive,
      celebritiesAbused: reviewStatsTable.celebritiesAbused,
    })
    .from(reviewsTable)
    .innerJoin(platformsTable, eq(reviewsTable.platformId, platformsTable.id))
    .leftJoin(reviewStatsTable, eq(reviewStatsTable.reviewId, reviewsTable.id))
    .where(eq(reviewsTable.slug, slug))
    .limit(1);

  if (!row || row.status !== "published") return renderNotFound(`/review/${slug}`);

  const platformName = row.platformName || slug;
  const title = `${platformName} Scam Review — Threat Score ${row.threatScore}/100 | CryptoKiller`;
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

  // Render multi-paragraph fields by splitting on newlines
  const paragraphize = (txt: string): string =>
    txt
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${esc(p)}</p>`)
      .join("");

  const bodyHtml = `${siteHeaderHtml()}<main>
<nav aria-label="Breadcrumb"><a href="/">Home</a> · <a href="/investigations">Investigations</a> · ${esc(platformName)}</nav>
<article>
<h1>${esc(platformName)} Scam Review — Threat Score ${row.threatScore}/100</h1>
<p><strong>Verdict:</strong> ${esc(row.verdict || "Confirmed scam")}</p>
${warningText ? `<p role="alert"><strong>Warning:</strong> ${esc(warningText)}</p>` : ""}
${heroText && heroText !== summaryText ? `<p>${esc(heroText)}</p>` : ""}
${summaryText ? `<section><h2>Investigation summary</h2>${paragraphize(summaryText)}</section>` : ""}
${stats.length ? `<section><h2>Investigation at a glance</h2><ul>${stats.join("")}</ul></section>` : ""}
${methodologyText ? `<section><h2>How we investigated ${esc(platformName)}</h2>${paragraphize(methodologyText)}</section>` : ""}
${disclaimerText ? `<section><h2>Editorial notes &amp; disclaimer</h2>${paragraphize(disclaimerText)}</section>` : ""}
<p><strong>Investigation by:</strong> ${esc(row.author || "CryptoKiller Research Team")}${datePublished ? ` · Published ${new Date(datePublished).toISOString().split("T")[0]}` : ""}${row.readingMinutes ? ` · ${row.readingMinutes}-minute read` : ""}</p>
<p><a href="/investigations">Back to all investigations</a> · <a href="/methodology">How we score scams</a> · <a href="/report">Report a related scam</a></p>
</article>
</main>${siteFooterHtml()}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      legalEntityNode(),
      organizationNode(),
      websiteNode(),
      breadcrumbList([
        { label: "Home", href: `${BASE}/` },
        { label: "Investigations", href: `${BASE}/investigations` },
        { label: `${platformName} Scam Review`, href: canonical },
      ]),
      {
        "@type": ["Review", "Article"],
        "@id": `${canonical}#review`,
        headline: title,
        url: canonical,
        mainEntityOfPage: canonical,
        description,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORG_ID },
        author: { "@type": "Organization", name: row.author || "CryptoKiller Research Team", url: BASE },
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        itemReviewed: {
          "@type": "Service",
          name: platformName,
          description: `Crypto trading platform reviewed for scam indicators by CryptoKiller.`,
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: Math.max(1, Math.round((100 - row.threatScore) / 20)),
          bestRating: 5,
          worstRating: 1,
        },
        reviewBody: truncate(summaryText || description, 5000),
      },
    ],
  };

  return {
    status: 200,
    title,
    description,
    canonical,
    ogType: "article",
    ogImage: DEFAULT_OG_IMAGE,
    bodyHtml,
    jsonLd,
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
    articleBodyHtml = row.fullArticle;
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

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@graph": [
      legalEntityNode(),
      organizationNode(),
      websiteNode(),
      breadcrumbList([
        { label: "Home", href: `${BASE}/` },
        { label: "Blog", href: `${BASE}/blog` },
        { label: row.headline || row.title, href: canonical },
      ]),
      {
        "@type": "Article",
        "@id": `${canonical}#article`,
        headline: truncate(row.headline || row.title, 110),
        description,
        url: canonical,
        mainEntityOfPage: canonical,
        image: heroImage,
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORG_ID },
        author: persona
          ? { "@type": "Person", name: persona.name, url: `${BASE}/author/${persona.slug}`, jobTitle: persona.role }
          : { "@type": "Organization", name: authorName, url: BASE },
        ...(datePublished ? { datePublished } : {}),
        ...(dateModified ? { dateModified } : {}),
        wordCount: row.wordCount || undefined,
      },
      ...(faq.length
        ? [
            {
              "@type": "FAQPage",
              "@id": `${canonical}#faq`,
              mainEntity: faq.map((f) => ({
                "@type": "Question",
                name: f.question || "",
                acceptedAnswer: { "@type": "Answer", text: f.answer || "" },
              })),
            },
          ]
        : []),
    ],
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
