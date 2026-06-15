---
name: IndexNow ↔ sitemap canonical URL invariant
description: Why api-server pings IndexNow only via the shared canonical-urls builder, and the cross-artifact key gotcha.
---

# IndexNow ↔ sitemap canonical URLs (api-server)

Every URL pinged to IndexNow MUST be byte-identical to what the sitemap emits.
Both the sitemap and the publish webhooks build URLs from one shared module
(`artifacts/api-server/src/canonical-urls.ts`). Never hand-build review/blog
URLs in a route — import the builders.

**Why:** IndexNow / search engines treat a pinged URL as the canonical address.
If a ping differs from the sitemap's `<loc>` (even a trailing slash or locale
casing), it points at a non-canonical/duplicate URL and wastes crawl budget or
gets ignored. The sitemap is the source of truth; the ping must match it.

**How to apply:**
- Locale review URLs are `HOST/{segment}/review/{translation.slug}` where the
  segment comes from `LOCALE_URL_SEGMENT` (DB locale `pt-BR` → URL segment
  `pt-br`) and the slug is the *translation row's own slug*, NOT the master
  slug. So `reviewUrls(masterSlug, translations)` takes `{locale, slug}` refs,
  not bare locale strings — bare-locale + master-slug silently drifts.
- The sitemap XML-escapes each URL via `xmlLoc(url)=escapeXml(encodeURI(url))`;
  that escaping is an XML-output concern, so the builders return the raw URL.
- To prove no drift after touching either side: diff the live `/api/sitemap.xml`
  byte-for-byte against a pre-change capture (must be zero), and grep the
  sitemap for the builder's output as literal `<loc>` entries.

## Key file is cross-artifact — do not hardcode it
`INDEXNOW_KEY` (env) must match the `{key}.txt` file hosted by the
**crypto-review** web server at `https://cryptokiller.org/{key}.txt`. IndexNow
fetches that file to verify ownership; a mismatch makes it silently discard
every submitted URL (no error surfaced). A prior bug hardcoded a stale key that
no longer matched the hosted file, so pings were dead on arrival. Always read
the key from `process.env.INDEXNOW_KEY`.

## Only event-driven single upserts ping — bulk sync must NOT
The per-review (`sync.ts`) and per-blog (`blog-sync.ts`) webhooks ping on
publish, gated on `status === "published"`. The scheduled bulk
`supabase-sync.ts` deliberately does NOT ping — it re-runs every ~15 min over
all reviews and would flood IndexNow with recrawl requests for unchanged pages.
Keep pings on the event-driven path only.
