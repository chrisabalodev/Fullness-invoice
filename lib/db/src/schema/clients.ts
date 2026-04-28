import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactName: text("contact_name"),
  address: text("address"),
  city: text("city"),
  phone: text("phone"),
  email: text("email"),
  fiscalNumber: text("fiscal_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ClientRow = typeof clientsTable.$inferSelect;
