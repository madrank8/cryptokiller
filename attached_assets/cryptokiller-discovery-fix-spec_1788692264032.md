# CryptoKiller.org - Discovery Fix Spec
2026-09-06 · Fixes the indexing bottleneck diagnosed via GSC Wizard: stale sitemap (last fetched by Google 2026-05-01, 0 indexed reported), CSR listing pages with no crawlable links, no push indexing, 40/10,600 brands published.

---

## P0-1: Publish the IndexNow key file (5 min, unblocks everything)

Key is already registered in GSC Wizard (masked ****7456). Full key: `f570a621f34ae9163eae8a8390087456`

```bash
# in the cryptokiller repo
echo "f570a621f34ae9163eae8a8390087456" > public/f570a621f34ae9163eae8a8390087456.txt
git add public/f570a621f34ae9163eae8a8390087456.txt && git commit -m "indexnow key" && git push
```

Verify after deploy: `curl https://cryptokiller.org/f570a621f34ae9163eae8a8390087456.txt` returns the key.
Then tell me "key live" and I submit all 96 sitemap URLs via IndexNow immediately.

## P0-2: SSR the listing pages (the single biggest fix)

Current state: `/investigations` raw HTML = 11.6KB, 5 `<a>` tags. Homepage: 1 review link. `/blog`: 1 link. Googlebot's render queue is not a discovery strategy on a DR-nothing domain.

Next.js App Router changes:

```
app/investigations/page.tsx   -> Server Component. Fetch reviews server-side
                                 (direct Supabase/DB query, no client fetch).
                                 export const revalidate = 3600
app/blog/page.tsx             -> same pattern
app/page.tsx                  -> add a server-rendered "Latest investigations"
                                 block: 20 newest review links as plain <a href>
```

Rules:
- Every review link must be an `<a href="/review/slug">` in the server HTML - no onClick router.push, no IntersectionObserver lazy lists
- Client-side filters/search can stay as a client island ON TOP of the server-rendered full list, never instead of it
- Paginate server-side: `/investigations?page=2` as real links (`rel="next"` optional, real `<a>` mandatory), 50-100 items per page

Acceptance test (run before merge):
```bash
curl -s https://cryptokiller.org/investigations | grep -c 'href="/review/'
# must be >= 50, currently 1
```

## P0-3: Sitemap overhaul

Current: single `/api/sitemap.xml`, 96 URLs, Google hasn't re-fetched since May 1.

1. Convert to a sitemap INDEX:
   - `/api/sitemap.xml` -> index pointing to:
     - `/api/sitemap-core.xml` (static pages, authors)
     - `/api/sitemap-reviews.xml` (all published reviews, EN)
     - `/api/sitemap-es.xml` (all /es/ pages)
     - `/api/sitemap-blog.xml`
   - Shard review sitemaps at 5,000 URLs (`sitemap-reviews-1.xml`, `-2.xml`...) - the publish wave will need it
2. `lastmod` must be the real content-updated timestamp from the DB, not build time. Google's re-fetch cadence keys off lastmod credibility.
3. Cache-Control on the sitemap route: `s-maxage=3600`, never immutable.
4. Resubmit in GSC UI once (Search Console > Sitemaps > enter `api/sitemap.xml` again) to force a fresh fetch of the new index.

## P0-4: IndexNow in the publish pipeline

Wire into the n8n publish workflow (or the site's publish API route) - fire and forget on every publish/update:

```
POST https://api.indexnow.org/indexnow
{
  "host": "cryptokiller.org",
  "key": "f570a621f34ae9163eae8a8390087456",
  "keyLocation": "https://cryptokiller.org/f570a621f34ae9163eae8a8390087456.txt",
  "urlList": ["https://cryptokiller.org/review/<new-slug>"]
}
```

Batch up to 10,000 URLs per call. Also submit the listing page URL (`/investigations`) with each batch so engines see the changed hub. IndexNow covers Bing/Yandex/Seznam directly; Google discovery comes from sitemap lastmod + internal links above.

## P1-5: Internal mesh on review pages

Each review page server-renders a "Related investigations" block: 6-10 `<a>` links to other reviews (same scam family / same celebrity / same payment rail from the entity data). This turns every indexed page into a discovery node - critical while the domain has no external links. Route the linking rules through `semantic-content-network` when scaling.

## P1-6: Open the publish throttle - gated

40 published vs 10,600 brands in the DB. Ramp, don't dump:

| Week | Publishes | Gate |
|---|---|---|
| 1-2 | 25/wk | scaled-content-abuse-gate BATCH on each cohort |
| 3-4 | 50/wk | same + watch indexation rate in the tracker |
| 5+ | 100/wk if indexation rate >60% | hold if CNI climbs |

Priority order for which brands ship first: active scams with search demand NOW (feed from tavily-news-monitor scam alerts) - freshness is this site's entire edge.

## Monitoring (already live)

- 29 URLs in the GSC Wizard indexing tracker, hourly cron, 1,771 slots free - add each publish cohort
- Watch: indexation rate per cohort, impressions on /review/ cluster, sitemap "discovered" count in GSC
- Re-run this diagnosis in 30 days: expect impressions inflection within 2-3 weeks of P0-2 + P0-3 shipping

## Definition of done

1. Key file returns 200 with the key
2. `/investigations` serves >=50 review links in raw HTML
3. GSC shows a fresh sitemap fetch date + submitted count matching published count
4. IndexNow fires on publish (visible in GSC Wizard `list_indexnow_submissions`)
5. Tracker indexation rate on new cohorts >60% at day 14
