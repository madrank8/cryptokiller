// ─────────────────────────────────────────────────────────────────────────────
// Blog schema enrichment (v1)
// ─────────────────────────────────────────────────────────────────────────────
// Shared generator for the extended schema.org @graph nodes that sit on top of
// the Article + FAQPage + BreadcrumbList base graph emitted by renderBlogPost
// (server/prerender.ts) and BlogPostPage (pages/BlogPostPage.tsx).
//
// Why this file lives under artifacts/crypto-review/src/lib/ rather than
// lib/db: the Vite client bundle needs these builders to run on hydration,
// and the SSR prerender imports them too (esbuild bundles the server, so a
// relative import from server/prerender.ts is fine). Keeping one source of
// truth avoids schema drift between SSR and client output.
//
// DB fields consumed (all optional, with safe defaults):
//   about_slugs[], mention_slugs[], speakable_selectors[], citations[],
//   dataset, item_list, how_to, quotes[], claims[], alternative_headline
//
// See lib/db/src/schema/blog_posts.ts and lib/db/migrations/0001_schema_enrichment.sql.
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://cryptokiller.org";

// ─── Entity registry ────────────────────────────────────────────────────────
// Maps local slugs → canonical schema.org/Wikidata refs. This is the single
// choke-point where we resolve "elon-musk" → the rich Person node Google
// recognises. Keep this alphabetical and only add entities actually mentioned
// in published content — every entry ships in every page bundle.
//
// Fields:
//   type        — schema.org @type (Person, Organization, Thing, Event, …)
//   name        — canonical display name
//   wikidata    — Wikidata QID URL (becomes sameAs[0])
//   wikipedia?  — Wikipedia URL (becomes sameAs[1] when present)
//   description?— short schema.org description (optional)

export interface Entity {
  type: "Person" | "Organization" | "Thing" | "Event" | "CreativeWork" | "Place" | "SoftwareApplication";
  name: string;
  wikidata?: string;
  wikipedia?: string;
  description?: string;
  sameAs?: string[]; // extra refs (e.g. official site)
}

export const ENTITY_REGISTRY: Record<string, Entity> = {
  // ── People
  "elon-musk": {
    type: "Person", name: "Elon Musk",
    wikidata: "https://www.wikidata.org/wiki/Q317521",
    wikipedia: "https://en.wikipedia.org/wiki/Elon_Musk",
  },
  "kim-kardashian": {
    type: "Person", name: "Kim Kardashian",
    wikidata: "https://www.wikidata.org/wiki/Q186304",
    wikipedia: "https://en.wikipedia.org/wiki/Kim_Kardashian",
  },
  "brock-pierce": {
    type: "Person", name: "Brock Pierce",
    wikidata: "https://www.wikidata.org/wiki/Q1001523",
    wikipedia: "https://en.wikipedia.org/wiki/Brock_Pierce",
  },
  "warren-buffett": {
    type: "Person", name: "Warren Buffett",
    wikidata: "https://www.wikidata.org/wiki/Q47213",
    wikipedia: "https://en.wikipedia.org/wiki/Warren_Buffett",
  },
  "mrbeast": {
    type: "Person", name: "MrBeast",
    wikidata: "https://www.wikidata.org/wiki/Q30618511",
    wikipedia: "https://en.wikipedia.org/wiki/MrBeast",
  },
  "donald-trump": {
    type: "Person", name: "Donald Trump",
    wikidata: "https://www.wikidata.org/wiki/Q22686",
    wikipedia: "https://en.wikipedia.org/wiki/Donald_Trump",
  },
  "cristiano-ronaldo": {
    type: "Person", name: "Cristiano Ronaldo",
    wikidata: "https://www.wikidata.org/wiki/Q11571",
    wikipedia: "https://en.wikipedia.org/wiki/Cristiano_Ronaldo",
  },
  "jeff-bezos": {
    type: "Person", name: "Jeff Bezos",
    wikidata: "https://www.wikidata.org/wiki/Q312556",
    wikipedia: "https://en.wikipedia.org/wiki/Jeff_Bezos",
  },
  "martin-lewis": {
    type: "Person", name: "Martin Lewis",
    wikidata: "https://www.wikidata.org/wiki/Q6775833",
    wikipedia: "https://en.wikipedia.org/wiki/Martin_Lewis_(financial_journalist)",
  },
  "gary-gensler": {
    type: "Person", name: "Gary Gensler",
    wikidata: "https://www.wikidata.org/wiki/Q5525087",
    wikipedia: "https://en.wikipedia.org/wiki/Gary_Gensler",
  },

  // ── Organisations (regulators + platforms)
  "sec": {
    type: "Organization", name: "U.S. Securities and Exchange Commission",
    wikidata: "https://www.wikidata.org/wiki/Q957664",
    wikipedia: "https://en.wikipedia.org/wiki/U.S._Securities_and_Exchange_Commission",
  },
  "ftc": {
    type: "Organization", name: "Federal Trade Commission",
    wikidata: "https://www.wikidata.org/wiki/Q465381",
    wikipedia: "https://en.wikipedia.org/wiki/Federal_Trade_Commission",
  },
  "fca": {
    type: "Organization", name: "Financial Conduct Authority",
    wikidata: "https://www.wikidata.org/wiki/Q953706",
    wikipedia: "https://en.wikipedia.org/wiki/Financial_Conduct_Authority",
  },
  "fbi": {
    type: "Organization", name: "Federal Bureau of Investigation",
    wikidata: "https://www.wikidata.org/wiki/Q8333",
    wikipedia: "https://en.wikipedia.org/wiki/Federal_Bureau_of_Investigation",
  },
  "boston-university": {
    type: "Organization", name: "Boston University",
    wikidata: "https://www.wikidata.org/wiki/Q49110",
    wikipedia: "https://en.wikipedia.org/wiki/Boston_University",
  },
  "meta-platforms": {
    type: "Organization", name: "Meta Platforms",
    wikidata: "https://www.wikidata.org/wiki/Q380",
    wikipedia: "https://en.wikipedia.org/wiki/Meta_Platforms",
  },
  "youtube": {
    type: "Organization", name: "YouTube",
    wikidata: "https://www.wikidata.org/wiki/Q866",
    wikipedia: "https://en.wikipedia.org/wiki/YouTube",
  },
  "facebook": {
    type: "Organization", name: "Facebook",
    wikidata: "https://www.wikidata.org/wiki/Q355",
    wikipedia: "https://en.wikipedia.org/wiki/Facebook",
  },
  "tiktok": {
    type: "Organization", name: "TikTok",
    wikidata: "https://www.wikidata.org/wiki/Q47317280",
    wikipedia: "https://en.wikipedia.org/wiki/TikTok",
  },

  // ── Concepts / scam typologies (schema.org/Thing)
  "ethereummax": {
    type: "SoftwareApplication", name: "EthereumMax",
    wikidata: "https://www.wikidata.org/wiki/Q111478456",
    description: "Cryptocurrency token at the centre of a 2022 SEC settlement involving Kim Kardashian for undisclosed promotion.",
  },
  "deepfake": {
    type: "Thing", name: "Deepfake",
    wikidata: "https://www.wikidata.org/wiki/Q33149770",
    wikipedia: "https://en.wikipedia.org/wiki/Deepfake",
    description: "Synthetic media in which a person's likeness is replaced or manipulated using deep learning techniques.",
  },
  "pig-butchering": {
    type: "Thing", name: "Pig-butchering scam",
    wikipedia: "https://en.wikipedia.org/wiki/Pig_butchering_scam",
    description: "Long-form investment fraud pattern combining romance/friendship grooming with fake trading platforms, originating from Chinese shā zhū pán.",
  },
  "celebrity-endorsement-scam": {
    type: "Thing", name: "Celebrity endorsement scam",
    description: "Investment-fraud pattern using unauthorised likeness, voice, or video of a celebrity to lure victims to a fake platform.",
  },
};

// ─── Utilities ──────────────────────────────────────────────────────────────

function entityToNode(entity: Entity): Record<string, unknown> {
  const sameAs: string[] = [];
  if (entity.wikidata) sameAs.push(entity.wikidata);
  if (entity.wikipedia) sameAs.push(entity.wikipedia);
  if (entity.sameAs) sameAs.push(...entity.sameAs);
  const node: Record<string, unknown> = { "@type": entity.type, name: entity.name };
  if (sameAs.length) node.sameAs = sameAs;
  if (entity.description) node.description = entity.description;
  return node;
}

function resolveEntitySlugs(slugs: unknown): Record<string, unknown>[] {
  if (!Array.isArray(slugs)) return [];
  const out: Record<string, unknown>[] = [];
  for (const raw of slugs) {
    if (typeof raw !== "string") continue;
    const entity = ENTITY_REGISTRY[raw];
    if (entity) out.push(entityToNode(entity));
  }
  return out;
}

// ─── Nodes / array builders ─────────────────────────────────────────────────

export function resolveAbout(slugs: unknown): Record<string, unknown>[] {
  return resolveEntitySlugs(slugs);
}

export function resolveMentions(slugs: unknown): Record<string, unknown>[] {
  return resolveEntitySlugs(slugs);
}

// ─── Citation[] (schema.org citation property on Article) ───────────────────
// Accepts { title, url, type?, authors?, publisher?, date? }[]. Falls back to
// CreativeWork if type is missing or unrecognised.

export interface CitationInput {
  title?: string;
  url?: string;
  type?: string;
  authors?: string[];
  publisher?: string;
  date?: string;
}

const CITATION_TYPE_WHITELIST = new Set([
  "ScholarlyArticle", "NewsArticle", "Report", "Dataset", "Book",
  "WebPage", "Article", "CreativeWork",
]);

export function buildCitations(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  const out: Record<string, unknown>[] = [];
  for (const c of input as CitationInput[]) {
    if (!c || typeof c !== "object" || !c.url || !c.title) continue;
    const type = c.type && CITATION_TYPE_WHITELIST.has(c.type) ? c.type : "CreativeWork";
    const node: Record<string, unknown> = {
      "@type": type,
      name: c.title,
      url: c.url,
    };
    if (c.publisher) node.publisher = { "@type": "Organization", name: c.publisher };
    if (Array.isArray(c.authors) && c.authors.length) {
      node.author = c.authors.map((n) => ({ "@type": "Person", name: n }));
    }
    if (c.date) node.datePublished = c.date;
    out.push(node);
  }
  return out;
}

// ─── ClaimReview[] ──────────────────────────────────────────────────────────
// Array of { claim: string, rating: 1-5, ratingLabel?: string }. Each item
// becomes its own schema.org ClaimReview node that Google Fact Check Explorer
// can surface. We set the reviewing Org to CryptoKiller and the itemReviewed
// to a Claim wrapping the raw claim text.

export interface ClaimInput {
  claim?: string;
  rating?: number;
  ratingLabel?: string;
  claimAppearedAt?: string;
  firstAppearance?: string;
}

export function buildClaimReviews(
  input: unknown,
  pageUrl: string,
  personaName?: string,
): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  const out: Record<string, unknown>[] = [];
  (input as ClaimInput[]).forEach((c, i) => {
    if (!c || typeof c !== "object" || !c.claim) return;
    const rating = typeof c.rating === "number" ? Math.max(1, Math.min(5, c.rating)) : 1;
    const label = c.ratingLabel ?? (rating === 1 ? "False" : rating === 2 ? "Mostly False" : rating === 3 ? "Mixed" : rating === 4 ? "Mostly True" : "True");
    out.push({
      "@type": "ClaimReview",
      "@id": `${pageUrl}#claim-${i + 1}`,
      url: `${pageUrl}#claim-${i + 1}`,
      datePublished: new Date().toISOString().slice(0, 10),
      author: personaName
        ? { "@type": "Person", name: personaName }
        : { "@id": `${BASE}/#organization` },
      claimReviewed: c.claim,
      itemReviewed: {
        "@type": "Claim",
        appearance: c.firstAppearance ? { "@type": "CreativeWork", url: c.firstAppearance } : undefined,
        datePublished: c.claimAppearedAt,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: rating,
        bestRating: 5,
        worstRating: 1,
        alternateName: label,
      },
    });
  });
  return out;
}

// ─── ItemList (ranked list node) ────────────────────────────────────────────
// Accepts { name?, items: [{ name, url?, description? }] } and emits a single
// ItemList node. Returns null if missing.

export interface ItemListInput {
  name?: string;
  description?: string;
  items?: Array<{ name?: string; url?: string; description?: string }>;
}

export function buildItemList(input: unknown, pageUrl: string): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const il = input as ItemListInput;
  if (!Array.isArray(il.items) || il.items.length === 0) return null;
  return {
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    ...(il.name ? { name: il.name } : {}),
    ...(il.description ? { description: il.description } : {}),
    numberOfItems: il.items.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: il.items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name ?? `Item ${i + 1}`,
      ...(item.url ? { url: item.url } : {}),
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}

// ─── HowTo ──────────────────────────────────────────────────────────────────
// Accepts { name?, description?, totalTime?, steps: [{ name, text, url? }] }.

export interface HowToInput {
  name?: string;
  description?: string;
  totalTime?: string; // ISO 8601 duration, e.g. "PT15M"
  steps?: Array<{ name?: string; text?: string; url?: string }>;
}

export function buildHowTo(input: unknown, pageUrl: string): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const h = input as HowToInput;
  if (!Array.isArray(h.steps) || h.steps.length === 0) return null;
  return {
    "@type": "HowTo",
    "@id": `${pageUrl}#howto`,
    name: h.name ?? "Verification protocol",
    ...(h.description ? { description: h.description } : {}),
    ...(h.totalTime ? { totalTime: h.totalTime } : {}),
    step: h.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name ?? `Step ${i + 1}`,
      text: s.text ?? "",
      ...(s.url ? { url: s.url } : {}),
    })),
  };
}

// ─── Dataset ────────────────────────────────────────────────────────────────
// Accepts { name, description, url?, license?, keywords? }. Useful when a post
// references an original CryptoKiller research dataset (e.g. creative indexes).

export interface DatasetInput {
  name?: string;
  description?: string;
  url?: string;
  license?: string;
  keywords?: string[] | string;
  dateModified?: string;
  size?: string;
  measurementTechnique?: string;
}

export function buildDataset(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const d = input as DatasetInput;
  if (!d.name || !d.description) return null;
  return {
    "@type": "Dataset",
    name: d.name,
    description: d.description,
    ...(d.url ? { url: d.url } : {}),
    ...(d.license ? { license: d.license } : {}),
    ...(d.keywords ? { keywords: d.keywords } : {}),
    ...(d.dateModified ? { dateModified: d.dateModified } : {}),
    ...(d.size ? { size: d.size } : {}),
    ...(d.measurementTechnique ? { measurementTechnique: d.measurementTechnique } : {}),
    creator: { "@id": `${BASE}/#organization` },
    publisher: { "@id": `${BASE}/#organization` },
  };
}

// ─── Quotation[] ────────────────────────────────────────────────────────────

export interface QuoteInput {
  text?: string;
  spokenBy?: string;
  spokenByRole?: string;
  source?: string;
  sourceUrl?: string;
  date?: string;
}

export function buildQuotations(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  const out: Record<string, unknown>[] = [];
  for (const q of input as QuoteInput[]) {
    if (!q || typeof q !== "object" || !q.text) continue;
    const node: Record<string, unknown> = {
      "@type": "Quotation",
      text: q.text,
    };
    if (q.spokenBy) {
      node.spokenByCharacter = {
        "@type": "Person",
        name: q.spokenBy,
        ...(q.spokenByRole ? { jobTitle: q.spokenByRole } : {}),
      };
    }
    if (q.source || q.sourceUrl) {
      node.isBasedOn = {
        "@type": "CreativeWork",
        ...(q.source ? { name: q.source } : {}),
        ...(q.sourceUrl ? { url: q.sourceUrl } : {}),
        ...(q.date ? { datePublished: q.date } : {}),
      };
    }
    out.push(node);
  }
  return out;
}

// ─── Speakable ──────────────────────────────────────────────────────────────
// Emits a SpeakableSpecification node. Selectors default to [".ck-key-takeaways"]
// which targets our "Key Takeaways" block in article bodies (set by the
// processContentBody regex in artifacts/api-server/src/routes/blog.ts).

export function buildSpeakable(selectors: unknown): Record<string, unknown> {
  const css = Array.isArray(selectors) && selectors.length > 0
    ? (selectors as unknown[]).filter((s): s is string => typeof s === "string")
    : [".ck-key-takeaways", "h1", ".article-summary"];
  return {
    "@type": "SpeakableSpecification",
    cssSelector: css,
  };
}

// ─── Publisher logo (full ImageObject) ──────────────────────────────────────
// Google Rich Results requires Article.publisher.logo to be an ImageObject,
// not just a URL string. We upgrade the base Organization node's logo to a
// full ImageObject at render time so existing sameAs/description stay intact.

export function publisherLogoImage(): Record<string, unknown> {
  return {
    "@type": "ImageObject",
    "@id": `${BASE}/#organization-logo`,
    url: `${BASE}/logo.png`,
    contentUrl: `${BASE}/logo.png`,
    width: 512,
    height: 512,
    caption: "CryptoKiller logo",
  };
}

// ─── Hero image with width/height (Article.image) ───────────────────────────
// Rich Results requires image width ≥ 1200 and explicit dimensions. If the
// hero image has no known dims, we default to 1200×630 which is our OG shape.

export function heroImageNode(
  url: string,
  alt: string | null,
): Record<string, unknown> {
  return {
    "@type": "ImageObject",
    url,
    width: 1200,
    height: 630,
    ...(alt ? { caption: alt } : {}),
  };
}
