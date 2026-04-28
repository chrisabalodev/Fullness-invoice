import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  designation: text("designation").notNull(),
  unite: text("unite").notNull().default("PIECE"),
  prixUnitaire: doublePrecision("prix_unitaire").notNull().default(0),
  depot: text("depot"),
  stock: doublePrecision("stock").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ArticleRow = typeof articlesTable.$inferSelect;
