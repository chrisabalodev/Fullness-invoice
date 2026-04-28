import { Router, type IRouter } from "express";
import { db, articlesTable } from "@workspace/db";
import { eq, ilike, or, asc } from "drizzle-orm";
import {
  CreateArticleBody,
  GetArticleParams,
  UpdateArticleParams,
  UpdateArticleBody,
  DeleteArticleParams,
  ListArticlesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/articles", async (req, res): Promise<void> => {
  const parsed = ListArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const search = parsed.data.search;
  const rows = search
    ? await db
        .select()
        .from(articlesTable)
        .where(
          or(
            ilike(articlesTable.reference, `%${search}%`),
            ilike(articlesTable.designation, `%${search}%`),
          ),
        )
        .orderBy(asc(articlesTable.reference))
    : await db
        .select()
        .from(articlesTable)
        .orderBy(asc(articlesTable.reference));
  res.json(rows);
});

router.post("/articles", async (req, res): Promise<void> => {
  const parsed = CreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [row] = await db.insert(articlesTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.warn({ err }, "Failed to create article");
    res.status(409).json({ error: "Référence déjà utilisée" });
  }
});

router.get("/articles/:id", async (req, res): Promise<void> => {
  const params = GetArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [row] = await db
    .select()
    .from(articlesTable)
    .where(eq(articlesTable.id, params.data.id));
  if (!row) {
    res.status(404).json({ error: "Article introuvable" });
    return;
  }
  res.json(row);
});

router.put("/articles/:id", async (req, res): Promise<void> => {
  const params = UpdateArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateArticleBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .update(articlesTable)
    .set(body.data)
    .where(eq(articlesTable.id, params.data.id))
    .returning();
  if (!row) {
    res.status(404).json({ error: "Article introuvable" });
    return;
  }
  res.json(row);
});

router.delete("/articles/:id", async (req, res): Promise<void> => {
  const params = DeleteArticleParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(articlesTable).where(eq(articlesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
