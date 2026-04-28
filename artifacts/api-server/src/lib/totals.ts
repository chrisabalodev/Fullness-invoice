export interface LineInput {
  quantite: number;
  prixUnitaire: number;
  remisePct: number;
}

export function computeLineMontantHt(line: LineInput): number {
  const base = line.quantite * line.prixUnitaire;
  const remise = base * (line.remisePct / 100);
  return Math.max(0, base - remise);
}

export function computeTotals(
  lines: LineInput[],
  applyTva: boolean,
  tvaRate: number,
  tvaPourMemoire: boolean = false,
): {
  totalHt: number;
  totalRemise: number;
  totalTva: number;
  totalTtc: number;
} {
  let totalHt = 0;
  let totalRemise = 0;

  for (const line of lines) {
    const base = line.quantite * line.prixUnitaire;
    const remise = base * (line.remisePct / 100);
    totalHt += base - remise;
    totalRemise += remise;
  }

  const totalTva = applyTva ? totalHt * (tvaRate / 100) : 0;
  // TVA pour mémoire : la TVA est calculée pour information mais n'est pas incluse dans le NET A PAYER.
  const totalTtc = tvaPourMemoire ? totalHt : totalHt + totalTva;

  return {
    totalHt: round2(totalHt),
    totalRemise: round2(totalRemise),
    totalTva: round2(totalTva),
    totalTtc: round2(totalTtc),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
