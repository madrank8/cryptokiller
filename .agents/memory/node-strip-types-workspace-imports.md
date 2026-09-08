---
name: Node strip-types workspace imports
description: Runtime choice for TypeScript scripts that import workspace packages exposing directory-style module paths.
---

Run TypeScript scripts that import workspace packages such as the database library with `tsx`, not Node's `--experimental-strip-types`.

**Why:** Node 24's native ESM resolver can reject the workspace package's internal directory import with `ERR_UNSUPPORTED_DIR_IMPORT` before the script runs. Pure scripts with only explicit relative file imports may still work under native type stripping.

**How to apply:** When a new validation or maintenance script imports a workspace package, launch it through an existing workspace package that already owns `tsx`, or declare `tsx` normally for that package. Treat native strip-types as suitable only after verifying every transitive import is Node-ESM-resolvable.