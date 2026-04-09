import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";

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
    const vm = Array.isArray(p.visualMeta) ? p.visualMeta as any[] : [];
    const firstImage = vm.find((v: any) => v.succeeded && v.url);
    const imageUrl = p.heroImageUrl || firstImage?.url || null;
    const imageAlt = p.heroImageAlt || firstImage?.altText || null;
    return {
      ...p,
      publishedAt: p.publishedAt?.toISOString() ?? "",
      authorPersonaId: p.authorPersonaId ?? null,
      heroImageUrl: imageUrl,
      heroImageAlt: imageAlt,
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
