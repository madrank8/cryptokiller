---
name: Playwright callbacks under tsx
description: Avoid tsx helper injection when Playwright serializes callbacks into the browser realm.
---

Keep functions passed to Playwright `page.evaluate()` and
`page.waitForFunction()` self-contained. Avoid defining a named or
name-inferred helper inside those callbacks; inline small predicates instead.

**Why:** The tsx/esbuild transform can wrap an inner helper with its internal
`__name` function. Playwright serializes the callback into the browser without
that Node-side helper, causing `ReferenceError: __name is not defined` even
though TypeScript and the surrounding script are valid.

**How to apply:** Browser-realm callbacks may use browser globals and their
serialized argument only. Inline small `filter`/`some` predicates, or pass
plain data and repeat a short check rather than closing over or declaring a
helper whose transformed output depends on Node-side runtime scaffolding.