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

function resolveHeroImage(
  heroUrl: string | null,
  heroAlt: string | null,
  visualMeta: unknown
): { url: string | null; alt: string | null } {
  if (heroUrl) return { url: heroUrl, alt: heroAlt };
  const items = Array.isArray(visualMeta) ? visualMeta.filter(isVisualMetaItem) : [];
  const best = items.find(v => v.url && v.succeeded !== false) ?? items.find(v => !!v.url);
  return { url: best?.url ?? null, alt: best?.altText ?? null };
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
    publishedAt: post.publishedAt?.toISOString() ?? "",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  });
});

export default router;
