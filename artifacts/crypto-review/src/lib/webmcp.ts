/**
 * WebMCP tool registration (https://webmachinelearning.github.io/webmcp/).
 *
 * Exposes CryptoKiller's real, already-public read APIs to agent-enabled
 * browsers via navigator.modelContext.provideContext(). Every tool here is
 * backed by a live endpoint that already serves unauthenticated JSON:
 *   GET /api/reviews            : list of published investigations
 *   GET /api/reviews/:slug      : one investigation (threat score, verdict)
 *   GET /api/blog               : { items: [...] } blog index
 *
 * Deliberately READ-ONLY. The scam-report form (/report) is a write action and
 * is intentionally NOT exposed: an agent-submittable report endpoint is an
 * abuse vector, and report intake should stay human-driven.
 *
 * Feature-detected and SSR-safe: no-ops in Node and in browsers without WebMCP.
 */

const SITE = "https://cryptokiller.org";

/** Minimal structural types: WebMCP is not in lib.dom yet. */
interface WebMcpToolResult {
  content: Array<{ type: "text"; text: string }>;
}
interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<WebMcpToolResult>;
}
interface ModelContext {
  provideContext?: (ctx: { tools: WebMcpTool[] }) => void;
}

function textResult(payload: unknown): WebMcpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function matches(haystack: unknown, needle: string): boolean {
  return asString(haystack).toLowerCase().includes(needle);
}

const tools: WebMcpTool[] = [
  {
    name: "search_scam_reviews",
    description:
      "Search CryptoKiller's published crypto scam investigations by brand or platform name. " +
      "Returns each match with its threat score (0-100; higher is more dangerous), the verdict, " +
      "and a link to the full investigation. Use this to check whether a crypto platform has been " +
      "investigated and how dangerous it was found to be.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Brand or platform name to search for, for example 'Valdorexa'. Omit to list recent investigations.",
        },
        limit: {
          type: "number",
          description: "Maximum results to return. Default 10, maximum 50.",
        },
      },
    },
    async execute(args) {
      const query = asString(args.query).toLowerCase().trim();
      const rawLimit = typeof args.limit === "number" ? args.limit : 10;
      const limit = Math.min(Math.max(rawLimit, 1), 50);

      const data = await getJson("/api/reviews");
      const all = Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];

      const hits = (query
        ? all.filter((r) => matches(r.platformName, query) || matches(r.slug, query))
        : all
      ).slice(0, limit);

      return textResult({
        query: query || null,
        count: hits.length,
        totalInvestigations: all.length,
        results: hits.map((r) => ({
          platform: r.platformName,
          threatScore: r.threatScore,
          verdict: r.verdict,
          investigationDate: r.investigationDate,
          url: `${SITE}/review/${asString(r.slug)}`,
        })),
      });
    },
  },
  {
    name: "get_scam_review",
    description:
      "Get the full CryptoKiller investigation for one crypto platform by its slug: threat score, " +
      "verdict, summary, named analyst, and investigation date. Get the slug from search_scam_reviews " +
      "or from a /review/<slug> URL.",
    inputSchema: {
      type: "object",
      properties: {
        slug: {
          type: "string",
          description: "The investigation slug, for example 'valdorexa' from /review/valdorexa.",
        },
      },
      required: ["slug"],
    },
    async execute(args) {
      const slug = asString(args.slug).trim();
      if (!slug) throw new Error("slug is required");

      const r = (await getJson(`/api/reviews/${encodeURIComponent(slug)}`)) as Record<string, unknown>;
      return textResult({
        platform: r.platformName,
        threatScore: r.threatScore,
        verdict: r.verdict,
        summary: r.summary,
        author: r.author,
        investigationDate: r.investigationDate,
        readingMinutes: r.readingMinutes,
        url: `${SITE}/review/${slug}`,
        disclosure:
          "Threat scores are editorially independent. CryptoKiller cannot be paid to remove or modify listings.",
      });
    },
  },
  {
    name: "search_blog_posts",
    description:
      "Search CryptoKiller's published research and guides about crypto fraud tactics, for example " +
      "pig butchering, rug pulls, phishing, deepfake celebrity ads, and recovery scams. Returns titles, " +
      "summaries, and links.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Topic to search for, for example 'deepfake' or 'pig butchering'. Omit to list recent posts.",
        },
        limit: {
          type: "number",
          description: "Maximum results to return. Default 10, maximum 50.",
        },
      },
    },
    async execute(args) {
      const query = asString(args.query).toLowerCase().trim();
      const rawLimit = typeof args.limit === "number" ? args.limit : 10;
      const limit = Math.min(Math.max(rawLimit, 1), 50);

      const data = (await getJson("/api/blog")) as Record<string, unknown>;
      const items = Array.isArray(data?.items) ? (data.items as Array<Record<string, unknown>>) : [];

      const hits = (query
        ? items.filter(
            (p) =>
              matches(p.title, query) ||
              matches(p.headline, query) ||
              matches(p.summary, query) ||
              matches(p.slug, query),
          )
        : items
      ).slice(0, limit);

      return textResult({
        query: query || null,
        count: hits.length,
        results: hits.map((p) => ({
          title: p.title || p.headline,
          summary: p.summary || p.metaDescription,
          url: `${SITE}/blog/${asString(p.slug)}`,
        })),
      });
    },
  },
];

/**
 * Register the tools with the browser's model context, if the API exists.
 * Safe to call more than once; safe on the server (no-op).
 */
export function registerWebMcpTools(): void {
  if (typeof navigator === "undefined") return;
  const ctx = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
  if (!ctx || typeof ctx.provideContext !== "function") return;
  try {
    ctx.provideContext({ tools });
  } catch (err) {
    // Never let tool registration break the page render.
    console.warn("[webmcp] provideContext failed:", err);
  }
}
