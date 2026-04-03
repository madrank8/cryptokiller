# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `artifacts/crypto-review` (`@workspace/crypto-review`)

React + Vite frontend web app — the **CryptoKiller by SpyOwl** review page.

- Dark slate theme: slate-950 background, red danger indicators, amber/orange warnings
- Dynamic: fetches all content from the API using generated React Query hooks (`useGetReview(slug)`)
- Routes: `/` → Quantum AI review (slug `quantum-ai`); `/review/:slug` → any review by slug
- Deployed at the root path `/` of the Replit preview domain

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

## CryptoKiller Application

### Database Schema

8 Drizzle tables in `lib/db/src/schema/`:

| Table | Purpose |
|---|---|
| `platforms` | Platform name + slug (e.g. `quantum-ai`) |
| `reviews` | Core review fields: threat_score, verdict, summary, hero_description, etc. |
| `review_stats` | Ad metrics: ad_creatives, countries_targeted, days_active, celebrities_abused, weekly_velocity |
| `red_flags` | Individual red flag items (emoji, title, description) |
| `funnel_stages` | 4-stage scam flow (title, bullets array, stat callout) |
| `faq_items` | FAQ question/answer pairs |
| `key_findings` | Investigation finding paragraphs |
| `geo_targets` | Geographic targeting summary (region, country_codes) |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/reviews` | List all published reviews (248 as of last sync) |
| GET | `/api/reviews/:slug` | Full review data (all joins in one response) |
| POST | `/api/sync/review` | Webhook: upsert a single review from Vercel CMS |
| POST | `/api/sync/supabase` | Bulk sync: pulls all brands + published reviews from Supabase |

### Data Pipeline

- **Source of truth**: Supabase (user's Vercel CMS) — 1,000 scam_brands, reviews table
- **Supabase integration**: `@supabase/supabase-js` client in `artifacts/api-server/src/lib/supabase.ts`
- **Bulk sync route**: `artifacts/api-server/src/routes/supabase-sync.ts`
  - Maps `scam_brands` → `platforms` + `review_stats`
  - Maps `reviews` (with red_flags, faq, key_takeaways, how_it_works) → `reviews` + related tables
  - Groups geo_list into regional clusters for geo_targets
  - Parses how_it_works text into funnel_stages
- **Webhook route**: `artifacts/api-server/src/routes/sync.ts` — for individual review upserts

### Sync Authentication

- Header: `X-Sync-Secret`
- Value: stored in env var `SYNC_SECRET`

### Synced Data

- **1,000 brands** synced from Supabase scam_brands table
- **248 published reviews** with full content (red flags, FAQ, funnel stages, geo targets)
- **Quantum AI** — 95/100 threat score, 3,076 ads, 45 countries, 419 days, 28 celebrities
