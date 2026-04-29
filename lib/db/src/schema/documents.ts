import {
  pgTable,
  serial,
  text,
  integer,
  doublePrecision,
  boolean,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";
import { articlesTable } from "./articles";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  numero: text("numero").notNull().unique(),
  status: text("status").notNull().default("brouillon"),
  date: date("date").notNull(),
  echeance: date("echeance"),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "restrict" }),
  vendeur: text("vendeur"),
  reference: text("reference"),
  notes: text("notes"),
  modeReglement: text("mode_reglement"),
  totalHt: doublePrecision("total_ht").notNull().default(0),
  totalRemise: doublePrecision("total_remise").notNull().default(0),
  totalTva: doublePrecision("total_tva").notNull().default(0),
  totalTtc: doublePrecision("total_ttc").notNull().default(0),
  applyTva: boolean("apply_tva").notNull().default(true),
  tvaPourMemoire: boolean("tva_pour_memoire").notNull().default(false),
  relatedDocumentId: integer("related_document_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documentLinesTable = pgTable("document_lines", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  articleId: integer("article_id").references(() => articlesTable.id, {
    onDelete: "set null",
  }),
  reference: text("reference").notNull(),
  designation: text("designation").notNull(),
  quantite: doublePrecision("quantite").notNull().default(0),
  unite: text("unite").notNull().default("PIECE"),
  prixUnitaire: doublePrecision("prix_unitaire").notNull().default(0),
  remisePct: doublePrecision("remise_pct").notNull().default(0),
  tvaRate: doublePrecision("tva_rate").notNull().default(18),
  montantHt: doublePrecision("montant_ht").notNull().default(0),
  depot: text("depot"),
  position: integer("position").notNull().default(0),
});

export const reglementsTable = pgTable("reglements", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documentsTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  montant: doublePrecision("montant").notNull().default(0),
  mode: text("mode").notNull(),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DocumentRow = typeof documentsTable.$inferSelect;
export type DocumentLineRow = typeof documentLinesTable.$inferSelect;
export type ReglementRow = typeof reglementsTable.$inferSelect;
