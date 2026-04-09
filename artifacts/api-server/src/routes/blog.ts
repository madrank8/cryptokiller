import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";

interface VisualMetaItem {
  url?: string;
  altText?: string;
  succeeded?: boolean;
  type?: string;
  width?: number;
  height?: number | string;
  description?: string;
  originalType?: string;
}

function isVisualMetaItem(v: unknown): v is VisualMetaItem {
  return typeof v === "object" && v !== null && "url" in v;
}

function isExpiredTempUrl(url: string): boolean {
  return /oaidalleapiprodscus\.blob\.core\.windows\.net/.test(url);
}

function isUsableHeroUrl(url: string): boolean {
  if (isExpiredTempUrl(url)) return false;
  if (/quickchart\.io/.test(url)) return false;
  if (/mermaid\.ink/.test(url)) return false;
  return true;
}

function resolveHeroImage(
  heroUrl: string | null,
  heroAlt: string | null,
  visualMeta: unknown
): { url: string | null; alt: string | null } {
  const items = Array.isArray(visualMeta) ? visualMeta.filter(isVisualMetaItem) : [];
  const usable = items.filter(v => v.url && isUsableHeroUrl(v.url));
  const best = usable.find(v => v.succeeded !== false) ?? usable.find(v => !!v.url);
  if (heroUrl && isUsableHeroUrl(heroUrl)) return { url: heroUrl, alt: heroAlt ?? best?.altText ?? null };
  return { url: best?.url ?? null, alt: best?.altText ?? null };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeHref(href: string): string {
  const trimmed = href.trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed) || /^vbscript:/i.test(trimmed)) {
    return "#";
  }
  return trimmed;
}

function processContentBody(html: string): string {
  let out = html;

  out = out.replace(/\(ESTABLISHED\)/g, "");

  out = out.replace(/\{\{VERIFY:[^}]*\}\}/g, "");

  out = out.replace(/\{\{WARNING:\s*([\s\S]*?)\}\}/g, (_m, text) => {
    const trimmed = escapeHtml(text.trim());
    return `<div class="ck-callout ck-callout--warning" style="margin:1.5rem 0;padding:1rem 1.25rem;border-left:4px solid #ef4444;background:rgba(239,68,68,0.08);border-radius:0.5rem;"><strong style="color:#fca5a5;display:block;margin-bottom:0.25rem;">⚠ Warning</strong><span style="color:#cbd5e1;">${trimmed}</span></div>`;
  });

  out = out.replace(/\{\{TIP:\s*([\s\S]*?)\}\}/g, (_m, text) => {
    const trimmed = escapeHtml(text.trim());
    return `<div class="ck-callout ck-callout--tip" style="margin:1.5rem 0;padding:1rem 1.25rem;border-left:4px solid #22c55e;background:rgba(34,197,94,0.08);border-radius:0.5rem;"><strong style="color:#86efac;display:block;margin-bottom:0.25rem;">💡 Tip</strong><span style="color:#cbd5e1;">${trimmed}</span></div>`;
  });

  out = out.replace(/\{\{[A-Z_]+:[^}]*\}\}/g, "");

  out = out.replace(/(?:^|\n|>)\s*(\|.+\|(?:\n\|.+\|)+)/g, (fullMatch, tableBlock) => {
    const prefix = fullMatch.slice(0, fullMatch.length - tableBlock.length);
    const rows = tableBlock.trim().split("\n").filter((r: string) => r.trim());
    if (rows.length < 2) return fullMatch;

    const parseRow = (row: string) =>
      row.split("|").slice(1, -1).map(c => c.trim());

    const isSep = (row: string) => /^\|[\s\-:|]+\|$/.test(row.trim());

    let headerRow: string[] | null = null;
    const bodyRows: string[][] = [];

    for (let i = 0; i < rows.length; i++) {
      if (isSep(rows[i])) continue;
      const cells = parseRow(rows[i]);
      if (!headerRow) {
        headerRow = cells;
      } else {
        bodyRows.push(cells);
      }
    }

    if (!headerRow) return fullMatch;

    let table = '<table><thead><tr>';
    headerRow.forEach(h => { table += `<th>${escapeHtml(h)}</th>`; });
    table += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      table += '<tr>';
      row.forEach(c => { table += `<td>${escapeHtml(c)}</td>`; });
      table += '</tr>';
    });
    table += '</tbody></table>';
    return prefix + table;
  });

  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
    return `<a href="${sanitizeHref(href)}">${escapeHtml(text)}</a>`;
  });

  out = out.replace(/(?:^|\n)> (.+(?:\n> .+)*)/g, (match) => {
    const text = match.trim().split("\n").map(l => l.replace(/^>\s?/, "")).join("\n");
    return `<blockquote>${text}</blockquote>`;
  });

  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  out = out.replace(/((?:^|\n)\d+\.\s+.+(?:\n\d+\.\s+.+)+)/g, (block) => {
    const items = block.trim().split("\n").filter(l => l.trim());
    const lis = items.map(l => {
      const content = l.replace(/^\d+\.\s+/, '').trim();
      return `<li>${content}</li>`;
    }).join('');
    return `<ol>${lis}</ol>`;
  });

  out = out.replace(/((?:^|\n)[-*]\s+.+(?:\n[-*]\s+.+)+)/g, (block) => {
    const items = block.trim().split("\n").filter(l => l.trim());
    const lis = items.map(l => {
      const content = l.replace(/^[-*]\s+/, '').trim();
      return `<li>${content}</li>`;
    }).join('');
    return `<ul>${lis}</ul>`;
  });

  out = out.replace(
    /<figure[^>]*>[\s\S]*?<img\s[^>]*src="https:\/\/oaidalleapiprodscus\.blob\.core\.windows\.net\/[^"]*"[^>]*\/>[\s\S]*?<\/figure>/g,
    ''
  );

  out = out.replace(/<figure[^>]*class="[^"]*visual-placeholder[^"]*"[^>]*>[\s\S]*?<\/figure>/g, '');

  out = out.replace(/<br\/>\s*(?=<img\s)/g, '');

  return out;
}

function processSections(sections: unknown): unknown {
  if (!Array.isArray(sections)) return sections;
  return sections.map((s: { heading?: string; body?: string }) => ({
    ...s,
    body: typeof s.body === "string" ? processContentBody(s.body) : s.body,
  }));
}

function processFullArticle(article: unknown): unknown {
  return typeof article === "string" ? processContentBody(article) : article;
}

const router: IRouter = Router();

router.get("/blog", async (_req, res): Promise<void> => {
  const posts = await db
    .select({
      id: blogPostsTable.id,
      title: blogPostsTable.title,
      headline: blogPostsTable.headline,
      slug: blogPostsTable.slug,
      metaDescription: blogPostsTable.metaDescription,
      summary: blogPostsTable.summary,
      contentType: blogPostsTable.contentType,
      wordCount: blogPostsTable.wordCount,
      publishedAt: blogPostsTable.publishedAt,
      targetKeyword: blogPostsTable.targetKeyword,
      authorPersonaId: blogPostsTable.authorPersonaId,
      heroImageUrl: blogPostsTable.heroImageUrl,
      heroImageAlt: blogPostsTable.heroImageAlt,
      visualMeta: blogPostsTable.visualMeta,
    })
    .from(blogPostsTable)
    .where(eq(blogPostsTable.status, "published"))
    .orderBy(desc(blogPostsTable.publishedAt));

  res.json(posts.map(p => {
    const hero = resolveHeroImage(p.heroImageUrl, p.heroImageAlt, p.visualMeta);
    return {
      ...p,
      publishedAt: p.publishedAt?.toISOString() ?? "",
      authorPersonaId: p.authorPersonaId ?? null,
      heroImageUrl: hero.url,
      heroImageAlt: hero.alt,
    };
  }));
});

router.get("/blog/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [post] = await db
    .select()
    .from(blogPostsTable)
    .where(eq(blogPostsTable.slug, slug));

  if (!post || post.status !== "published") {
    res.status(404).json({ error: "Post not found" });
    return;
  }

  res.json({
    ...post,
    sections: processSections(post.sections),
    fullArticle: processFullArticle(post.fullArticle),
    publishedAt: post.publishedAt?.toISOString() ?? "",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

export default router;
