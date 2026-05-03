# CryptoKiller — Architecture

This is the public-site monorepo. Live at [cryptokiller.org](https://cryptokiller.org). For the editorial CMS / content generation backend, see the companion repo [`madrank8/crypto-killer`](https://github.com/madrank8/crypto-killer).

## The 3-tier system

```
┌─────────────────────────────┐      ┌──────────────────┐      ┌────────────────────────────────┐
│  CMS · Content generation   │      │     Staging      │      │        Public site             │
│  github.com/madrank8/       │ ──► │     Supabase     │ ◄── │  github.com/madrank8/          │
│  crypto-killer              │      │   (Postgres)     │      │  cryptokiller   ← THIS REPO    │
│                             │      │                  │      │                                │
│  Next.js 14 · Vercel        │      │  reviews         │      │  Vite + React + Express        │
│  AI SDK (Claude/OpenAI/     │      │  scam_brands     │      │  Drizzle ORM · pnpm monorepo   │
│  Gemini multi-agent)        │      │  creatives ~76k  │      │  Replit hosting · own Postgres │
│  Admin UI + scraper         │      │  sync_runs       │      │  SSR (Express) + CSR (React)   │
└─────────────────────────────┘      └──────────────────┘      └────────────────────────────────┘
              │                                                             ▲
              │                          POST /api/sync/review               │
              └─────────────────────────────────────────────────────────────┘
                                    Bearer ${SYNC_SECRET}
```

The two databases are intentionally separate:

- **Supabase** (Vercel side) is the editorial workspace — drafts, brand intelligence, scraper output, sync logs.
- **Replit Postgres** (this repo) is the live read store — published reviews only, denormalized into many small tables for fast paginated queries.

The sync endpoint is a webhook, not a shared connection. Vercel posts the canonical review row + brand stats; Replit denormalizes JSON arrays into child tables (`red_flags`, `faq_items`, `funnel_stages`, etc.).

For the field-level mapping, see [`crypto-killer/SYNC-ARCHITECTURE.md`](https://github.com/madrank8/crypto-killer/blob/main/SYNC-ARCHITECTURE.md) (Vercel repo).

## Monorepo layout (this repo)

```
artifacts/
├── api-server/          Express API serving /reviews, /reports, /sync/review, /healthz
├── crypto-review/       The public site (Vite + React + SSR)
│   ├── server/
│   │   ├── prerender.ts → renderReview, renderBlogPost  (the @graph builders)
│   │   └── index.ts      Express SSR wrapper
│   ├── src/
│   │   ├── pages/        ReviewPage, BlogPostPage, AboutPage, …
│   │   ├── components/
│   │   ├── hooks/        usePageMeta (head meta + JSON-LD injection)
│   │   └── lib/
│   │       ├── writerPersonas.ts        WRITER_PERSONAS registry (Webb, Nair, Ortiz, Pepi, Majithia)
│   │       ├── statTokens.ts            {{stat:KEY}} substitution helper (see below)
│   │       ├── schemaBuilder.ts         Organization / WebSite / Person nodes
│   │       ├── reviewItemReviewedSchema.ts
│   │       ├── blogSchemaMap.ts
│   │       └── blogSchemaEnrichment.ts
│   └── public/
│       ├── index.html    Static shell; <head> contains twitter:site, og:*, favicon
│       └── llms.txt      AI crawler manifest
└── mockup-sandbox/      Component playground

lib/
├── api-spec/            OpenAPI 3.1 source-of-truth for /api/*
├── api-client-react/    Generated React Query hooks (orval)
├── db/                  Drizzle schema (single source for both api-server + Vite client)
└── …
```

## Render layer

Two render functions in `prerender.ts` produce the SSR HTML + JSON-LD `@graph` that Googlebot sees pre-JS:

| Function | Used for | Key data sources |
|---|---|---|
| `renderReview(slug)` | `/review/<slug>` (per-platform investigations like quantum-ai) | Drizzle SELECT from `reviewsTable` + child tables |
| `renderBlogPost(slug)` | `/blog/<slug>` (topical articles like romance-scammer-red-flags) | Drizzle SELECT from `blogPostsTable` + curated schema map |

The Vite/React client hydrates over the SSR output. Both paths must produce equivalent JSON-LD or AI Overview crawlers see drift between cached SSR and live CSR.

### What the SSR layer renders, what the React client renders

A comment in the Vercel writer (`crypto-killer/app/api/admin/content/fill/route.js`) marks this contract:

> Vercel writers do NOT inline `article.summary`, FAQ, source ledger, or Article/FAQPage JSON-LD. Those are rendered by `prerender.ts → renderBlogPost` from the structured `summary`, `faq`, `sources` columns and from the `@graph` builder.

This avoids the duplicate intro / duplicate FAQ / double JSON-LD bug seen on `romance-scammer-red-flags` (commit `4822c58`). When in doubt: **structured columns are the source of truth; renderer composes them.**

## JSON-LD `@graph`

Every review/article ships a single `<script type="application/ld+json">` in `<head>` containing an `@graph` array. The major nodes:

- `Organization` (CryptoKiller) + `Organization` (DEX Algo Technologies Pte Ltd. — `parentOrganization`)
- `WebSite` with SearchAction
- `Person` per analyst (resolved from `WRITER_PERSONAS` via `review.author_persona_id` / `blog_post.author_persona_id`) — includes `hasCredential`
- `BreadcrumbList`
- `Service` / `FinancialProduct` / `SoftwareApplication` / `Organization` for the reviewed entity (typed via `review.item_reviewed`)
- `Review` with `reviewRating`, `citation[]`, `speakable`, `isBasedOn → Dataset`
- `FAQPage`
- `Dataset` (CC-BY 4.0) with `temporalCoverage`, `variableMeasured`, `spatialCoverage`
- For articles: `Article.about[]` (Wikidata `sameAs`), `Article.mentions[]`, `ClaimReview[]`, optional `HowTo` / `ItemList`

Schema-bearing columns on `reviews` / `blog_posts`: `about_slugs`, `mention_slugs`, `citations`, `speakable_selectors`, `dataset`, `item_reviewed`, `claims`. The renderer composes these into the graph via helpers in `src/lib/`.

## Stat-token system (live numbers in prose)

Body prose is generated **once** at write-time on the Vercel side and persists as static text. Stats (`review_stats.{ad_creatives, countries_targeted, days_active, celebrities_abused, weekly_velocity, first_detected, last_active}`) update continuously from the SpyOwl scraper. Without intervention they drift apart — same page tells two different stories.

Solution: writers emit `{{stat:KEY}}` tokens; renderer substitutes live values on every render.

```
{{stat:ad_creatives}}        → 2,909         (locale formatted, default)
{{stat:ad_creatives|raw}}    → 2909
{{stat:ad_creatives|short}}  → 2.9k
{{stat:countries_targeted}}  → 45
{{stat:days_active}}         → 227
{{stat:celebrities_abused}}  → 56
{{stat:weekly_velocity}}     → 104
{{stat:first_detected}}      → January 8, 2025      (long format)
{{stat:first_detected|iso}}  → 2025-01-08
{{stat:last_active}}         → April 24, 2026
{{stat:last_active|iso}}     → 2026-04-24
```

Implementation: `artifacts/crypto-review/src/lib/statTokens.ts`. Applied in:

- `server/prerender.ts → renderReview` (SSR path) — substitutes `row` + child arrays once after DB fetch
- `src/pages/ReviewPage.tsx → ReviewContent` (CSR path) — `useMemo` wrapping `useGetReview`'s result

Both call the same helper so the rule lives in exactly one place. Backwards compatible — prose without tokens is a no-op pass-through.

The `Dataset.description` is overridden by `datasetJsonAlignedWithReviewStats()` in `prerender.ts` — that function reads `review_stats` directly. So even rows still on frozen-number prose get a correct `Dataset.description` in JSON-LD; only the visible body lags until regeneration.

## Author persona system

Reviews and articles attribute analysis to one of five named analysts in `src/lib/writerPersonas.ts`:

| Slug | Name | Role |
|---|---|---|
| `webb` | M. Webb | Senior Threat Analyst — Blockchain Forensics, OSINT, Cybercrime Investigation |
| `nair` | P. Nair | Financial Crime Researcher — Trust & Safety background |
| `ortiz` | D. Ortiz | Digital Forensics Specialist — DeFi, smart contracts |
| `pepi` | K. Pepi | Financial Crime Researcher & Author — AML, money laundering |
| `majithia` | Y. Majithia | Senior Crypto Journalist — SEO/AEO/GEO, B2B FinTech |

The `reviews.author_persona_id` / `blog_posts.author_persona_id` columns hold the slug. The visible byline AND the JSON-LD `Person` node both resolve through the same `WRITER_PERSONAS` lookup so they never drift. Fallback: if the column is null, byline reads `reviews.author` (legacy free-text) and schema falls back to the `webb` persona.

Pre-migration rows with `author_persona_id IS NULL` will need a one-shot backfill (regenerate via Vercel admin route) before they show a personal byline.

## API surface

OpenAPI 3.1 spec at `lib/api-spec/openapi.yaml`. Generated React Query hooks at `lib/api-client-react/src/generated/`. Re-run orval after schema changes.

| Route | Purpose |
|---|---|
| `GET /api/healthz` | Liveness |
| `GET /api/reviews` | Published review list (summary fields) |
| `GET /api/reviews/:slug` | Full review with denormalized child tables |
| `GET /api/reviews/:slug/related` | High-threat related reviews |
| `POST /api/reports` | Public scam report intake |
| `POST /api/sync/review` | **Webhook from Vercel CMS** — Bearer `SYNC_SECRET` |

## Required env vars

| Name | Purpose |
|---|---|
| `DATABASE_URL` | Replit Postgres connection |
| `PORT` | Express bind port (Replit-provided) |
| `SYNC_SECRET` | Shared bearer token; matches the Vercel side |
| `CRYPTOKILLER_LINKEDIN_URL` (optional) | Override `Organization.sameAs` LinkedIn entry |
| `CRYPTOKILLER_TWITTER_URL` (optional) | Override Twitter/X entry |
| `CRYPTOKILLER_CRUNCHBASE_URL` (optional) | Override Crunchbase entry |
| `CRYPTOKILLER_GITHUB_URL` (optional) | Override GitHub entry |
| `CRYPTOKILLER_WIKIDATA_URL` (optional) | Override Wikidata entry |

When the CRYPTOKILLER_*_URL vars are unset, the fallback list in `prerender.ts → organizationSameAs` and `schemaBuilder.ts → organizationSameAs` is used.

## Common gotchas

- **Two repos, one product.** When something is broken on the live site, the fix may live on the Vercel side (writer/admin/scraper), not here. Schema generation = Vercel; schema rendering + body display = here.
- **Body / stats drift on legacy reviews** is expected until the prose is regenerated against the stat-token writer prompt. Don't try to "fix" body numbers in the renderer — that's what the token system handles.
- **`buildArticleHtml` in the Vercel `app/api/admin/content/fill/route.js` deliberately skips emitting `article.summary`, FAQ, sources, and Article/FAQPage JSON-LD.** If you see a duplicate intro paragraph or two FAQ sections on a published article, something on this side started rendering data that should have been deduped against the structured columns. Check `prerender.ts → renderBlogPost`.
- **`renderReview` legacy template path** (lines ~1172+ when `row.fullArticle` is empty) is the byline-bug surface. Modern reviews with `full_article` populated use the cleaner template at line ~1161 which skips the byline entirely. The byline render is only in the legacy path.
- **typecheck**: `pnpm --filter @workspace/crypto-review run typecheck` covers the public site. The api-server package may have a pre-existing error on `routes/reviews.ts:278` (Drizzle QueryResult cast) unrelated to most edits.

## See also

- [`SYNC-ARCHITECTURE.md`](https://github.com/madrank8/crypto-killer/blob/main/SYNC-ARCHITECTURE.md) (Vercel repo) — field-level Supabase → Replit mapping
- `replit.md` (this repo) — Replit-specific deployment notes
- [`db-schema-dump.txt`](db-schema-dump.txt) — current Drizzle DDL snapshot
