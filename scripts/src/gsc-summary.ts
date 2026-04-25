import { google } from "googleapis";
import { readFileSync } from "node:fs";

type Row = {
  keys?: string[] | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  position?: number | null;
};

const REQUIRED_SITE = process.env.GSC_SITE_URL ?? "";
const SERVICE_ACCOUNT_JSON = process.env.GSC_SERVICE_ACCOUNT_JSON ?? "";
const SERVICE_ACCOUNT_FILE = process.env.GSC_SERVICE_ACCOUNT_FILE ?? "";
const SERVICE_ACCOUNT_EMAIL = process.env.GSC_SERVICE_ACCOUNT_EMAIL ?? "";
const SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(daysBack = 28): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - daysBack);
  return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}

function parseServiceAccount(): { client_email: string; private_key: string } {
  if (SERVICE_ACCOUNT_FILE) {
    const fromFile = JSON.parse(readFileSync(SERVICE_ACCOUNT_FILE, "utf8")) as {
      client_email?: string;
      private_key?: string;
    };
    if (fromFile.client_email && fromFile.private_key) {
      return { client_email: fromFile.client_email, private_key: fromFile.private_key };
    }
  }

  if (SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(SERVICE_ACCOUNT_JSON) as { client_email?: string; private_key?: string };
    if (parsed.client_email && parsed.private_key) {
      return { client_email: parsed.client_email, private_key: parsed.private_key };
    }
  }

  if (SERVICE_ACCOUNT_EMAIL && SERVICE_ACCOUNT_PRIVATE_KEY) {
    return {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
    };
  }

  throw new Error(
    "Missing service account credentials. Set GSC_SERVICE_ACCOUNT_FILE, or GSC_SERVICE_ACCOUNT_JSON, or both GSC_SERVICE_ACCOUNT_EMAIL and GSC_SERVICE_ACCOUNT_PRIVATE_KEY.",
  );
}

function printRows(title: string, rows: Row[], limit = 10): void {
  console.log(`\n${title}`);
  if (!rows.length) {
    console.log("  (no data)");
    return;
  }
  for (const row of rows.slice(0, limit)) {
    const key = row.keys?.[0] ?? "(none)";
    const clicks = row.clicks ?? 0;
    const impressions = row.impressions ?? 0;
    const ctrPct = ((row.ctr ?? 0) * 100).toFixed(2);
    const pos = (row.position ?? 0).toFixed(2);
    console.log(`  - ${key}`);
    console.log(`    clicks=${clicks} impressions=${impressions} ctr=${ctrPct}% avgPos=${pos}`);
  }
}

async function main(): Promise<void> {
  if (!REQUIRED_SITE) {
    throw new Error("GSC_SITE_URL is required (example: sc-domain:cryptokiller.org or https://cryptokiller.org/).");
  }

  const { client_email, private_key } = parseServiceAccount();
  const auth = new google.auth.JWT({
    email: client_email,
    key: private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const searchconsole = google.searchconsole({ version: "v1", auth });

  const sitesResp = await searchconsole.sites.list();
  const siteEntries = sitesResp.data.siteEntry ?? [];
  const hasAccess = siteEntries.some((s) => s.siteUrl === REQUIRED_SITE);

  if (!hasAccess) {
    const available = siteEntries.map((s) => s.siteUrl).filter(Boolean);
    throw new Error(
      `Configured GSC_SITE_URL "${REQUIRED_SITE}" is not visible to this service account.\nAvailable: ${available.join(", ") || "(none)"}`,
    );
  }

  const { startDate, endDate } = getDateRange(28);

  const pagesResp = await searchconsole.searchanalytics.query({
    siteUrl: REQUIRED_SITE,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["page"],
      rowLimit: 50,
      searchType: "web",
      dataState: "all",
    },
  });

  const queriesResp = await searchconsole.searchanalytics.query({
    siteUrl: REQUIRED_SITE,
    requestBody: {
      startDate,
      endDate,
      dimensions: ["query"],
      rowLimit: 50,
      searchType: "web",
      dataState: "all",
    },
  });

  const sitemapResp = await searchconsole.sitemaps.list({ siteUrl: REQUIRED_SITE }).catch(() => null);

  console.log(`GSC site: ${REQUIRED_SITE}`);
  console.log(`Date range: ${startDate} → ${endDate} (last 28 days)`);
  console.log(`Accessible sites: ${siteEntries.length}`);
  console.log(`Sitemaps discovered: ${sitemapResp?.data?.sitemap?.length ?? 0}`);

  printRows("Top pages (web)", pagesResp.data.rows ?? [], 15);
  printRows("Top queries (web)", queriesResp.data.rows ?? [], 15);
}

main().catch((err) => {
  console.error(`GSC summary failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
