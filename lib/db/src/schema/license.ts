import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const licenseTable = pgTable("license", {
  id: serial("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  isTrial: boolean("is_trial").notNull().default(true),
  adminPasswordHash: text("admin_password_hash").notNull(),
  adminPasswordSalt: text("admin_password_salt").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const licenseKeysTable = pgTable("license_keys", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  months: integer("months").notNull(),
  status: text("status").notNull().default("unused"),
  note: text("note"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LicenseRow = typeof licenseTable.$inferSelect;
export type LicenseKeyRow = typeof licenseKeysTable.$inferSelect;
