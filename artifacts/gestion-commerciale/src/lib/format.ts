export function formatMoney(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export function formatMoneyDecimal(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "0,00";
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  facture: "Facture",
  devis: "Devis",
  bon_livraison: "Bon de livraison",
};

export const DOCUMENT_TYPE_TITLE_PRINT: Record<string, string> = {
  facture: "FACTURE",
  devis: "DEVIS",
  bon_livraison: "BON A LIVRER",
};

export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  paye: "Payé",
  livre: "Livré",
  annule: "Annulé",
};

export const STATUS_OPTIONS_BY_TYPE: Record<string, string[]> = {
  facture: ["brouillon", "valide", "paye", "annule"],
  devis: ["brouillon", "valide", "annule"],
  bon_livraison: ["brouillon", "valide", "livre", "annule"],
};
