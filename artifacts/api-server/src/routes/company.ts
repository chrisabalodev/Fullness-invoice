import { Router, type IRouter } from "express";
import { db, companyTable } from "@workspace/db";
import { UpdateCompanyBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateCompany() {
  const existing = await db.select().from(companyTable).limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db
    .insert(companyTable)
    .values({
      name: "MA SOCIETE",
      address: "",
      phone: "",
      fiscalNumber: "",
      rccm: "",
      bankAccounts: "",
      comptoirName: "COMPTOIR",
      comptoirCity: "",
      comptoirPhone: "",
      tvaRate: 18,
      currency: "F CFA",
      legalFooter: "",
    })
    .returning();
  return created!;
}

function serialize(row: NonNullable<Awaited<ReturnType<typeof getOrCreateCompany>>>) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    phone: row.phone,
    fiscalNumber: row.fiscalNumber,
    rccm: row.rccm,
    bankAccounts: row.bankAccounts,
    comptoirName: row.comptoirName,
    comptoirCity: row.comptoirCity,
    comptoirPhone: row.comptoirPhone,
    tvaRate: row.tvaRate,
    currency: row.currency,
    legalFooter: row.legalFooter,
  };
}

router.get("/company", async (_req, res): Promise<void> => {
  const company = await getOrCreateCompany();
  res.json(serialize(company));
});

router.put("/company", async (req, res): Promise<void> => {
  const parsed = UpdateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const company = await getOrCreateCompany();
  const [updated] = await db
    .update(companyTable)
    .set(parsed.data)
    .where((await import("drizzle-orm")).eq(companyTable.id, company.id))
    .returning();
  res.json(serialize(updated!));
});

export default router;
