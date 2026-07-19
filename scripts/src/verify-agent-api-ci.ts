/**
 * verify-agent-api-ci — self-contained wrapper so the agent API drift check
 * can run as an automated validation step without depending on any workflow
 * being up.
 *
 * In development the discovery documents (/.well-known/api-catalog, the
 * OpenAPI JSON) are only served by the *built* crypto-review SSR server —
 * the Vite dev server 404s them. So this wrapper:
 *
 *   1. Builds crypto-review (client + SSR server bundle)
 *   2. Builds + starts api-server on a spare port
 *   3. Starts the built crypto-review SSR server on another spare port
 *      (capped heap — the SSR server can OOM in constrained shells)
 *   4. Runs verify-agent-api with VERIFY_BASE_URL / VERIFY_API_BASE_URL
 *      pointing at the two local servers
 *   5. Tears both servers down and exits with the verifier's exit code
 */

import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const WEB_DIR = path.join(ROOT, "artifacts/crypto-review");
const API_DIR = path.join(ROOT, "artifacts/api-server");

const WEB_PORT = Number(process.env.VERIFY_WEB_PORT ?? 45871);
const API_PORT = Number(process.env.VERIFY_API_PORT ?? 45872);

const children: ChildProcess[] = [];

function killAll(): void {
  for (const c of children) {
    if (c.exitCode === null && c.signalCode === null) {
      try {
        c.kill("SIGTERM");
      } catch {
        /* already gone */
      }
    }
  }
}

process.on("exit", killAll);
process.on("SIGINT", () => process.exit(130));
process.on("SIGTERM", () => process.exit(143));

function run(
  label: string,
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n[verify-agent-api-ci] ${label}: ${cmd} ${args.join(" ")}`);
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} exited with code ${code}`));
    });
  });
}

function startServer(
  label: string,
  cmd: string,
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): ChildProcess {
  console.log(`\n[verify-agent-api-ci] starting ${label}: ${cmd} ${args.join(" ")}`);
  const child = spawn(cmd, args, {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: "inherit",
  });
  children.push(child);
  child.on("exit", (code, signal) => {
    console.log(`[verify-agent-api-ci] ${label} exited (code=${code}, signal=${signal})`);
  });
  return child;
}

async function waitForHttp(url: string, label: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = "no response yet";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3_000) });
      if (res.status < 500) {
        console.log(`[verify-agent-api-ci] ${label} is up (${url} -> ${res.status})`);
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = (err as Error).message;
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error(`${label} did not become ready at ${url} within ${timeoutMs}ms (${lastError})`);
}

async function main(): Promise<void> {
  // Step 1: build the crypto-review client + SSR server (discovery docs are
  // only served by the built server, never by Vite dev).
  await run("build crypto-review", "pnpm", ["run", "build"], { cwd: WEB_DIR });

  // Step 2: build + start api-server on a spare port.
  await run("build api-server", "pnpm", ["run", "build"], { cwd: API_DIR });
  startServer("api-server", "node", ["--enable-source-maps", "./dist/index.mjs"], {
    cwd: API_DIR,
    env: { PORT: String(API_PORT), NODE_ENV: "production" },
  });

  // Step 3: start the built SSR server with a capped heap.
  startServer(
    "crypto-review SSR",
    "node",
    ["--max-old-space-size=512", "--enable-source-maps", "./dist/server/index.mjs"],
    { cwd: WEB_DIR, env: { PORT: String(WEB_PORT), NODE_ENV: "production" } },
  );

  await waitForHttp(`http://127.0.0.1:${API_PORT}/api/health`, "api-server");
  await waitForHttp(`http://127.0.0.1:${WEB_PORT}/.well-known/api-catalog`, "crypto-review SSR");

  // Step 4: run the actual drift check against the local servers.
  await run("verify-agent-api", "pnpm", ["run", "verify:agent-api"], {
    cwd: path.join(ROOT, "scripts"),
    env: {
      VERIFY_BASE_URL: `http://127.0.0.1:${WEB_PORT}`,
      VERIFY_API_BASE_URL: `http://127.0.0.1:${API_PORT}`,
    },
  });

  console.log("\n[verify-agent-api-ci] PASS");
}

main()
  .then(() => {
    killAll();
    process.exit(0);
  })
  .catch((err) => {
    console.error(`\n[verify-agent-api-ci] FAIL: ${(err as Error).message}`);
    killAll();
    process.exit(1);
  });
