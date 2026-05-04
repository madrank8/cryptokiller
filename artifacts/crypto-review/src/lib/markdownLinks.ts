// Markdown-link stripping for prose fields.
//
// Background — observed live on /review/equiloompro 2026-05-04: the Vercel
// content writer emits markdown link syntax `[text](url)` in body prose
// (Claude's default link format), but the Replit SSR + React renderer
// don't convert markdown to HTML. Result: users and Google see literal
// `[lobsterling.com](http://lobsterling.com)` text in red-flag descriptions,
// FAQ answers, and other prose blocks. SEO-bad and visually broken.
//
// This helper strips the markdown link syntax to plain text — i.e. it
// drops the URL and keeps just the visible text. We deliberately do NOT
// convert to HTML <a> tags because:
//
//   1. YMYL safety: scam URLs being cited as evidence (lobsterling.com,
//      kerdpotker.com, etc.) should never get a clickable link or any
//      rel="dofollow" weight from cryptokiller.org. Keeping them as plain
//      text is the safest default for a fraud-investigation site.
//
//   2. Trusted URLs (regulators, FBI IC3, etc.) are already linked
//      separately via the structured `sources` and `citations` arrays
//      that have proper `<a rel="nofollow noopener">` rendering with
//      domain badges. The body prose is for narrative, not for outbound
//      navigation.
//
//   3. If we ever want clickable links in body prose for some specific
//      domains (e.g. wikipedia, archive.org), that's a separate allowlist
//      decision — not something to bake into a generic markdown converter.
//
// Pattern: `[visible text](url)` → `visible text`. Conservative regex that
// only matches single-line links with no nested brackets in either group.
// Edge cases like markdown with embedded parens (Wikipedia disambiguation
// URLs) get partially stripped — that's acceptable for the fraud-review
// content this serves.

const MARKDOWN_LINK_RE = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;

export function stripMarkdownLinks(text: string): string {
  if (typeof text !== "string" || text.length === 0) return text;
  // Fast path: skip the regex entirely if no `[` present.
  if (text.indexOf("[") === -1) return text;
  return text.replace(MARKDOWN_LINK_RE, "$1");
}

// Deep walk over a value (object/array/string/primitive), stripping
// markdown links from every string. Returns the original reference when
// nothing changed (so React `useMemo` deps stay stable on rows without
// markdown — the common case for legacy rows). Mirrors the shape of
// substituteStatTokensInReview in statTokens.ts and
// substitutePlatformStatTokensDeep in platformStatTokens.ts.
export function stripMarkdownLinksDeep<T>(value: T): T {
  if (value == null) return value;
  if (typeof value === "string") {
    return stripMarkdownLinks(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = (value as unknown[]).map((item) => {
      const next = stripMarkdownLinksDeep(item);
      if (next !== item) changed = true;
      return next;
    });
    return (changed ? (out as unknown as T) : value);
  }
  if (typeof value === "object") {
    const src = value as Record<string, unknown>;
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(src)) {
      const next = stripMarkdownLinksDeep(src[k]);
      if (next !== src[k]) changed = true;
      out[k] = next;
    }
    return (changed ? (out as unknown as T) : value);
  }
  return value;
}
