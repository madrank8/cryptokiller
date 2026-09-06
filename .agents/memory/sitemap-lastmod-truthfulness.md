---
name: Sitemap lastmod truthfulness
description: Rules for tying sitemap freshness to content actually rendered by each URL.
---

Derive every sitemap `lastmod` only from content rendered on that exact URL. Do not use a site-wide newest-content date as a convenience fallback.

**Why:** A newer blog post must not advance a review-only homepage, and a changed item in a sorted collection can move between pages. The page it leaves changed too, but a maximum over its current items no longer includes the moved item's timestamp. A collection-wide timestamp falsely marks every page as changed.

**How to apply:** Map each hub to its real data sources. For sorted or truncated collection views—including a first-page hub—use persisted page-revision history that follows the visible selection or omit `lastmod`. Exercise source isolation and pagination with synthetic fixtures so coverage does not depend on the current content mix or row count.