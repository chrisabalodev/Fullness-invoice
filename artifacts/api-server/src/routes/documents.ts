import { Router, type IRouter } from "express";
import {
  db,
  documentsTable,
  documentLinesTable,
  clientsTable,
  companyTable,
  reglementsTable,
} from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  CreateDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
  UpdateDocumentStatusParams,
  UpdateDocumentStatusBody,
  ConvertDocumentParams,
  ConvertDocumentBody,
  ListDocumentsQueryParams,
} from "@workspace/api-zod";
import { generateNumero } from "../lib/numero";
import { computeTotals, computeLineMontantHt } from "../lib/totals";
import { generateDocumentPdf } from "../lib/pdf";
import { sendEmail, testSmtpConnection } from "../lib/email";

const router: IRouter = Router();

async function getCompanyTvaRate(): Promise<number> {
  const [c] = await db.select().from(companyTable).limit(1);
  return c?.tvaRate ?? 18;
}

async function loadDocument(id: number) {
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) return null;
  const [client] = await db.select().from(clientsTable).where(eq(clientsTable.id, doc.clientId));
  const lines = await db
    .select()
    .from(documentLinesTable)
    .where(eq(documentLinesTable.documentId, doc.id))
    .orderBy(asc(documentLinesTable.position));
  const reglements = await db
    .select()
    .from(reglementsTable)
    .where(eq(reglementsTable.documentId, doc.id))
    .orderBy(asc(reglementsTable.date));
  let relatedDocumentNumero: string | null = null;
  if (doc.relatedDocumentId) {
    const [rel] = await db
      .select({ numero: documentsTable.numero })
      .from(documentsTable)
      .where(eq(documentsTable.id, doc.relatedDocumentId));
    relatedDocumentNumero = rel?.numero ?? null;
  }
  const totalRegle =
    Math.round(reglements.reduce((s, r) => s + (r.montant ?? 0), 0) * 100) / 100;
  const resteAPayer = Math.round((doc.totalTtc - totalRegle) * 100) / 100;

  return {
    id: doc.id,
    type: doc.type,
    numero: doc.numero,
    status: doc.status,
    date: doc.date,
    echeance: doc.echeance,
    clientId: doc.clientId,
    client: client ?? null,
    vendeur: doc.vendeur,
    reference: doc.reference,
    notes: doc.notes,
    modeReglement: doc.modeReglement,
    conditionsPaiement: doc.conditionsPaiement,
    lines,
    reglements,
    totalHt: doc.totalHt,
    totalRemise: doc.totalRemise,
    totalTva: doc.totalTva,
    totalTtc: doc.totalTtc,
    totalRegle,
    resteAPayer,
    applyTva: doc.applyTva,
    tvaPourMemoire: doc.tvaPourMemoire,
    relatedDocumentId: doc.relatedDocumentId,
    relatedDocumentNumero,
    createdAt: doc.createdAt,
  };
}

router.get("/documents", async (req, res): Promise<void> => {
  const parsed = ListDocumentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { type, status, clientId, search } = parsed.data;

  const conditions = [];
  if (type) conditions.push(eq(documentsTable.type, type));
  if (status) conditions.push(eq(documentsTable.status, status));
  if (clientId) conditions.push(eq(documentsTable.clientId, clientId));

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
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(documentsTable.createdAt));

  let filtered = rows.map((r) => ({ ...r, clientName: r.clientName ?? "—" }));
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) => r.numero.toLowerCase().includes(q) || r.clientName.toLowerCase().includes(q),
    );
  }
  res.json(filtered);
});

router.post("/documents", async (req, res): Promise<void> => {
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tvaRate = await getCompanyTvaRate();
  const totals = computeTotals(
    parsed.data.lines,
    parsed.data.applyTva,
    tvaRate,
    parsed.data.tvaPourMemoire ?? false,
  );
  const numero = await generateNumero(parsed.data.type);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      type: parsed.data.type,
      numero,
      status: parsed.data.status,
      date: parsed.data.date instanceof Date
        ? parsed.data.date.toISOString().slice(0, 10)
        : (parsed.data.date as unknown as string),
      echeance: parsed.data.echeance
        ? parsed.data.echeance instanceof Date
          ? parsed.data.echeance.toISOString().slice(0, 10)
          : (parsed.data.echeance as unknown as string)
        : null,
      clientId: parsed.data.clientId,
      vendeur: parsed.data.vendeur ?? null,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      modeReglement: parsed.data.modeReglement ?? null,
      conditionsPaiement: parsed.data.conditionsPaiement ?? null,
      applyTva: parsed.data.applyTva,
      tvaPourMemoire: parsed.data.tvaPourMemoire ?? false,
      ...totals,
    })
    .returning();

  if (!doc) {
    res.status(500).json({ error: "Échec de création" });
    return;
  }

  if (parsed.data.lines.length > 0) {
    await db.insert(documentLinesTable).values(
      parsed.data.lines.map((line, idx) => ({
        documentId: doc.id,
        articleId: line.articleId ?? null,
        reference: line.reference,
        designation: line.designation,
        quantite: line.quantite,
        unite: line.unite,
        prixUnitaire: line.prixUnitaire,
        remisePct: line.remisePct,
        tvaRate: line.tvaRate,
        montantHt: computeLineMontantHt(line),
        depot: line.depot ?? null,
        position: idx,
      })),
    );
  }

  const result = await loadDocument(doc.id);
  res.status(201).json(result);
});

router.get("/documents/:id", async (req, res): Promise<void> => {
  const params = GetDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const doc = await loadDocument(params.data.id);
  if (!doc) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }
  res.json(doc);
});

router.put("/documents/:id", async (req, res): Promise<void> => {
  const params = UpdateDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateDocumentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const tvaRate = await getCompanyTvaRate();
  const totals = computeTotals(
    body.data.lines,
    body.data.applyTva,
    tvaRate,
    body.data.tvaPourMemoire ?? false,
  );

  // Si le type change, régénérer le numéro avec le bon préfixe
  const [existing] = await db
    .select({ type: documentsTable.type, numero: documentsTable.numero })
    .from(documentsTable)
    .where(eq(documentsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }
  const numero =
    existing.type !== body.data.type
      ? await generateNumero(body.data.type)
      : existing.numero;

  const [doc] = await db
    .update(documentsTable)
    .set({
      type: body.data.type,
      numero,
      status: body.data.status,
      date: body.data.date instanceof Date
        ? body.data.date.toISOString().slice(0, 10)
        : (body.data.date as unknown as string),
      echeance: body.data.echeance
        ? body.data.echeance instanceof Date
          ? body.data.echeance.toISOString().slice(0, 10)
          : (body.data.echeance as unknown as string)
        : null,
      clientId: body.data.clientId,
      vendeur: body.data.vendeur ?? null,
      reference: body.data.reference ?? null,
      notes: body.data.notes ?? null,
      modeReglement: body.data.modeReglement ?? null,
      conditionsPaiement: body.data.conditionsPaiement ?? null,
      applyTva: body.data.applyTva,
      tvaPourMemoire: body.data.tvaPourMemoire ?? false,
      ...totals,
    })
    .where(eq(documentsTable.id, params.data.id))
    .returning();

  if (!doc) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }

  await db.delete(documentLinesTable).where(eq(documentLinesTable.documentId, doc.id));
  if (body.data.lines.length > 0) {
    await db.insert(documentLinesTable).values(
      body.data.lines.map((line, idx) => ({
        documentId: doc.id,
        articleId: line.articleId ?? null,
        reference: line.reference,
        designation: line.designation,
        quantite: line.quantite,
        unite: line.unite,
        prixUnitaire: line.prixUnitaire,
        remisePct: line.remisePct,
        tvaRate: line.tvaRate,
        montantHt: computeLineMontantHt(line),
        depot: line.depot ?? null,
        position: idx,
      })),
    );
  }

  const result = await loadDocument(doc.id);
  res.json(result);
});

router.delete("/documents/:id", async (req, res): Promise<void> => {
  const params = DeleteDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(documentsTable).where(eq(documentsTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/documents/:id/status", async (req, res): Promise<void> => {
  const params = UpdateDocumentStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = UpdateDocumentStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [doc] = await db
    .update(documentsTable)
    .set({ status: body.data.status })
    .where(eq(documentsTable.id, params.data.id))
    .returning();
  if (!doc) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }
  const result = await loadDocument(doc.id);
  res.json(result);
});

router.post("/documents/:id/convert", async (req, res): Promise<void> => {
  const params = ConvertDocumentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = ConvertDocumentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const source = await loadDocument(params.data.id);
  if (!source) {
    res.status(404).json({ error: "Document source introuvable" });
    return;
  }
  const tvaRate = await getCompanyTvaRate();
  const lines = source.lines.map((l) => ({
    articleId: l.articleId,
    reference: l.reference,
    designation: l.designation,
    quantite: l.quantite,
    unite: l.unite,
    prixUnitaire: l.prixUnitaire,
    remisePct: l.remisePct,
    tvaRate: l.tvaRate ?? tvaRate,
    depot: l.depot,
  }));
  const totals = computeTotals(lines, source.applyTva, tvaRate, source.tvaPourMemoire);
  const numero = await generateNumero(body.data.targetType);
  const today = new Date().toISOString().slice(0, 10);

  const [doc] = await db
    .insert(documentsTable)
    .values({
      type: body.data.targetType,
      numero,
      status: "valide",
      date: today,
      echeance: null,
      clientId: source.clientId,
      vendeur: source.vendeur,
      reference: source.numero,
      notes: source.notes,
      modeReglement: source.modeReglement,
      conditionsPaiement: source.conditionsPaiement,
      applyTva: source.applyTva,
      tvaPourMemoire: source.tvaPourMemoire,
      relatedDocumentId: source.id,
      ...totals,
    })
    .returning();

  if (!doc) {
    res.status(500).json({ error: "Échec de conversion" });
    return;
  }

  if (lines.length > 0) {
    await db.insert(documentLinesTable).values(
      lines.map((line, idx) => ({
        documentId: doc.id,
        articleId: line.articleId ?? null,
        reference: line.reference,
        designation: line.designation,
        quantite: line.quantite,
        unite: line.unite,
        prixUnitaire: line.prixUnitaire,
        remisePct: line.remisePct,
        tvaRate: line.tvaRate,
        montantHt: computeLineMontantHt(line),
        depot: line.depot ?? null,
        position: idx,
      })),
    );
  }

  const result = await loadDocument(doc.id);
  res.status(201).json(result);
});

// GET /documents/:id/pdf — Téléchargement du PDF
router.get("/documents/:id/pdf", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const doc = await loadDocument(id);
  if (!doc) { res.status(404).json({ error: "Document introuvable" }); return; }
  const [companyRow] = await db.select().from(companyTable).limit(1);
  const pdfBuffer = await generateDocumentPdf(doc, companyRow ?? {});
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.numero}.pdf"`);
  res.send(pdfBuffer);
});

// POST /documents/:id/send-email — Envoi par email
router.post("/documents/:id/send-email", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "ID invalide" }); return; }
  const { to, subject, body } = req.body as { to: string; subject: string; body: string };
  if (!to || !subject) { res.status(400).json({ error: "Destinataire et sujet requis" }); return; }
  const doc = await loadDocument(id);
  if (!doc) { res.status(404).json({ error: "Document introuvable" }); return; }
  const [companyRow] = await db.select().from(companyTable).limit(1);
  if (!companyRow?.smtpHost) {
    res.status(400).json({ error: "Configuration SMTP manquante — veuillez renseigner les paramètres SMTP" });
    return;
  }
  const pdfBuffer = await generateDocumentPdf(doc, companyRow ?? {});
  await sendEmail({
    smtp: {
      host: companyRow.smtpHost,
      port: companyRow.smtpPort ?? 587,
      user: companyRow.smtpUser ?? "",
      password: companyRow.smtpPassword ?? "",
      fromName: companyRow.smtpFromName ?? "",
      fromEmail: companyRow.smtpFromEmail ?? "",
      secure: companyRow.smtpSecure ?? false,
    },
    to,
    subject,
    body,
    attachments: [{ filename: `${doc.numero}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });
  res.json({ success: true });
});

// POST /company/test-smtp — Test de connexion SMTP
router.post("/company/test-smtp", async (req, res): Promise<void> => {
  const { host, port, user, password, fromName, fromEmail, secure } = req.body as {
    host: string; port: number; user: string; password: string; fromName: string; fromEmail: string; secure: boolean;
  };
  if (!host) { res.status(400).json({ success: false, error: "Hôte SMTP requis" }); return; }
  try {
    await testSmtpConnection({ host, port: Number(port) || 587, user: user ?? "", password: password ?? "", fromName: fromName ?? "", fromEmail: fromEmail ?? "", secure: secure ?? false });
    res.json({ success: true, message: "Connexion SMTP réussie" });
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message ?? "Échec de la connexion SMTP" });
  }
});

export default router;
