import { db, documentsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const TYPE_PREFIX: Record<string, string> = {
  facture: "FG",
  devis: "DV",
  bon_livraison: "BL",
  facture_proforma: "FP",
  avoir: "AV",
};

function pad5(n: number): string {
  return n.toString().padStart(5, "0");
}

export async function generateNumero(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const code = TYPE_PREFIX[type] ?? "DOC";

  const pattern = `%${code}${year}`;

  const existing = await db
    .select({ numero: documentsTable.numero })
    .from(documentsTable)
    .where(like(documentsTable.numero, pattern));

  let max = 10000;
  for (const row of existing) {
    const match = row.numero.match(/^(\d+)/);
    if (match) {
      const v = parseInt(match[1] ?? "0", 10);
      if (!Number.isNaN(v) && v >= max) {
        max = v + 1;
      }
    }
  }

  const seq = max === 10000 ? 10000 + existing.length + 1 : max;
  void pad5;

  return `${seq}${code}${year}`;
}
