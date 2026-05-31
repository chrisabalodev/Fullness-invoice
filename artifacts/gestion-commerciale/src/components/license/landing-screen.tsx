import { useGetCompany } from "@workspace/api-client-react";
import { Store, ShieldCheck, ChevronRight } from "lucide-react";
import type { LicenseStatus } from "@/lib/license-api";

interface Props {
  status: LicenseStatus;
  onSelect: (mode: "gestion" | "admin") => void;
}

export function LandingScreen({ status, onSelect }: Props) {
  const { data: company } = useGetCompany();
  const name = company?.name?.trim() || "Gestion Commerciale";
  const comptoir = company?.comptoirName?.trim();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary">{name}</h1>
        {comptoir ? <p className="text-muted-foreground mt-1">{comptoir}</p> : null}
        <p className="text-sm text-muted-foreground mt-4">Choisissez un mode d'accès</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-3xl">
        <button
          type="button"
          onClick={() => onSelect("gestion")}
          className="group text-left rounded-xl border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold flex items-center gap-1">
            Gestion commerciale / Comptoir
            <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accéder aux factures, devis, clients, articles et au tableau de bord.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onSelect("admin")}
          className="group text-left rounded-xl border bg-card p-6 shadow-sm transition hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold flex items-center gap-1">
            Administration
            <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Espace protégé par mot de passe : gestion des clés de licence.
          </p>
        </button>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        {status.isTrial ? (
          <span>
            Période d'essai — <strong>{status.daysRemaining}</strong> jour(s) restant(s)
          </span>
        ) : (
          <span>
            Licence active — <strong>{status.daysRemaining}</strong> jour(s) restant(s)
          </span>
        )}
      </div>
    </div>
  );
}
