---
name: Stale lib .d.ts after a task merge
description: Post-merge typecheck errors about missing properties on generated types are usually stale composite-lib declarations, not bad imports.
---

# Stale lib .d.ts after a task merge

When a leaf artifact typecheck fails with `Property 'X' does not exist on type 'Y'`
for a **generated** API type (e.g. `ReviewFull.alternativeHeadline`) right after a
task merge, the cause is almost always stale emitted declarations, not a real code
bug.

**Why:** `lib/*` packages are composite and consumed via their gitignored `dist/*.d.ts`.
A merge can update the codegen **source** (`lib/api-*/src/generated/...`) — or run
`api-spec codegen` — without rebuilding the libs, leaving the `dist` declarations the
leaf packages actually import out of date. Because `dist/` is gitignored, this drift
never shows in the git diff.

**How to apply:** Before trusting a post-merge leaf typecheck, run
`pnpm run typecheck:libs` (root, `tsc --build`) to regenerate lib declarations, then
re-run the leaf `pnpm --filter @workspace/<pkg> run typecheck`. Verify the property
exists in the generated **source** first; if it does and only the leaf complains, it's
a stale-`dist` rebuild, not a missing field.
