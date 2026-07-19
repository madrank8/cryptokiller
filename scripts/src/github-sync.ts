import { execFileSync, type ExecFileSyncOptions } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = "github.com/madrank8/cryptokiller.git";
const BRANCH = "main";
const WORKSPACE = "/home/runner/workspace";

function redact(text: string, secret: string): string {
  return secret ? text.split(secret).join("[REDACTED]") : text;
}

function run(
  cmd: string,
  args: string[],
  opts: ExecFileSyncOptions & { secret?: string; allowFail?: boolean } = {},
): { ok: boolean; output: string } {
  const { secret = "", allowFail = false, ...rest } = opts;
  try {
    const out = execFileSync(cmd, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...rest,
    }) as string;
    return { ok: true, output: redact(out, secret) };
  } catch (err: any) {
    const output = redact(
      `${err.stdout ?? ""}\n${err.stderr ?? ""}\n${err.message ?? ""}`,
      secret,
    );
    if (allowFail) return { ok: false, output };
    throw new Error(`Command failed: ${cmd} ${redact(args.join(" "), secret)}\n${output}`);
  }
}

async function getGithubToken(): Promise<string> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) throw new Error("REPLIT_CONNECTORS_HOSTNAME is not set");
  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!xReplitToken) throw new Error("No REPL_IDENTITY / WEB_REPL_RENEWAL available for connector auth");

  // NOTE: do NOT filter by connector_names — it returns 0 items even when connected.
  const res = await fetch(
    `https://${hostname}/api/v2/connection?include_secrets=true`,
    { headers: { Accept: "application/json", X_REPLIT_TOKEN: xReplitToken } },
  );
  if (!res.ok) throw new Error(`Connector API returned ${res.status}`);
  const data = (await res.json()) as { items?: any[] };
  const gh = (data.items ?? []).find(
    (item) => (item.connector_name ?? item.connectorName ?? "").toLowerCase().includes("github"),
  );
  const token =
    gh?.settings?.access_token ??
    gh?.settings?.oauth?.credentials?.access_token ??
    gh?.settings?.oauth?.credentials?.raw?.access_token;
  if (!token) throw new Error("GitHub connector token not found — is the GitHub integration connected?");
  return token as string;
}

async function main() {
  const token = await getGithubToken();
  const authUrl = `https://x-access-token:${token}@${REPO}`;
  const cloneDir = mkdtempSync(join(tmpdir(), "ck-github-sync-"));

  try {
    console.log(`Cloning workspace into ${cloneDir}...`);
    run("git", ["clone", "--branch", BRANCH, WORKSPACE, cloneDir]);
    const git = (args: string[], allowFail = false) =>
      run("git", args, { cwd: cloneDir, secret: token, allowFail });

    git(["config", "user.email", "agent@replit.local"]);
    git(["config", "user.name", "Replit Agent Sync"]);

    console.log("Fetching GitHub main...");
    git(["fetch", authUrl, BRANCH]);

    const localHead = git(["rev-parse", "HEAD"]).output.trim();
    const remoteHead = git(["rev-parse", "FETCH_HEAD"]).output.trim();
    console.log(`Workspace HEAD: ${localHead}`);
    console.log(`GitHub HEAD:    ${remoteHead}`);

    if (localHead === remoteHead) {
      console.log("Already in sync — nothing to do.");
      return;
    }

    const upToDate = git(["merge-base", "--is-ancestor", localHead, remoteHead], true).ok;
    if (upToDate) {
      console.log("GitHub already contains all workspace commits — nothing to push.");
      return;
    }

    console.log("Merging GitHub main into workspace history...");
    const merge = git(["merge", "--no-edit", "FETCH_HEAD"], true);
    if (!merge.ok) {
      const conflicted = git(["diff", "--name-only", "--diff-filter=U"]).output
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean);
      if (conflicted.length === 0) {
        throw new Error(`Merge failed without conflicts:\n${merge.output}`);
      }
      console.log(`Resolving ${conflicted.length} conflict(s) workspace-wins:`);
      for (const file of conflicted) {
        console.log(`  - ${file}`);
        // "ours" is the workspace side (the clone's HEAD).
        const ours = git(["checkout", "--ours", "--", file], true);
        if (!ours.ok) {
          // add/add or delete conflicts: prefer workspace version if it exists, else remove.
          const inHead = git(["cat-file", "-e", `HEAD:${file}`], true).ok;
          if (inHead) git(["checkout", "HEAD", "--", file]);
          else git(["rm", "-f", "--", file]);
        }
        git(["add", "--", file], true);
      }
      const cont = run("git", ["merge", "--continue"], {
        cwd: cloneDir,
        secret: token,
        env: { ...process.env, GIT_EDITOR: "true" },
      });
      console.log(cont.output.trim());
    }

    console.log("Pushing to GitHub (no force)...");
    const push = git(["push", authUrl, `${BRANCH}:${BRANCH}`]);
    console.log(push.output.trim() || "Push complete.");
    console.log("Sync finished successfully.");
    console.log(
      "Note: the workspace repo itself is platform-managed; GitHub will be ahead by the merge commit until the next sync, which is expected.",
    );
  } finally {
    rmSync(cloneDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
