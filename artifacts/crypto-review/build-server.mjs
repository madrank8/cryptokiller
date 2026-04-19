import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

const artifactDir = path.dirname(fileURLToPath(import.meta.url));

await esbuild({
  entryPoints: [path.resolve(artifactDir, "server/index.ts")],
  platform: "node",
  target: "node20",
  bundle: true,
  format: "esm",
  outfile: path.resolve(artifactDir, "dist/server/index.mjs"),
  logLevel: "info",
  sourcemap: "linked",
  external: ["*.node", "pg-native"],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);`,
  },
});
