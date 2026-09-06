import { RELATED_INVESTIGATIONS_LIMIT } from "@workspace/site-content";

export interface RelatedInvestigationLink {
  slug: string;
  platformName: string;
  threatScore: number;
  verdict: string;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncate(value: string, max: number): string {
  const plain = value.replace(/\s+/g, " ").trim();
  return plain.length <= max
    ? plain
    : `${plain.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Render crawler-visible related review links.
 *
 * The database query already excludes the current review, but this pure
 * boundary also removes self-links and duplicate slugs so malformed fixture or
 * future query data cannot weaken the internal link graph.
 */
export function renderRelatedInvestigationsHtml(
  currentSlug: string,
  rows: readonly RelatedInvestigationLink[],
): string {
  const seen = new Set([currentSlug]);
  const related = rows
    .filter((row) => {
      const slug = row.slug.trim();
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .slice(0, RELATED_INVESTIGATIONS_LIMIT);

  if (related.length === 0) return "";

  const items = related
    .map(
      (row) =>
        `<li><h3><a href="/review/${esc(row.slug)}">${esc(row.platformName)} investigation</a></h3><p>Threat score ${row.threatScore}/100. ${esc(truncate(row.verdict || "Under investigation", 180))}</p></li>`,
    )
    .join("");

  return `<section data-related-investigations aria-labelledby="related-investigations-heading"><h2 id="related-investigations-heading">Related Scam Investigations</h2><ul>${items}</ul></section>`;
}