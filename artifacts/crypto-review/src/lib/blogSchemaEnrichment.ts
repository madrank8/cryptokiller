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

  // ─── Registry expansion (Task 7B, 2026-04-24) ───────────────────────────
  // Top impersonation targets across Floventra-class scam brands, ordered
  // by domain. Any celebrity/politician missing from this list still renders
  // as a bare Person node (name only) — no fabricated URLs.
  //
  // Do NOT add entries without verifying the Wikidata QID. Wikipedia URL is
  // optional; leave off rather than guess.

  // ── Global political leaders (high impersonation risk) ──
  "antonio-guterres": {
    type: "Person", name: "António Guterres",
    wikidata: "https://www.wikidata.org/wiki/Q57246",
    wikipedia: "https://en.wikipedia.org/wiki/Ant%C3%B3nio_Guterres",
  },
  "emmanuel-macron": {
    type: "Person", name: "Emmanuel Macron",
    wikidata: "https://www.wikidata.org/wiki/Q3052772",
    wikipedia: "https://en.wikipedia.org/wiki/Emmanuel_Macron",
  },
  "giorgia-meloni": {
    type: "Person", name: "Giorgia Meloni",
    wikidata: "https://www.wikidata.org/wiki/Q1988744",
    wikipedia: "https://en.wikipedia.org/wiki/Giorgia_Meloni",
  },
  "anthony-albanese": {
    type: "Person", name: "Anthony Albanese",
    wikidata: "https://www.wikidata.org/wiki/Q705195",
    wikipedia: "https://en.wikipedia.org/wiki/Anthony_Albanese",
  },
  "christopher-luxon": {
    type: "Person", name: "Christopher Luxon",
    wikidata: "https://www.wikidata.org/wiki/Q28835405",
    wikipedia: "https://en.wikipedia.org/wiki/Christopher_Luxon",
  },
  "chris-hipkins": {
    type: "Person", name: "Chris Hipkins",
    wikidata: "https://www.wikidata.org/wiki/Q15074263",
    wikipedia: "https://en.wikipedia.org/wiki/Chris_Hipkins",
  },
  "jacinda-ardern": {
    type: "Person", name: "Jacinda Ardern",
    wikidata: "https://www.wikidata.org/wiki/Q20648460",
    wikipedia: "https://en.wikipedia.org/wiki/Jacinda_Ardern",
  },
  "mark-carney": {
    type: "Person", name: "Mark Carney",
    wikidata: "https://www.wikidata.org/wiki/Q1889302",
    wikipedia: "https://en.wikipedia.org/wiki/Mark_Carney",
  },
  "pierre-poilievre": {
    type: "Person", name: "Pierre Poilievre",
    wikidata: "https://www.wikidata.org/wiki/Q3387117",
    wikipedia: "https://en.wikipedia.org/wiki/Pierre_Poilievre",
  },
  "javier-milei": {
    type: "Person", name: "Javier Milei",
    wikidata: "https://www.wikidata.org/wiki/Q3564691",
    wikipedia: "https://en.wikipedia.org/wiki/Javier_Milei",
  },
  "cyril-ramaphosa": {
    type: "Person", name: "Cyril Ramaphosa",
    wikidata: "https://www.wikidata.org/wiki/Q317672",
    wikipedia: "https://en.wikipedia.org/wiki/Cyril_Ramaphosa",
  },
  "anwar-ibrahim": {
    type: "Person", name: "Anwar Ibrahim",
    wikidata: "https://www.wikidata.org/wiki/Q192898",
    wikipedia: "https://en.wikipedia.org/wiki/Anwar_Ibrahim",
  },
  "ferdinand-marcos-jr": {
    type: "Person", name: "Ferdinand Marcos Jr.",
    wikidata: "https://www.wikidata.org/wiki/Q5446269",
    wikipedia: "https://en.wikipedia.org/wiki/Bongbong_Marcos",
  },
  "bola-ahmed-tinubu": {
    type: "Person", name: "Bola Ahmed Tinubu",
    wikidata: "https://www.wikidata.org/wiki/Q1058076",
    wikipedia: "https://en.wikipedia.org/wiki/Bola_Tinubu",
  },
  "atiku-abubakar": {
    type: "Person", name: "Atiku Abubakar",
    wikidata: "https://www.wikidata.org/wiki/Q1141411",
    wikipedia: "https://en.wikipedia.org/wiki/Atiku_Abubakar",
  },
  "donald-tusk": {
    type: "Person", name: "Donald Tusk",
    wikidata: "https://www.wikidata.org/wiki/Q183318",
    wikipedia: "https://en.wikipedia.org/wiki/Donald_Tusk",
  },
  "andrej-babis": {
    type: "Person", name: "Andrej Babiš",
    wikidata: "https://www.wikidata.org/wiki/Q458882",
    wikipedia: "https://en.wikipedia.org/wiki/Andrej_Babi%C5%A1",
  },
  "peter-pellegrini": {
    type: "Person", name: "Peter Pellegrini",
    wikidata: "https://www.wikidata.org/wiki/Q2081049",
    wikipedia: "https://en.wikipedia.org/wiki/Peter_Pellegrini",
  },
  "aleksandar-vucic": {
    type: "Person", name: "Aleksandar Vučić",
    wikidata: "https://www.wikidata.org/wiki/Q509156",
    wikipedia: "https://en.wikipedia.org/wiki/Aleksandar_Vu%C4%8Di%C4%87",
  },
  "andrej-plenkovic": {
    type: "Person", name: "Andrej Plenković",
    wikidata: "https://www.wikidata.org/wiki/Q13412986",
    wikipedia: "https://en.wikipedia.org/wiki/Andrej_Plenkovi%C4%87",
  },
  "alice-weidel": {
    type: "Person", name: "Alice Weidel",
    wikidata: "https://www.wikidata.org/wiki/Q1569325",
    wikipedia: "https://en.wikipedia.org/wiki/Alice_Weidel",
  },
  "felipe-vi": {
    type: "Person", name: "Felipe VI",
    wikidata: "https://www.wikidata.org/wiki/Q191045",
    wikipedia: "https://en.wikipedia.org/wiki/Felipe_VI",
  },
  "arnold-schwarzenegger": {
    type: "Person", name: "Arnold Schwarzenegger",
    wikidata: "https://www.wikidata.org/wiki/Q2685",
    wikipedia: "https://en.wikipedia.org/wiki/Arnold_Schwarzenegger",
  },

  // ── Business / tech / finance ──
  "bernard-arnault": {
    type: "Person", name: "Bernard Arnault",
    wikidata: "https://www.wikidata.org/wiki/Q191037",
    wikipedia: "https://en.wikipedia.org/wiki/Bernard_Arnault",
  },
  "xavier-niel": {
    type: "Person", name: "Xavier Niel",
    wikidata: "https://www.wikidata.org/wiki/Q1207",
    wikipedia: "https://en.wikipedia.org/wiki/Xavier_Niel",
  },
  "mark-zuckerberg": {
    type: "Person", name: "Mark Zuckerberg",
    wikidata: "https://www.wikidata.org/wiki/Q36215",
    wikipedia: "https://en.wikipedia.org/wiki/Mark_Zuckerberg",
  },
  "bill-gates": {
    type: "Person", name: "Bill Gates",
    wikidata: "https://www.wikidata.org/wiki/Q5284",
    wikipedia: "https://en.wikipedia.org/wiki/Bill_Gates",
  },
  "chamath-palihapitiya": {
    type: "Person", name: "Chamath Palihapitiya",
    wikidata: "https://www.wikidata.org/wiki/Q15994614",
    wikipedia: "https://en.wikipedia.org/wiki/Chamath_Palihapitiya",
  },
  "ana-botin": {
    type: "Person", name: "Ana Botín",
    wikidata: "https://www.wikidata.org/wiki/Q459423",
    wikipedia: "https://en.wikipedia.org/wiki/Ana_Bot%C3%ADn",
  },
  "prince-alwaleed-bin-talal": {
    type: "Person", name: "Prince Alwaleed Bin Talal",
    wikidata: "https://www.wikidata.org/wiki/Q314479",
    wikipedia: "https://en.wikipedia.org/wiki/Al-Waleed_bin_Talal",
  },
  "hussein-sajwani": {
    type: "Person", name: "Hussein Sajwani",
    wikidata: "https://www.wikidata.org/wiki/Q4507019",
    wikipedia: "https://en.wikipedia.org/wiki/Hussain_Sajwani",
  },
  "antonio-horta-osorio": {
    type: "Person", name: "António Horta-Osório",
    wikidata: "https://www.wikidata.org/wiki/Q4779859",
    wikipedia: "https://en.wikipedia.org/wiki/Ant%C3%B3nio_Horta-Os%C3%B3rio",
  },
  "jack-ma": {
    type: "Person", name: "Jack Ma",
    wikidata: "https://www.wikidata.org/wiki/Q1137062",
    wikipedia: "https://en.wikipedia.org/wiki/Jack_Ma",
  },
  "robert-kuok": {
    type: "Person", name: "Robert Kuok",
    wikidata: "https://www.wikidata.org/wiki/Q1280008",
    wikipedia: "https://en.wikipedia.org/wiki/Robert_Kuok",
  },
  "luciano-hang": {
    type: "Person", name: "Luciano Hang",
    wikidata: "https://www.wikidata.org/wiki/Q30111635",
    wikipedia: "https://en.wikipedia.org/wiki/Luciano_Hang",
  },
  "aliko-dangote": {
    type: "Person", name: "Aliko Dangote",
    wikidata: "https://www.wikidata.org/wiki/Q465329",
    wikipedia: "https://en.wikipedia.org/wiki/Aliko_Dangote",
  },
  "patrick-bet-david": {
    type: "Person", name: "Patrick Bet-David",
    wikidata: "https://www.wikidata.org/wiki/Q60754815",
    wikipedia: "https://en.wikipedia.org/wiki/Patrick_Bet-David",
  },

  // ── Media / entertainment ──
  // NOTE: "cristiano-ronaldo" is already defined above — do not duplicate.
  "andres-iniesta": {
    type: "Person", name: "Andrés Iniesta",
    wikidata: "https://www.wikidata.org/wiki/Q43729",
    wikipedia: "https://en.wikipedia.org/wiki/Andr%C3%A9s_Iniesta",
  },
  "antonio-banderas": {
    type: "Person", name: "Antonio Banderas",
    wikidata: "https://www.wikidata.org/wiki/Q41142",
    wikipedia: "https://en.wikipedia.org/wiki/Antonio_Banderas",
  },
  "michelle-yeoh": {
    type: "Person", name: "Michelle Yeoh",
    wikidata: "https://www.wikidata.org/wiki/Q234819",
    wikipedia: "https://en.wikipedia.org/wiki/Michelle_Yeoh",
  },
  "andy-lau": {
    type: "Person", name: "Andy Lau",
    wikidata: "https://www.wikidata.org/wiki/Q313866",
    wikipedia: "https://en.wikipedia.org/wiki/Andy_Lau",
  },
  "nick-cheung": {
    type: "Person", name: "Nick Cheung",
    wikidata: "https://www.wikidata.org/wiki/Q544530",
    wikipedia: "https://en.wikipedia.org/wiki/Nick_Cheung",
  },
  "joey-yung": {
    type: "Person", name: "Joey Yung",
    wikidata: "https://www.wikidata.org/wiki/Q312692",
    wikipedia: "https://en.wikipedia.org/wiki/Joey_Yung",
  },
  "alan-carr": {
    type: "Person", name: "Alan Carr",
    wikidata: "https://www.wikidata.org/wiki/Q366120",
    wikipedia: "https://en.wikipedia.org/wiki/Alan_Carr_(comedian)",
  },
  "cat-deeley": {
    type: "Person", name: "Cat Deeley",
    wikidata: "https://www.wikidata.org/wiki/Q236329",
    wikipedia: "https://en.wikipedia.org/wiki/Cat_Deeley",
  },
  "alpha-blondy": {
    type: "Person", name: "Alpha Blondy",
    wikidata: "https://www.wikidata.org/wiki/Q343127",
    wikipedia: "https://en.wikipedia.org/wiki/Alpha_Blondy",
  },
  "mister-v": {
    type: "Person", name: "Mister V",
    wikidata: "https://www.wikidata.org/wiki/Q3317498",
    wikipedia: "https://en.wikipedia.org/wiki/Mister_V",
  },
  "thomas-pesquet": {
    type: "Person", name: "Thomas Pesquet",
    wikidata: "https://www.wikidata.org/wiki/Q495174",
    wikipedia: "https://en.wikipedia.org/wiki/Thomas_Pesquet",
  },

  // ── Finance/regulatory figures ──
  "jens-stoltenberg": {
    type: "Person", name: "Jens Stoltenberg",
    wikidata: "https://www.wikidata.org/wiki/Q60800",
    wikipedia: "https://en.wikipedia.org/wiki/Jens_Stoltenberg",
  },
  "joachim-nagel": {
    type: "Person", name: "Joachim Nagel",
    wikidata: "https://www.wikidata.org/wiki/Q1673488",
    wikipedia: "https://en.wikipedia.org/wiki/Joachim_Nagel",
  },
  "haruhiko-kuroda": {
    type: "Person", name: "Haruhiko Kuroda",
    wikidata: "https://www.wikidata.org/wiki/Q515961",
    wikipedia: "https://en.wikipedia.org/wiki/Haruhiko_Kuroda",
  },
  "adam-glapinski": {
    type: "Person", name: "Adam Glapiński",
    wikidata: "https://www.wikidata.org/wiki/Q4678335",
    wikipedia: "https://en.wikipedia.org/wiki/Adam_Glapi%C5%84ski",
  },
  "pierre-wunsch": {
    type: "Person", name: "Pierre Wunsch",
    wikidata: "https://www.wikidata.org/wiki/Q47499879",
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
// Canonical input shape (from Vercel's content generator):
//   { name, url, type?, publisher?, datePublished? }
// Legacy shape (from earlier iterations) was { title, url, date } — both are
// accepted here so migrated rows keep rendering even if the producer shape
// changes ahead of a data backfill. Falls back to CreativeWork if type is
// missing or unrecognised.

export interface CitationInput {
  // Canonical keys
  name?: string;
  datePublished?: string;
  // Legacy keys kept for backwards compatibility
  title?: string;
  date?: string;
  // Common to both
  url?: string;
  type?: string;
  authors?: string[];
  publisher?: string;
}

const CITATION_TYPE_WHITELIST = new Set([
  "ScholarlyArticle", "NewsArticle", "Report", "Dataset", "Book",
  "WebPage", "Article", "CreativeWork", "GovernmentService",
]);

export function buildCitations(input: unknown): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  const out: Record<string, unknown>[] = [];
  for (const c of input as CitationInput[]) {
    if (!c || typeof c !== "object" || !c.url) continue;
    // Accept either canonical `name` or legacy `title`. Skip if neither.
    const label = c.name ?? c.title;
    if (!label) continue;
    const type = c.type && CITATION_TYPE_WHITELIST.has(c.type) ? c.type : "CreativeWork";
    const node: Record<string, unknown> = {
      "@type": type,
      name: label,
      url: c.url,
    };
    if (c.publisher) node.publisher = { "@type": "Organization", name: c.publisher };
    if (Array.isArray(c.authors) && c.authors.length) {
      node.author = c.authors.map((n) => ({ "@type": "Person", name: n }));
    }
    const dp = c.datePublished ?? c.date;
    if (dp) node.datePublished = dp;
    out.push(node);
  }
  return out;
}

// ─── ClaimReview[] ──────────────────────────────────────────────────────────
// Canonical input shape (from Vercel's content generator):
//   { claimReviewed, ratingValue, ratingLabel?, originator? }
// Legacy shape was { claim, rating, firstAppearance? } — both accepted.
// Each item becomes its own schema.org ClaimReview node that Google Fact
// Check Explorer can surface. We set the reviewing Org to CryptoKiller and
// the itemReviewed to a Claim wrapping the raw claim text.

export interface ClaimInput {
  // Canonical keys
  claimReviewed?: string;
  ratingValue?: number;
  originator?: string;
  // 2026-04-24+ canonical: single URL string (or null) pointing to where the
  // false claim was made. The Vercel-side /api/admin/reviews/validate-publish
  // normalizer guarantees this shape; legacy tag-array shapes degrade to null.
  appearance?: string | string[] | null;
  // Legacy keys kept for backwards compatibility
  claim?: string;
  rating?: number;
  firstAppearance?: string;
  // Common
  ratingLabel?: string;
  claimAppearedAt?: string;
}

export function buildClaimReviews(
  input: unknown,
  pageUrl: string,
  personaName?: string,
  /**
   * Parent review/article `datePublished` threaded down so the ClaimReview
   * node inherits the publication date instead of drifting to render-time
   * `new Date()`. Omit when unknown rather than fabricate.
   */
  parentDatePublished?: string,
  /**
   * Brand name for `itemReviewed.author` when `claim.originator` is missing.
   * For a brand-level claim the originator is the brand itself; we never
   * hardcode "Unknown scam operators" — the editorial voice does not belong
   * in schema that Google Fact Check Explorer can surface.
   */
  brandName?: string,
): Record<string, unknown>[] {
  if (!Array.isArray(input)) return [];
  const out: Record<string, unknown>[] = [];
  (input as ClaimInput[]).forEach((c, i) => {
    if (!c || typeof c !== "object") return;
    // Accept either `claimReviewed` (canonical) or `claim` (legacy).
    const claimText = c.claimReviewed ?? c.claim;
    if (!claimText) return;

    // ─── appearance normalisation ───
    // Canonical 2026-04-24+ shape is a single URL string (or null). Legacy
    // shapes (tag arrays like ['ad-campaigns','fake-social-proof'], objects)
    // are treated as null so old rows gracefully degrade — we'd rather skip
    // the ClaimReview node than emit one Google will reject for a malformed
    // itemReviewed.appearance. Fall back to the legacy `firstAppearance`
    // string only when `appearance` is absent/non-string; never coerce an
    // array into anything other than null.
    let appearanceUrl: string | null = null;
    const rawApp: unknown = (c as { appearance?: unknown }).appearance;
    if (typeof rawApp === "string" && /^https?:\/\//i.test(rawApp)) {
      appearanceUrl = rawApp;
    } else if (rawApp == null && typeof c.firstAppearance === "string" && /^https?:\/\//i.test(c.firstAppearance)) {
      appearanceUrl = c.firstAppearance;
    }

    // Skip claims without a verifiable appearance URL. Google Fact Check
    // Explorer rejects ClaimReview nodes with missing itemReviewed.appearance,
    // so emitting one here is worse than omitting. The Vercel writer ships
    // `appearance: null` by default until it has a ledger-backed URL, which
    // is the correct editorial stance.
    if (!appearanceUrl) return;

    // Accept either `ratingValue` (canonical) or `rating` (legacy).
    const ratingRaw = typeof c.ratingValue === "number"
      ? c.ratingValue
      : typeof c.rating === "number"
        ? c.rating
        : 1;
    const rating = Math.max(1, Math.min(5, ratingRaw));
    const label = c.ratingLabel ?? (rating === 1 ? "False" : rating === 2 ? "Mostly False" : rating === 3 ? "Mixed" : rating === 4 ? "Mostly True" : "True");

    // `originator` is the entity that made the false claim — for a brand
    // legitimacy claim this is the brand itself (falls back to `brandName`
    // param). `appearance` is the URL where the claim surfaced.
    const authorName = c.originator || brandName;
    const itemReviewed: Record<string, unknown> = {
      "@type": "Claim",
      appearance: { "@type": "CreativeWork", url: appearanceUrl },
      ...(c.claimAppearedAt ? { datePublished: c.claimAppearedAt } : {}),
    };
    if (authorName) {
      itemReviewed.author = { "@type": "Organization", name: authorName };
    }

    out.push({
      "@type": "ClaimReview",
      "@id": `${pageUrl}#claim-${i + 1}`,
      url: `${pageUrl}#claim-${i + 1}`,
      // Inherit parent's datePublished; never fabricate with `new Date()` —
      // render-time dates drift between Article and ClaimReview, which Google
      // flags as inconsistency.
      ...(parentDatePublished ? { datePublished: parentDatePublished } : {}),
      author: personaName
        ? { "@type": "Person", name: personaName }
        : { "@id": `${BASE}/#organization` },
      claimReviewed: claimText,
      itemReviewed,
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
// Canonical input shape (from Vercel's content generator): a bare array of
//   [{ name, description?, entitySlug? }, ...]
// Legacy shape was { name?, description?, items: [{ name, url?, description? }] }.
// Both accepted. Returns null if no items.

export interface ItemListItemInput {
  name?: string;
  position?: number;
  url?: string;
  description?: string;
  // Canonical (2026-04-24+) — resolves against ENTITY_REGISTRY to attach a
  // Wikidata sameAs to a nested Person node. Entries without a matching slug
  // still render as bare Person nodes (valid schema.org).
  entitySlug?: string;
}

export interface ItemListInput {
  name?: string;
  description?: string;
  numberOfItems?: number;
  itemListOrder?: string;
  items?: ItemListItemInput[];
}

export function buildItemList(input: unknown, pageUrl: string): Record<string, unknown> | null {
  if (!input) return null;

  // Normalise both shapes into { name?, description?, numberOfItems?, itemListOrder?, items: [...] }.
  let name: string | undefined;
  let description: string | undefined;
  let numberOfItems: number | undefined;
  let itemListOrder: string | undefined;
  let items: ItemListItemInput[] = [];

  if (Array.isArray(input)) {
    // Legacy — bare array of items. Still accepted so migrated blog posts
    // that never re-synced keep rendering.
    items = input as ItemListItemInput[];
  } else if (typeof input === "object") {
    const il = input as ItemListInput;
    if (!Array.isArray(il.items) || il.items.length === 0) return null;
    name = il.name;
    description = il.description;
    numberOfItems = il.numberOfItems;
    itemListOrder = il.itemListOrder;
    items = il.items;
  } else {
    return null;
  }

  if (!items.length) return null;

  return {
    "@type": "ItemList",
    "@id": `${pageUrl}#itemlist`,
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    numberOfItems: numberOfItems ?? items.length,
    itemListOrder: itemListOrder || "https://schema.org/ItemListOrderAscending",
    itemListElement: items.map((item, i) => {
      const position = typeof item.position === "number" ? item.position : i + 1;
      // Legacy blog-post shape (items carry a `url`): keep the flat ListItem
      // form because these items aren't people — they're CreativeWork-ish
      // links and nesting them under `item: Person` would be wrong.
      if (item.url) {
        return {
          "@type": "ListItem",
          position,
          name: item.name ?? `Item ${position}`,
          url: item.url,
          ...(item.description ? { description: item.description } : {}),
        };
      }
      // Canonical celebrity-roster shape (Vercel 2026-04-24+). Each item
      // becomes a nested Person, with sameAs resolved from ENTITY_REGISTRY
      // when entitySlug matches. Unmapped names still ship as bare Person
      // nodes — valid schema.org, and we'd rather show the full roster than
      // drop celebrities we don't yet have Wikidata QIDs for.
      const entity = item.entitySlug ? ENTITY_REGISTRY[item.entitySlug] : undefined;
      const personNode: Record<string, unknown> = {
        "@type": "Person",
        name: item.name ?? `Item ${position}`,
        ...(item.description ? { description: item.description } : {}),
      };
      if (entity) {
        const sameAs: string[] = [];
        if (entity.wikidata) sameAs.push(entity.wikidata);
        if (entity.wikipedia) sameAs.push(entity.wikipedia);
        if (entity.sameAs) sameAs.push(...entity.sameAs);
        if (sameAs.length) personNode.sameAs = sameAs;
      }
      return {
        "@type": "ListItem",
        position,
        item: personNode,
      };
    }),
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
  // ─── Fields added by Vercel sync-shape normalizeDataset (2026-04-24) ───
  // See crypto-killer lib/sync-shape.js. All optional — the builder handles
  // missing/empty shapes gracefully and the Vercel side regenerates over time.
  temporalCoverage?: string;
  spatialCoverage?: string[];
  distribution?: Array<Record<string, unknown>>;
  variableMeasured?: string[];
  creator?: Record<string, unknown> | string;
}

export function buildDataset(
  input: unknown,
  /**
   * Canonical review URL used to emit a stable `@id` in the form
   * `${pageUrl}#spyowl-dataset`. This `@id` is the edge target for the
   * Article's `isBasedOn` reference, so the suffix MUST stay in sync with
   * the one emitted by the caller (see prerender.ts / BlogPostPage.tsx).
   * Omit when unknown — the Dataset still emits, just without `@id`, and
   * the `isBasedOn` edge gets skipped in the caller.
   */
  pageUrl?: string,
): Record<string, unknown> | null {
  if (!input || typeof input !== "object") return null;
  const d = input as DatasetInput;
  if (!d.name || !d.description) return null;

  // spatialCoverage: string[] of country names → schema.org/Place objects.
  // Empty array → omit entirely (dangling "spatialCoverage": [] is worse than
  // absence for Google Dataset Search's geo-facet indexing).
  const spatialPlaces = Array.isArray(d.spatialCoverage)
    ? d.spatialCoverage
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((country) => ({ "@type": "Place", name: country }))
    : [];

  // distribution: pass through verbatim when non-empty. The Vercel
  // normalizeDataset already shapes these as DataDownload nodes, so we trust
  // upstream; if it's missing we do NOT synthesize placeholders client-side.
  //
  // Defense-in-depth: rewrite legacy `crypto-killer.base44.app` contentUrls
  // to `cryptokiller.org`. Root cause is the stale NEXT_PUBLIC_SITE_URL env
  // var on Vercel; fixing it there will make this rewrite a no-op. Leaving
  // it in place so older payloads or a future env-var regression don't
  // ship broken Dataset URLs that Google Dataset Search will reject.
  const rewriteContentUrl = (url: unknown): string | null => {
    if (typeof url !== "string") return null;
    return url.replace(/^https?:\/\/crypto-killer\.base44\.app/i, "https://cryptokiller.org");
  };
  const distribution = Array.isArray(d.distribution) && d.distribution.length
    ? d.distribution.map((dist) => {
        if (!dist || typeof dist !== "object") return dist;
        const rewritten = rewriteContentUrl((dist as Record<string, unknown>).contentUrl);
        return rewritten
          ? { ...(dist as Record<string, unknown>), contentUrl: rewritten }
          : dist;
      })
    : undefined;

  const variableMeasured = Array.isArray(d.variableMeasured) && d.variableMeasured.length
    ? d.variableMeasured
    : undefined;

  return {
    "@type": "Dataset",
    ...(pageUrl ? { "@id": `${pageUrl}#spyowl-dataset` } : {}),
    name: d.name,
    description: d.description,
    ...(d.url ? { url: d.url } : {}),
    ...(d.license ? { license: d.license } : {}),
    ...(d.keywords ? { keywords: d.keywords } : {}),
    ...(d.dateModified ? { dateModified: d.dateModified } : {}),
    ...(d.size ? { size: d.size } : {}),
    ...(d.measurementTechnique ? { measurementTechnique: d.measurementTechnique } : {}),
    ...(d.temporalCoverage ? { temporalCoverage: d.temporalCoverage } : {}),
    ...(variableMeasured ? { variableMeasured } : {}),
    ...(spatialPlaces.length ? { spatialCoverage: spatialPlaces } : {}),
    ...(distribution ? { distribution } : {}),
    // Creator: pass through upstream attribution (e.g. the SpyOwl research
    // feed) when provided; fall back to CryptoKiller. Publisher always
    // resolves to CryptoKiller regardless — the Dataset is published by us.
    creator: d.creator ?? { "@id": `${BASE}/#organization` },
    publisher: { "@id": `${BASE}/#organization` },
  };
}

// ─── Quotation[] ────────────────────────────────────────────────────────────

// ─── Quotation[] ────────────────────────────────────────────────────────────
// Canonical input shape (from Vercel's content generator):
//   { text, speakerName?, speakerSlug?, citationUrl?, publishedDate? }
// Legacy shape was { text, spokenBy, spokenByRole?, source?, sourceUrl?, date? }.
// Both accepted.

export interface QuoteInput {
  text?: string;
  // Canonical keys
  speakerName?: string;
  speakerSlug?: string;
  citationUrl?: string;
  publishedDate?: string;
  // Legacy keys kept for backwards compatibility
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
    // Speaker: accept canonical `speakerName` or legacy `spokenBy`.
    const speaker = q.speakerName ?? q.spokenBy;
    if (speaker) {
      node.spokenByCharacter = {
        "@type": "Person",
        name: speaker,
        ...(q.spokenByRole ? { jobTitle: q.spokenByRole } : {}),
      };
    }
    // Source: accept canonical `citationUrl` or legacy `source`/`sourceUrl`.
    const srcUrl = q.citationUrl ?? q.sourceUrl;
    const srcName = q.source;
    const srcDate = q.publishedDate ?? q.date;
    if (srcUrl || srcName) {
      node.isBasedOn = {
        "@type": "CreativeWork",
        ...(srcName ? { name: srcName } : {}),
        ...(srcUrl ? { url: srcUrl } : {}),
        ...(srcDate ? { datePublished: srcDate } : {}),
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
