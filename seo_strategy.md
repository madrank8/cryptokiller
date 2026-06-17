# SEO Strategy

## In scope
- Public marketing pages
- Investigation listing and individual review pages
- Blog index and blog post pages
- Author pages
- Public trust and policy pages (`/about`, `/methodology`, `/privacy`, `/terms`, `/recovery`, `/report`)
- Organic visibility for both traditional search engines and AI/LLM crawlers

## Out of scope
- Authenticated or admin routes
- Internal API implementation details except where they directly affect crawlability or indexation (for example `sitemap.xml`)

## Target audience
- People researching whether a crypto platform is legitimate or a scam
- People seeking scam prevention, recovery guidance, and investigation-based trust signals
- Search engines and AI assistants looking for citable investigation content

## Primary keywords
- Unknown — likely centered on crypto scam checker, platform reviews, scam investigations, and recovery guidance.

## Dismissed categories
- (None yet)

## Notes from this scan
- Public `.md` alternates exist for agent/LLM consumption. If they remain enabled, they should stay non-indexable so they do not compete with the canonical HTML pages.
- Public author pages are in scope because they materially support trust and expertise signals on this YMYL site.
- Because this app serves simplified SSR HTML before React hydration, future SEO scans should always check SSR/CSR parity for titles, structured data, author attribution, and internal links on public pages.
- Shared metadata and schema builders should remain the source of truth for both `server/prerender.ts` and hydrated React pages so public routes do not replace correct SSR head tags with drifted client-side values or loading placeholders.
- Canonical URL policy is root `/` plus slashless non-root public URLs; `/index.html` and trailing-slash variants should be normalized with redirects instead of remaining crawlable 200 duplicates.
