import { Badge } from "./ui/badge";
import { DOCUMENT_STATUS_LABEL } from "@/lib/format";

const STYLES: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground border-border",
  valide: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900",
  paye: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900",
  livre: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900",
  annule: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? STYLES.brouillon;
  return (
    <Badge variant="outline" className={`${cls} border font-medium`}>
      {DOCUMENT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const TYPE_STYLES: Record<string, string> = {
  facture: "bg-primary/10 text-primary border-primary/30",
  devis: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  bon_livraison: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-900",
  facture_proforma: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:border-sky-900",
  avoir: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900",
};

export function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    facture: "Facture",
    devis: "Devis",
    bon_livraison: "Bon de livraison",
    facture_proforma: "Proforma",
    avoir: "Avoir",
  };
  return (
    <Badge variant="outline" className={`${TYPE_STYLES[type] ?? ""} border font-medium`}>
      {labels[type] ?? type}
    </Badge>
  );
}
