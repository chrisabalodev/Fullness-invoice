import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";

export const companyTable = pgTable("company", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  fiscalNumber: text("fiscal_number").notNull(),
  rccm: text("rccm").notNull(),
  bankAccounts: text("bank_accounts").notNull(),
  modesReglement: text("modes_reglement").notNull().default(""),
  conditionsPaiement: text("conditions_paiement").notNull().default(""),
  comptoirName: text("comptoir_name").notNull(),
  comptoirCity: text("comptoir_city").notNull(),
  comptoirPhone: text("comptoir_phone").notNull(),
  tvaRate: doublePrecision("tva_rate").notNull().default(18),
  currency: text("currency").notNull().default("F CFA"),
  legalFooter: text("legal_footer").notNull().default(""),
  emailSignature: text("email_signature").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CompanyRow = typeof companyTable.$inferSelect;
