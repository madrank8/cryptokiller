# Threat Model

## Project Overview

CryptoKiller is a public-facing scam investigation site with a React + Vite frontend (`artifacts/crypto-review`) and an Express 5 API (`artifacts/api-server`) backed by PostgreSQL via Drizzle (`lib/db`). The production application serves public review and blog content, accepts unauthenticated scam reports, exposes a public Twilio WhatsApp webhook, and ingests privileged review/blog data from external systems through secret-protected sync endpoints.

The main production users are anonymous site visitors, scam victims submitting reports, trusted upstream content systems (Vercel CMS and Supabase sync jobs), and Twilio as a webhook sender. There is no end-user authentication surface in the production app today. `artifacts/mockup-sandbox` is treated as dev-only and out of scope unless a production reachability path is established.

## Assets

- **Public site integrity** — review pages, blog pages, structured data, and prerendered HTML must not be attacker-modifiable. Compromise would let an attacker inject scam content, malicious scripts, or false trust signals into a high-visibility public site.
- **Sync authority and editorial data** — `SYNC_SECRET`, synced review/blog payloads, and privileged admin-maintenance routes control what becomes public content. Compromise would allow unauthorized publication, defacement, or tampering with investigations.
- **Scam report submissions** — `scam_reports` stores victim-submitted details such as platform names, descriptions, amounts lost, contact methods, country, evidence URLs, and optional email addresses. This is sensitive user-provided incident data.
- **Infrastructure and third-party secrets** — database credentials, Supabase service credentials, Twilio secrets, Known Agents token, and other env-backed secrets must not leak to clients, logs, or untrusted services.
- **Service availability** — public endpoints (`/api/reviews`, `/api/blog`, `/api/reports`, `/api/whatsapp`) and privileged sync endpoints must resist abuse that would degrade availability or flood storage/logging.

## Trust Boundaries

- **Browser / client to API** — all requests from the public website and arbitrary internet clients to `artifacts/api-server/src/routes/*` cross an untrusted boundary. Request bodies, query params, path params, and headers must be treated as attacker-controlled.
- **Webhook / external service to API** — Twilio and the CMS/sync senders call public endpoints. Shared-secret or signature validation is the core trust mechanism here; without it, the server cannot distinguish legitimate upstream traffic from forged internet traffic.
- **API to database** — the API server has broad write access to PostgreSQL. Injection or authorization flaws at the route layer can become direct persistent tampering or disclosure.
- **API to external services** — the server calls Supabase and IndexNow and relies on env-backed secrets. Outbound integrations must not expose secrets or accept attacker-controlled destinations.
- **Production / dev-only boundary** — `artifacts/mockup-sandbox`, local scripts, and development-only behavior are out of production scope unless code paths prove they are reachable in deployed runtime.

## Scan Anchors

- **Production entry points**: `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`, `artifacts/crypto-review/server/index.ts`, `artifacts/crypto-review/server/prerender.ts`, `artifacts/crypto-review/src/App.tsx`.
- **Highest-risk code areas**: sync endpoints in `artifacts/api-server/src/routes/sync.ts`, `blog-sync.ts`, `supabase-sync.ts`, admin maintenance routes, public WhatsApp webhook, public report intake, and HTML rendering in `artifacts/api-server/src/routes/blog.ts` plus `artifacts/crypto-review/src/pages/BlogPostPage.tsx` / `ReviewPage.tsx`.
- **Public surfaces**: review/blog/sitemap endpoints, `/api/reports`, `/api/whatsapp`, all frontend routes.
- **Privileged secret-protected surfaces**: `/api/sync/*` and `/api/admin/*` routes guarded by `SYNC_SECRET`.
- **Usually dev-only / ignore unless proven reachable**: `artifacts/mockup-sandbox`, local scripts, and development transport/log prettification.

## Threat Categories

### Spoofing

The application trusts multiple inbound machine callers: Twilio for WhatsApp and privileged CMS/sync senders for content publication. The system must authenticate those callers before processing requests. Shared-secret routes must compare against a server-side secret and webhook-style integrations must verify the provider’s signature, not just the request shape.

### Tampering

Trusted upstream systems can write directly into public content tables and related review/blog records. The application must ensure only authorized senders can invoke sync/admin routes, and any user-controlled or externally sourced content rendered as HTML must be sanitized so stored content cannot alter page behavior in the browser.

### Information Disclosure

Scam reports contain sensitive victim-submitted details and the API also handles multiple secrets and database-backed editorial fields. The application must avoid exposing unpublished content, secrets, raw internal errors, or unnecessary sensitive fields in logs and API responses. Public read endpoints must only return published content.

### Denial of Service

Several production endpoints are unauthenticated and accept request bodies or trigger storage writes. The application must bound abuse from public callers through reasonable body limits, per-endpoint abuse controls, and validation so attackers cannot cheaply flood storage, memory, or downstream systems.

### Elevation of Privilege

The most important privilege boundary is between anonymous internet callers and secret-bearing sync/admin workflows. Attackers must not be able to publish or modify content, trigger privileged maintenance operations, or gain script execution in visitors’ browsers through weak webhook validation, content sanitization gaps, or other server-side trust failures.