import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { db, licenseTable, licenseKeysTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router: IRouter = Router();

const TRIAL_DAYS = 30;
const INITIAL_ADMIN_PASSWORD = "fullness@";

type LicenseRow = typeof licenseTable.$inferSelect;

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, s, 64).toString("hex");
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  return derived.length === stored.length && crypto.timingSafeEqual(derived, stored);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  // Guard against month overflow (e.g. Jan 31 + 1 month).
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function generateCode(): string {
  const raw = crypto.randomBytes(8).toString("hex").toUpperCase();
  return raw.match(/.{1,4}/g)!.join("-");
}

async function getOrCreateLicense(): Promise<LicenseRow> {
  // Deterministic retrieval of the singleton license row (lowest id).
  const existing = await db
    .select()
    .from(licenseTable)
    .orderBy(licenseTable.id)
    .limit(1);
  if (existing[0]) return existing[0];

  const now = new Date();
  const expires = new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
  const { hash, salt } = hashPassword(INITIAL_ADMIN_PASSWORD);
  const [created] = await db
    .insert(licenseTable)
    .values({
      expiresAt: expires,
      trialStartedAt: now,
      isTrial: true,
      adminPasswordHash: hash,
      adminPasswordSalt: salt,
    })
    .returning();
  return created!;
}

function statusPayload(lic: LicenseRow) {
  const now = Date.now();
  const exp = new Date(lic.expiresAt).getTime();
  const expired = now > exp;
  const daysRemaining = Math.max(0, Math.ceil((exp - now) / 86_400_000));
  return {
    expiresAt: new Date(lic.expiresAt).toISOString(),
    expired,
    daysRemaining,
    isTrial: lic.isTrial,
  };
}

function serializeKey(row: typeof licenseKeysTable.$inferSelect) {
  return {
    id: row.id,
    code: row.code,
    months: row.months,
    status: row.status,
    note: row.note ?? null,
    redeemedAt: row.redeemedAt ? new Date(row.redeemedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

// Public: current license status (used by the app gate).
router.get("/license/status", async (_req, res): Promise<void> => {
  const lic = await getOrCreateLicense();
  res.json(statusPayload(lic));
});

// Public + independent: redeem a license key to extend the validity.
router.post("/license/redeem", async (req, res): Promise<void> => {
  const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
  if (!code) {
    res.status(400).json({ error: "Veuillez saisir une clé de licence." });
    return;
  }

  const lic = await getOrCreateLicense();
  const now = new Date();

  // Atomic redemption: lock the key + license rows, mark the key used only if it
  // is still unused, and compute the new expiry from the freshly-locked license.
  const updated = await db.transaction(async (tx) => {
    const [key] = await tx
      .select()
      .from(licenseKeysTable)
      .where(and(eq(licenseKeysTable.code, code), eq(licenseKeysTable.status, "unused")))
      .for("update")
      .limit(1);
    if (!key) return null;

    const [curLic] = await tx
      .select()
      .from(licenseTable)
      .where(eq(licenseTable.id, lic.id))
      .for("update")
      .limit(1);
    const current = curLic ?? lic;

    const base =
      new Date(current.expiresAt).getTime() > now.getTime()
        ? new Date(current.expiresAt)
        : now;
    const newExpiry = addMonths(base, key.months);

    const marked = await tx
      .update(licenseKeysTable)
      .set({ status: "used", redeemedAt: now })
      .where(and(eq(licenseKeysTable.id, key.id), eq(licenseKeysTable.status, "unused")))
      .returning();
    if (marked.length === 0) return null;

    const [row] = await tx
      .update(licenseTable)
      .set({ expiresAt: newExpiry, isTrial: false })
      .where(eq(licenseTable.id, current.id))
      .returning();
    return { row: row!, months: key.months };
  });

  if (!updated) {
    res.status(400).json({ error: "Clé de licence invalide ou déjà utilisée." });
    return;
  }

  req.log.info({ months: updated.months }, "license key redeemed");
  res.json({ success: true, ...statusPayload(updated.row) });
});

// Admin login: verify password only.
router.post("/license/admin/verify", async (req, res): Promise<void> => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const lic = await getOrCreateLicense();
  if (!password || !verifyPassword(password, lic.adminPasswordHash, lic.adminPasswordSalt)) {
    res.status(401).json({ error: "Mot de passe administrateur incorrect." });
    return;
  }
  res.json({ success: true });
});

// Middleware: protect admin endpoints with the admin password header.
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const password = req.header("x-admin-password") ?? "";
  const lic = await getOrCreateLicense();
  if (!password || !verifyPassword(password, lic.adminPasswordHash, lic.adminPasswordSalt)) {
    res.status(401).json({ error: "Mot de passe administrateur incorrect." });
    return;
  }
  next();
}

// Admin: list all generated keys.
router.get("/license/admin/keys", requireAdmin, async (_req, res): Promise<void> => {
  const keys = await db
    .select()
    .from(licenseKeysTable)
    .orderBy(desc(licenseKeysTable.createdAt));
  res.json(keys.map(serializeKey));
});

// Admin: generate a new license key for a chosen number of months.
router.post("/license/admin/keys", requireAdmin, async (req, res): Promise<void> => {
  const months = Number(req.body?.months);
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    res.status(400).json({ error: "Le nombre de mois doit être un entier entre 1 et 120." });
    return;
  }
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

  let created: typeof licenseKeysTable.$inferSelect | undefined;
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      const [row] = await db
        .insert(licenseKeysTable)
        .values({ code: generateCode(), months, note: note || null })
        .returning();
      created = row;
    } catch {
      // Unique collision on code — retry with a new code.
    }
  }

  if (!created) {
    res.status(500).json({ error: "Impossible de générer la clé. Réessayez." });
    return;
  }

  req.log.info({ months }, "license key generated");
  res.json(serializeKey(created));
});

// Admin: change the admin password.
router.post("/license/admin/password", requireAdmin, async (req, res): Promise<void> => {
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
  if (newPassword.length < 4) {
    res.status(400).json({ error: "Le mot de passe doit contenir au moins 4 caractères." });
    return;
  }
  const lic = await getOrCreateLicense();
  const { hash, salt } = hashPassword(newPassword);
  await db
    .update(licenseTable)
    .set({ adminPasswordHash: hash, adminPasswordSalt: salt })
    .where(eq(licenseTable.id, lic.id));
  res.json({ success: true });
});

// Server-side enforcement: block business routes when the license has expired.
// Mount this AFTER the license router so /license/* endpoints stay reachable.
export async function licenseGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const lic = await getOrCreateLicense();
  const expired = Date.now() > new Date(lic.expiresAt).getTime();
  if (expired) {
    res.status(403).json({ error: "Licence expirée.", licenseExpired: true });
    return;
  }
  next();
}

export default router;
