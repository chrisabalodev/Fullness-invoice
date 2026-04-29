import { Router, type IRouter } from "express";
import { db, reglementsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import {
  ListReglementsParams,
  CreateReglementParams,
  CreateReglementBody,
  DeleteReglementParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/documents/:id/reglements", async (req, res): Promise<void> => {
  const params = ListReglementsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(reglementsTable)
    .where(eq(reglementsTable.documentId, params.data.id))
    .orderBy(asc(reglementsTable.date));
  res.json(rows);
});

router.post("/documents/:id/reglements", async (req, res): Promise<void> => {
  const params = CreateReglementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = CreateReglementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [row] = await db
    .insert(reglementsTable)
    .values({
      documentId: params.data.id,
      date:
        body.data.date instanceof Date
          ? body.data.date.toISOString().slice(0, 10)
          : (body.data.date as unknown as string),
      montant: body.data.montant,
      mode: body.data.mode,
      reference: body.data.reference ?? null,
      notes: body.data.notes ?? null,
    })
    .returning();
  res.status(201).json(row);
});

router.delete("/reglements/:id", async (req, res): Promise<void> => {
  const params = DeleteReglementParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(reglementsTable).where(eq(reglementsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
