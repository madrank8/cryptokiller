---
name: crypto-review SSR String.replace $-pattern hazard
description: Why applyMeta/SSR shell injection must use replacement functions, not replacement strings
---

# SSR shell injection must use replacement *functions*, never replacement strings

In `artifacts/crypto-review/server/index.ts`, `applyMeta()` and `loadIndexHtml()`
splice dynamic, DB-sourced values (rendered `bodyHtml`, `<title>`, meta `content`
attrs, the head inject that carries the JSON-LD `<script>`) into the index.html
shell.

**Rule:** every such injection must use `html.replace(pattern, () => value)`
(a replacement *function*), never `html.replace(pattern, value)` (a replacement
*string*).

**Why:** `String.prototype.replace` interprets `$&`, `` $` ``, `$'`, `$$`, `$n`
in a replacement *string* as special patterns. Scam review/blog content is full
of `$` (dollar amounts, ad copy), so a value containing e.g. `$&` / `$'` /
`` $` `` would splice the matched region, the trailing document, or the entire
`<head>` (including the JSON-LD `<script>`) into the page. This produced a LIVE
production bug: review/blog pages emitted the document 2–3× (multiple `<body>`),
stray `SSR-BODY-START/END` markers in the body, the JSON-LD `@graph` rendered as
visible body text, and an imbalanced `<script>` open/close count. The stored DB
data was clean — the corruption was purely render-time. A replacement function's
return value is inserted literally with no `$` interpretation, so no extra
escaping is needed (existing JSON-LD `<>&` escaping stays as-is).

**How to apply:** any new `.replace()` in the SSR document-assembly path that
inserts dynamic/DB/user content must use the function form. Template-literal
concatenation (how `prerender.ts` builds `bodyHtml`) is already safe — `$` is not
special there. Acceptance check after changes: `curl` a review and a blog page →
exactly one `<body>`, one `SSR-BODY-START`, balanced `<script>`/`</script>`, and
no `@type` text outside the `application/ld+json` script.
