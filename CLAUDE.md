# CLAUDE.md — Project memory (read this first)

Operational memory for working on **cryptokiller.org** with Claude. Static architecture
lives in `ARCHITECTURE.md`, `replit.md`, and `db-schema-dump.txt` — read those for the
3-tier system, render layer, env vars, and DB schema. This file is the part that is easy
to get wrong: the deploy model, the publish workflow, the gate rules, and a session
changelog. **Update the changelog at the bottom every session.**

Owner: Niro (Madrank Digital). Site is **YMYL** (crypto scam intelligence + affiliate).

---

## 0. The lesson that cost a whole session (deploy + git)

**cryptokiller.org runs on Replit Autoscale, which builds from a SNAPSHOT of the Replit
workspace at Publish time. It does NOT deploy from GitHub.** There is no "deploy from a
GitHub branch on push" option on Replit (that is the Vercel/Netlify model).

Consequences:
- A commit pushed to GitHub (`madrank8/cryptokiller`) is **not live** until someone pulls
  it into the Replit workspace and clicks **Publish**.
- The Replit workspace and GitHub are **separate git checkouts that drift**. The workspace
  has remotes: `origin` (this GitHub repo), `gitsafe-backup` (Replit internal mirror), and
  ~40 `subrepl-*` checkpoint remotes (one per rollback — harmless noise). They forked once
  (Replit "Published your App" commits vs GitHub feature commits) and had to be merged.

**Discipline to prevent re-divergence** — in the Replit workspace, in this exact order:
```
git pull origin main      # absorb anything pushed to GitHub (e.g. a fix Claude pushed)
# ...make/merge the change...
git push origin main      # GitHub mirrors what is about to ship
# ...click Publish (Publishing tab)...
```
Pull-first is the whole point: it puts GitHub-side fixes into the snapshot **before** the
Publish. If you skip it, Publish ships stale code and the fix never goes live.

TypeScript note: server code (e.g. `artifacts/crypto-review/server/index.ts`) must
**recompile** on deploy. Prefer a clean/full rebuild over a cached Publish.

---

## 1. Repo map (this repo: `madrank8/cryptokiller`, the live public site)

`artifacts/crypto-review/` — the SSR review/blog app (Express SSR + React/Vite client):
- `server/index.ts` — request handling + `applyMeta()`. **Robots default ~line 111**:
  `r.robots ?? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"`.
  Blog posts set no per-page robots, so they use this default. `max-image-preview:large`
  is **required** for Google Discover large images.
- `server/prerender.ts` — builds the SSR HTML + the JSON-LD `@graph`. Only sets
  `robots: "noindex, follow"` for one non-blog case (~line 2641). Emits author Person
  (via `resolveAuthorPersona`, fallback persona `webb` = M. Webb), reviewer (John Feldt,
  as `reviewedBy`), Org/WebSite/Breadcrumb. Legal entity = DEX Algo Technologies Pte Ltd.
- `src/pages/BlogPostPage.tsx` — client render. `resolveHeroImage(post)` uses
  `post.heroImageUrl` if `isUsableHeroUrl()` passes. **`isUsableHeroUrl` only BLOCKS**
  `oaidalleapiprodscus.blob.core.windows.net`, `quickchart.io`, `mermaid.ink` — everything
  else (incl. Higgsfield CloudFront) passes. Hero renders as its own `<figure>`;
  `hero_image_alt` doubles as the visible caption. Body renders from `sections[]` if
  present, else `full_article`. **Do not also put a hero `<figure>` in the body** — the
  column renders it; a body figure = double hero.
- `src/hooks/usePageMeta.ts` — client SPA meta reset (~line 193 also sets robots).
- `src/lib/blogSchemaEnrichment.ts` — the blog `@graph` enrichment builders:
  `buildCitations` (type whitelist: NewsArticle/Report/Article/Dataset/ScholarlyArticle/
  Book/WebPage/CreativeWork/Legislation), `buildDataset` (needs `name`+`description` →
  `#cryptokiller-dataset` node, Article `isBasedOn` points at it), `resolveAbout` /
  `resolveMentions` (resolve slugs against `ENTITY_REGISTRY` → Wikidata `sameAs`).
  **about/mention slugs must exist in `ENTITY_REGISTRY` or they are dropped.** Known slugs
  include: `deepfake`, `celebrity-endorsement-scam`, `mark-carney`, `meta-platforms`,
  `facebook`, `fbi`, `elon-musk`, and more — grep the registry before asserting any.
- `src/lib/schemaBuilder.ts` — base org/person/legal-entity nodes.
- `src/lib/writerPersonas.ts` — `WRITER_PERSONAS` registry (`webb` = M. Webb is fallback).

`artifacts/api-server/` — the sync receiver:
- `src/routes/blog-sync.ts` — receives `POST /api/sync/blog` (Bearer `SYNC_SECRET`) from the
  Vercel admin, upserts into `blog_posts` (Replit's own Postgres), pings IndexNow. Carries
  `hero_image_url`/`alt`, `visual_meta`, `citations`, `dataset`, `about_slugs`,
  `mention_slugs`, `author_persona_id`.
- `src/lib/supabase-sync.ts` — content → blog post field mapping.

---

## 2. Sister repo: `madrank8/crypto-killer` (content pipeline + admin, on Vercel)

- Admin: `https://crypto-killer.vercel.app/admin` . Editor: `/admin/content/[id]`.
- **There is no content-list page in the admin nav**, and rows with `topic_id = null` do not
  appear under the topical map. Reach a draft by **direct URL**:
  `https://crypto-killer.vercel.app/admin/content/<id>`.
- `app/api/admin/content/[id]/publish/route.js` = the Publish action. `verifyAdmin`
  (Bearer `ADMIN_SECRET`). Runs the publish quality gate, sets `status=published` +
  `published_at`, stamps JSON-LD dates, then `syncToLiveBlog` POSTs the full content row to
  Replit `/api/sync/blog` (Bearer `SYNC_SECRET`, host from `REPLIT_SITE_URL`), revalidates
  `/blog`. Publishing is **admin-auth gated**; the human clicks Publish (Claude does not
  enter the secret).

### Publish quality gate — a draft fails (422) unless ALL hold:
- `sections[]`: each body **>= 40 words**, no skeleton/taxonomy openers.
- **`internal_links` must be `{target_slug, anchor_text}`** (NOT `{url, text}`). Empty /
  placeholder `target_slug` hard-blocks. (Visible links live in `full_article` HTML; this
  column is metadata for the gate + schema.)
- `sources`: non-empty, **>= 1 current-year** source (`accessed_date`/`datePublished` starts
  the current year), no hard-dead (404/410) URLs. 403/timeout = warning only.
- `citations`: if present, count **must equal** `sources` count, else warning. 0 is allowed.
- `ai_model` != `"deterministic-fallback"`. Null author/audit = legacy path, not blocked.

---

## 3. Supabase (content store)

- Project: **`rqyfuioazbdixflqngcs`** ("Crypto Killer"). (Org also has: Topical Map
  `wbplxtcshkchimuupmxj`, sweepdogs-site `ybedkkpunwrtthvffcra`, madseo `bqubaaznwjsnigttabvg`.)
- `content` table key columns: `slug` (UNIQUE), `status` (draft|published), `full_article`
  (HTML fragment), `sections` (jsonb), `hero_image_url`, `hero_image_alt` (= on-page
  caption), `hero_image_credit`, `visual_meta` (jsonb), `citations` (jsonb), `dataset`
  (jsonb), `about_slugs` (text[]), `mention_slugs` (text[]), `internal_links` (jsonb),
  `sources` (jsonb), `ai_audit` (jsonb), `author_persona_id` (e.g. `webb`),
  `meta_description`, `summary`, `headline`, `title`, `schema_json` (often empty — the SSR
  builds the `@graph` at render time instead), `faq` (jsonb), `not_for_you` (text).

---

## 4. Hero image workflow (Higgsfield)

1. Connect Higgsfield MCP (OAuth) in Claude. Generate: model `nano_banana_pro`,
   `aspect_ratio: 16:9`, `resolution: 2k` (→ 2752x1536, above Discover's 1200px floor).
   Prompt guardrails: a **fictional, non-identifiable** person (no real public figure),
   **no real brand logos/wordmarks**. Output is a stable CloudFront URL (passes
   `isUsableHeroUrl`).
2. Wire into the row: `hero_image_url` = CDN URL; `hero_image_alt` = descriptive text **plus
   the AI disclosure** (it is the visible caption); strip any `HERO PENDING` marker from
   `full_article`.
3. AI disclosure: caption (`hero_image_alt`) + `visual_meta.digitalSourceType =
   "trainedAlgorithmicMedia"`. For a self-hosted master, embed IPTC `trainedAlgorithmicMedia`
   in the file (Pillow iTXt XMP if `exiftool` is absent). CloudFront-hosted files cannot
   carry embedded IPTC, so disclosure rides in caption + DB.

---

## 5. Schema enrichment recipe (what makes the `@graph` strong)

- `citations` (typed), `dataset` (original-data Dataset node + `isBasedOn` edge = strong GEO
  signal), `about_slugs` (1-3 core topics) + `mention_slugs` (named entities). All
  about/mention slugs **must be in `ENTITY_REGISTRY`** to resolve to Wikidata. Verify each
  entity is actually named in the body before asserting `mention`.
- FAQ / HowTo / ClaimReview rich results are deprecated — do not rely on them.

---

## 6. Conventions

- **No em-dashes** anywhere — colons / hyphens / semicolons only.
- GitHub writes via CLI + PAT; push directly for requested work, flag only if destructive,
  report the commit hash.
- Research / fetch before analyzing. Verify against live code + data, never assume.

---

## 7. Session changelog (newest first — append here every session)

### 2026-07-08
- Fixed GSC "Product snippets: 1 invalid item" on review pages (repro:
  `/review/legacy-bitfundex`). Cause: watchlist/low tiers omit `reviewRating` by design,
  so a standalone `Product`/`SoftwareApplication` `#item-reviewed` node had none of
  offers/review/aggregateRating and failed Google's Product rich-result gate.
- Fix in `artifacts/crypto-review/src/lib/reviewItemReviewedSchema.ts` (commit `e00a6bb`):
  unrated tiers (watchlist, low) demote Product/SoftwareApplication to Organization;
  rated tiers (confirmed, high, elevated) keep the type and add a `review` @id
  back-reference (`{canonical}#review`), making the node eligible for 1-star SERP display.
- Render-layer only; Vercel `lib/review-schema.js` untouched (optional follow-up: mirror
  the tier gate there for contract symmetry).
- Deploy pending: Replit workspace `git fetch origin && git reset --hard origin/main`,
  then Publish. Verify via Googlebot curl (Organization node on legacy-bitfundex) + GSC
  live test + Request Indexing; spot-check a confirmed-tier page keeps type + `review` ref.

### 2026-06-28
- Published reactive Discover article `celebrity-crypto-ad-verification` (Mark Carney
  deepfake $900K hook). Supabase `content.id = 8fc8b998-d45e-4bd7-961e-b6bc1533fd4d`.
  Live: https://cryptokiller.org/blog/celebrity-crypto-ad-verification .
- Hero via Higgsfield Nano Banana Pro (2752x1536, 16:9); CloudFront URL wired into
  `hero_image_url`/`alt` + `visual_meta` (`trainedAlgorithmicMedia`).
- Publish-gate fix: `internal_links` converted `{url,text}` → `{target_slug,anchor_text}`.
  Sources verified (CP24 + NY AG real + current-year). Schema enrichment added: 3 typed
  citations, `#cryptokiller-dataset` (6,007 creatives) + `isBasedOn`, about x2 + mention x5
  (Wikidata). Author = M. Webb (`webb`), reviewer = John Feldt.
- Discover fix: live robots was bare `index, follow`. **Root cause = the Replit workspace
  and GitHub had FORKED**; commit `0630f5d` (`max-image-preview:large`) was on GitHub but
  never pulled into the workspace, so every Publish shipped old code.
- Reconciled repos: merged `origin/main` into the workspace (merge `66f10ee`, no
  force-push, no loss), pushed to GitHub (now the superset). Re-applied the robots edit by
  hand in the workspace, republished. **Confirmed live: `max-image-preview:large` serving.**
- Established the deploy reality (Section 0): Replit Autoscale = workspace snapshot, no
  push-to-deploy; guardrail = pull → change → push → Publish.

<!-- Add new session entries ABOVE this line. Read Sections 0-2 before any deploy. -->
