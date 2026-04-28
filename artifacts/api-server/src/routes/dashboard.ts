import { Router, type IRouter } from "express";
import {
  db,
  documentsTable,
  documentLinesTable,
  clientsTable,
  articlesTable,
  companyTable,
} from "@workspace/db";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import {
  GetRecentDocumentsQueryParams,
  GetTopClientsQueryParams,
  GetTopArticlesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [{ totalRevenue, invoiceCount }] = await db
    .select({
      totalRevenue: sql<number>`coalesce(sum(${documentsTable.totalTtc}), 0)`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(eq(documentsTable.type, "facture"));

  const [{ totalUnpaid }] = await db
    .select({
      totalUnpaid: sql<number>`coalesce(sum(${documentsTable.totalTtc}), 0)`,
    })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.type, "facture"),
        sql`${documentsTable.status} != 'paye'`,
        sql`${documentsTable.status} != 'annule'`,
      ),
    );

  const [{ quoteCount }] = await db
    .select({ quoteCount: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(eq(documentsTable.type, "devis"));

  const [{ deliveryCount }] = await db
    .select({ deliveryCount: sql<number>`count(*)::int` })
    .from(documentsTable)
    .where(eq(documentsTable.type, "bon_livraison"));

  const [{ clientCount }] = await db
    .select({ clientCount: sql<number>`count(*)::int` })
    .from(clientsTable);

  const [{ articleCount }] = await db
    .select({ articleCount: sql<number>`count(*)::int` })
    .from(articlesTable);

  const [c] = await db.select().from(companyTable).limit(1);
  const currency = c?.currency ?? "F CFA";

  res.json({
    totalRevenue: Number(totalRevenue),
    totalUnpaid: Number(totalUnpaid),
    invoiceCount: Number(invoiceCount),
    quoteCount: Number(quoteCount),
    deliveryCount: Number(deliveryCount),
    clientCount: Number(clientCount),
    articleCount: Number(articleCount),
    currency,
  });
});

router.get("/dashboard/recent-documents", async (req, res): Promise<void> => {
  const parsed = GetRecentDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 10;
  const rows = await db
    .select({
      id: documentsTable.id,
      type: documentsTable.type,
      numero: documentsTable.numero,
      status: documentsTable.status,
      date: documentsTable.date,
      echeance: documentsTable.echeance,
      clientId: documentsTable.clientId,
      clientName: clientsTable.name,
      totalTtc: documentsTable.totalTtc,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .leftJoin(clientsTable, eq(clientsTable.id, documentsTable.clientId))
    .orderBy(desc(documentsTable.createdAt))
    .limit(limit);
  res.json(rows.map((r) => ({ ...r, clientName: r.clientName ?? "—" })));
});

router.get("/dashboard/top-clients", async (req, res): Promise<void> => {
  const parsed = GetTopClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 5;
  const rows = await db
    .select({
      clientId: documentsTable.clientId,
      clientName: clientsTable.name,
      totalRevenue: sql<number>`coalesce(sum(${documentsTable.totalTtc}), 0)`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .leftJoin(clientsTable, eq(clientsTable.id, documentsTable.clientId))
    .where(eq(documentsTable.type, "facture"))
    .groupBy(documentsTable.clientId, clientsTable.name)
    .orderBy(desc(sql`sum(${documentsTable.totalTtc})`))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName ?? "—",
      totalRevenue: Number(r.totalRevenue),
      invoiceCount: Number(r.invoiceCount),
    })),
  );
});

router.get("/dashboard/top-articles", async (req, res): Promise<void> => {
  const parsed = GetTopArticlesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 5;
  const rows = await db
    .select({
      articleId: documentLinesTable.articleId,
      reference: documentLinesTable.reference,
      designation: documentLinesTable.designation,
      totalQuantity: sql<number>`coalesce(sum(${documentLinesTable.quantite}), 0)`,
      totalRevenue: sql<number>`coalesce(sum(${documentLinesTable.montantHt}), 0)`,
    })
    .from(documentLinesTable)
    .leftJoin(documentsTable, eq(documentsTable.id, documentLinesTable.documentId))
    .where(eq(documentsTable.type, "facture"))
    .groupBy(
      documentLinesTable.articleId,
      documentLinesTable.reference,
      documentLinesTable.designation,
    )
    .orderBy(desc(sql`sum(${documentLinesTable.montantHt})`))
    .limit(limit);
  res.json(
    rows.map((r) => ({
      articleId: r.articleId,
      reference: r.reference,
      designation: r.designation,
      totalQuantity: Number(r.totalQuantity),
      totalRevenue: Number(r.totalRevenue),
    })),
  );
});

router.get("/dashboard/monthly-revenue", async (_req, res): Promise<void> => {
  const since = new Date();
  since.setMonth(since.getMonth() - 11);
  since.setDate(1);
  const sinceStr = since.toISOString().slice(0, 10);

  const rows = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${documentsTable.date}::timestamp), 'YYYY-MM')`,
      revenue: sql<number>`coalesce(sum(${documentsTable.totalTtc}), 0)`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.type, "facture"),
        gte(documentsTable.date, sinceStr),
      ),
    )
    .groupBy(sql`date_trunc('month', ${documentsTable.date}::timestamp)`)
    .orderBy(sql`date_trunc('month', ${documentsTable.date}::timestamp)`);

  const map = new Map<string, { revenue: number; invoiceCount: number }>();
  for (const r of rows) {
    map.set(r.month, {
      revenue: Number(r.revenue),
      invoiceCount: Number(r.invoiceCount),
    });
  }

  const result: Array<{ month: string; revenue: number; invoiceCount: number }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(since);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const v = map.get(key) ?? { revenue: 0, invoiceCount: 0 };
    result.push({ month: key, revenue: v.revenue, invoiceCount: v.invoiceCount });
  }

  res.json(result);
});

export default router;
