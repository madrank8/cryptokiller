// Shared wording keeps first-byte HTML and the interactive evidence cards aligned.
export const CAPTURED_ADS_TITLE = "Captured ad examples";
export const CAPTURED_ADS_NOTE =
  "Historical captures; these examples do not establish current campaign activity.";

export function lastRecordedUtc(value: string | null | undefined): string {
  if (!value) return "Last recorded: date unavailable";
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return "Last recorded: date unavailable";
  return `Last recorded: ${new Date(timestamp).toISOString().slice(0, 10)} (UTC)`;
}

export function capturedAdsSummary(count: number, countries: number): string {
  return `${count} captured ad ${count === 1 ? "example" : "examples"}${
    countries > 0 ? ` across ${countries} ${countries === 1 ? "country" : "countries"}` : ""
  }. ${CAPTURED_ADS_NOTE}`;
}

export function weeklyCreativesSummary(count: number): string {
  return count === 0
    ? "No new creatives recorded in the last 7 days."
    : `${count} new ${count === 1 ? "creative" : "creatives"} recorded in the last 7 days.`;
}

export const WEEKLY_CREATIVES_NOTE =
  "Recorded counts alone do not establish a trend or current campaign activity.";