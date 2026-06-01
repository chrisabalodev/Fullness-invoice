import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

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
  // Flexible validity duration: a quantity + a unit
  // ("minute" | "hour" | "day" | "month" | "year").
  durationValue: integer("duration_value").notNull(),
  durationUnit: text("duration_unit").notNull(),
  status: text("status").notNull().default("unused"),
  note: text("note"),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  check(
    "license_keys_duration_unit_valid",
    sql`${table.durationUnit} IN ('minute', 'hour', 'day', 'month', 'year')`,
  ),
  check("license_keys_duration_value_positive", sql`${table.durationValue} > 0`),
]);

export type LicenseRow = typeof licenseTable.$inferSelect;
export type LicenseKeyRow = typeof licenseKeysTable.$inferSelect;
