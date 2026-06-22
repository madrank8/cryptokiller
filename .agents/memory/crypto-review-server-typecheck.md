---
name: crypto-review server/scripts typecheck coverage gap
description: The crypto-review package typecheck only covers src/**; server/ and scripts/ TS are not type-checked by the normal command.
---

# crypto-review server/scripts are NOT covered by `pnpm run typecheck`

`artifacts/crypto-review/tsconfig.json` has `include: ["src/**/*"]`. The package
`typecheck` script (`tsc -p tsconfig.json --noEmit`) therefore checks ONLY the
React app under `src/`. Files under `server/` (the SSR Express server, bundled by
esbuild via `build-server.mjs`) and `scripts/` (run via `tsx`) are NOT type-checked
by that command — their types are stripped by esbuild/tsx without checking.

**Why:** esbuild and tsx transpile without type-checking, and those dirs are outside
the tsconfig `include`. A green `pnpm --filter @workspace/crypto-review run typecheck`
does NOT mean `server/` or `scripts/` compile.

**How to apply:** After editing anything in `crypto-review/server/**` or
`crypto-review/scripts/**`, verify with a targeted check, e.g. the root tsc binary
(`node_modules/.bin/tsc` at repo root) over the specific files with
`--moduleResolution bundler --module esnext --lib es2022,dom,dom.iterable --types node --skipLibCheck`,
and/or a runtime smoke test (rebuild the server bundle + curl, or run the script
with `tsx` against a safe input). To run a newly-added crypto-review package script,
prefer `pnpm --filter @workspace/crypto-review run <name>` from repo root — `cd <dir>
&& pnpm run <name>` intermittently reported `ERR_PNPM_NO_SCRIPT` right after adding it
(stale manifest), while the `--filter` form was reliable.
