import {
  pgTable,
  serial,
  text,
  doublePrecision,
  timestamp,
  integer,
  boolean,
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
  smtpHost: text("smtp_host").notNull().default(""),
  smtpPort: integer("smtp_port").notNull().default(587),
  smtpUser: text("smtp_user").notNull().default(""),
  smtpPassword: text("smtp_password").notNull().default(""),
  smtpFromName: text("smtp_from_name").notNull().default(""),
  smtpFromEmail: text("smtp_from_email").notNull().default(""),
  smtpSecure: boolean("smtp_secure").notNull().default(false),
  showHeader: boolean("show_header").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type CompanyRow = typeof companyTable.$inferSelect;
