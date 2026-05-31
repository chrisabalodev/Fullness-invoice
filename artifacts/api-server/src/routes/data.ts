import { Router, type IRouter } from "express";
import {
  db,
  companyTable,
  clientsTable,
  articlesTable,
  documentsTable,
  documentLinesTable,
  reglementsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

const EXPORT_VERSION = 1;

type Row = Record<string, unknown>;

function isRowArray(value: unknown): value is Row[] {
  return Array.isArray(value) && value.every((r) => r != null && typeof r === "object");
}

/** Convert ISO timestamp strings back to Date objects for the given fields. */
function reviveTimestamps(rows: Row[], fields: string[]): Row[] {
  return rows.map((row) => {
    const out: Row = { ...row };
    for (const field of fields) {
      if (typeof out[field] === "string") {
        out[field] = new Date(out[field] as string);
      }
    }
    return out;
  });
}

const SEQUENCE_TABLES = [
  "company",
  "clients",
  "articles",
  "documents",
  "document_lines",
  "reglements",
] as const;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Realign serial sequences after inserting rows with explicit ids.
 * The third `setval` argument (`is_called`) is set from `MAX(id) IS NOT NULL`:
 * non-empty tables continue at max+1, empty tables restart at 1.
 */
async function realignSequences(tx: Tx): Promise<void> {
  for (const table of SEQUENCE_TABLES) {
    await tx.execute(
      sql.raw(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE((SELECT MAX(id) FROM "${table}"), 1), (SELECT MAX(id) IS NOT NULL FROM "${table}"))`,
      ),
    );
  }
}

// GET /api/data/export — download a full JSON backup of every table.
router.get("/data/export", async (_req, res): Promise<void> => {
  const [company, clients, articles, documents, documentLines, reglements] =
    await Promise.all([
      db.select().from(companyTable),
      db.select().from(clientsTable),
      db.select().from(articlesTable),
      db.select().from(documentsTable),
      db.select().from(documentLinesTable),
      db.select().from(reglementsTable),
    ]);

  const payload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    company,
    clients,
    articles,
    documents,
    documentLines,
    reglements,
  };

  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="sauvegarde-gescom-${stamp}.json"`,
  );
  res.send(JSON.stringify(payload, null, 2));
});

// POST /api/data/import — replace ALL data with the contents of a backup file.
router.post("/data/import", async (req, res): Promise<void> => {
  const body = req.body as Row | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Fichier de sauvegarde invalide." });
    return;
  }

  if (body.version !== EXPORT_VERSION) {
    res.status(400).json({
      error: "Version de sauvegarde non supportée. Utilisez un fichier exporté depuis l'application.",
    });
    return;
  }

  const company = body.company;
  const clients = body.clients;
  const articles = body.articles;
  const documents = body.documents;
  const documentLines = body.documentLines;
  const reglements = body.reglements;

  if (
    !isRowArray(company) ||
    !isRowArray(clients) ||
    !isRowArray(articles) ||
    !isRowArray(documents) ||
    !isRowArray(documentLines) ||
    !isRowArray(reglements)
  ) {
    res
      .status(400)
      .json({ error: "Format de sauvegarde non reconnu. Utilisez un fichier exporté depuis l'application." });
    return;
  }

  // Guard against wiping company settings with an empty/malformed backup.
  if (company.length === 0) {
    res.status(400).json({
      error: "Sauvegarde incomplète : informations de l'entreprise manquantes.",
    });
    return;
  }

  try {
    await db.transaction(async (tx) => {
      // Delete in FK-safe order.
      await tx.delete(reglementsTable);
      await tx.delete(documentLinesTable);
      await tx.delete(documentsTable);
      await tx.delete(articlesTable);
      await tx.delete(clientsTable);
      await tx.delete(companyTable);

      // Insert in dependency order, preserving ids.
      if (company.length) {
        await tx.insert(companyTable).values(reviveTimestamps(company, ["updatedAt"]) as never);
      }
      if (clients.length) {
        await tx.insert(clientsTable).values(reviveTimestamps(clients, ["createdAt"]) as never);
      }
      if (articles.length) {
        await tx.insert(articlesTable).values(reviveTimestamps(articles, ["createdAt"]) as never);
      }
      if (documents.length) {
        await tx.insert(documentsTable).values(reviveTimestamps(documents, ["createdAt"]) as never);
      }
      if (documentLines.length) {
        await tx.insert(documentLinesTable).values(documentLines as never);
      }
      if (reglements.length) {
        await tx.insert(reglementsTable).values(reviveTimestamps(reglements, ["createdAt"]) as never);
      }

      await realignSequences(tx);
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "data import failed");
    res
      .status(400)
      .json({ error: "Échec de l'import. Le fichier est peut-être corrompu ou incompatible." });
  }
});

// POST /api/data/reset — wipe all clients, articles, documents and reglements.
// Company settings are preserved.
router.post("/data/reset", async (req, res): Promise<void> => {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(reglementsTable);
      await tx.delete(documentLinesTable);
      await tx.delete(documentsTable);
      await tx.delete(articlesTable);
      await tx.delete(clientsTable);
      await realignSequences(tx);
    });
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "data reset failed");
    res.status(500).json({ error: "Échec de la réinitialisation des données." });
  }
});

export default router;
