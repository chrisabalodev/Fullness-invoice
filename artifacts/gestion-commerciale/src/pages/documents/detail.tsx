import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDocument,
  useUpdateDocumentStatus,
  useDeleteDocument,
  useConvertDocument,
  useCreateReglement,
  useDeleteReglement,
  useGetCompany,
  getGetDocumentQueryKey,
  getListDocumentsQueryKey,
  type CreateReglementBody,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  Repeat,
  Check,
  AlertCircle,
  Plus,
  Wallet,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TypeBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as UiLabel } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney, formatDate, todayIso, STATUS_OPTIONS_BY_TYPE, DOCUMENT_STATUS_LABEL } from "@/lib/format";

interface ReglementFormValues {
  date: string;
  montant: number;
  mode: string;
  reference?: string;
  notes?: string;
}

export default function DocumentDetailPage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: doc, isLoading } = useGetDocument(id);
  const { data: company } = useGetCompany();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reglementOpen, setReglementOpen] = useState(false);

  const updateStatus = useUpdateDocumentStatus({
    mutation: {
      onSuccess: () => {
        toast.success("Statut mis à jour");
        qc.invalidateQueries({ queryKey: getGetDocumentQueryKey(id) });
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
      },
    },
  });

  const remove = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        toast.success("Document supprimé");
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        navigate("/documents");
      },
    },
  });

  const convert = useConvertDocument({
    mutation: {
      onSuccess: (newDoc) => {
        toast.success(`Document converti`);
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        navigate(`/documents/${newDoc.id}`);
      },
    },
  });

  const createReglement = useCreateReglement({
    mutation: {
      onSuccess: () => {
        toast.success("Règlement enregistré");
        qc.invalidateQueries({ queryKey: getGetDocumentQueryKey(id) });
        setReglementOpen(false);
      },
      onError: () => toast.error("Erreur d'enregistrement"),
    },
  });

  const deleteReglement = useDeleteReglement({
    mutation: {
      onSuccess: () => {
        toast.success("Règlement supprimé");
        qc.invalidateQueries({ queryKey: getGetDocumentQueryKey(id) });
      },
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if (!doc) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="w-5 h-5" /> Document introuvable.
      </div>
    );
  }

  const statusOptions = STATUS_OPTIONS_BY_TYPE[doc.type] ?? [];
  const printUrl = `${import.meta.env.BASE_URL}documents/${doc.id}/print`;
  const showReglements = doc.type === "facture" || doc.type === "facture_proforma";
  const modesOptions = (company?.modesReglement ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title={doc.numero}
        description={
          <span className="flex items-center gap-2 flex-wrap mt-1">
            <TypeBadge type={doc.type} />
            <StatusBadge status={doc.status} />
            <span className="text-sm text-muted-foreground">· {formatDate(doc.date)}</span>
          </span> as unknown as string
        }
        action={
          <>
            <Button variant="outline" onClick={() => navigate("/documents")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Retour
            </Button>
            <Link href={`/documents/${doc.id}/edit`}>
              <Button variant="outline">
                <Pencil className="w-4 h-4 mr-2" /> Modifier
              </Button>
            </Link>
            {(doc.type === "devis" || doc.type === "facture_proforma") && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Repeat className="w-4 h-4 mr-2" /> Convertir
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => convert.mutate({ id: doc.id, data: { targetType: "facture" } })}
                  >
                    Convertir en facture
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => convert.mutate({ id: doc.id, data: { targetType: "bon_livraison" } })}
                  >
                    Convertir en bon de livraison
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {doc.type === "facture" && (
              <Button
                variant="outline"
                onClick={() => convert.mutate({ id: doc.id, data: { targetType: "bon_livraison" } })}
              >
                <Repeat className="w-4 h-4 mr-2" /> Bon de livraison
              </Button>
            )}
            <Button onClick={() => window.open(printUrl, "_blank")}>
              <Printer className="w-4 h-4 mr-2" /> Imprimer / PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        }
      />

      {doc.relatedDocumentNumero && (
        <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">
              Issu du document{" "}
              {doc.relatedDocumentId ? (
                <Link
                  href={`/documents/${doc.relatedDocumentId}`}
                  className="font-mono text-primary underline-offset-2 hover:underline"
                >
                  {doc.relatedDocumentNumero}
                </Link>
              ) : (
                <span className="font-mono">{doc.relatedDocumentNumero}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              Cette pièce a été générée par conversion. Le numéro source apparaît dans la zone "REF".
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lignes du document</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Référence</TableHead>
                  <TableHead>Désignation</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead>Unité</TableHead>
                  {doc.type !== "bon_livraison" && (
                    <>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-right">TVA %</TableHead>
                      <TableHead className="text-right">R %</TableHead>
                      <TableHead className="text-right">Montant HT</TableHead>
                    </>
                  )}
                  {doc.type === "bon_livraison" && <TableHead>Dépôt</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {doc.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{l.reference}</TableCell>
                    <TableCell>{l.designation}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(l.quantite)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.unite}</TableCell>
                    {doc.type !== "bon_livraison" && (
                      <>
                        <TableCell className="text-right tabular-nums">{formatMoney(l.prixUnitaire)}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.tvaRate}</TableCell>
                        <TableCell className="text-right tabular-nums">{l.remisePct}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatMoney(l.montantHt)}</TableCell>
                      </>
                    )}
                    {doc.type === "bon_livraison" && (
                      <TableCell className="text-xs">{l.depot ?? "—"}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-semibold text-base">{doc.client.name}</p>
              {doc.client.contactName && <p>{doc.client.contactName}</p>}
              {doc.client.address && <p className="text-muted-foreground">{doc.client.address}</p>}
              {doc.client.city && <p className="text-muted-foreground">{doc.client.city}</p>}
              {doc.client.phone && <p className="text-muted-foreground">{doc.client.phone}</p>}
              {doc.client.fiscalNumber && (
                <p className="text-xs text-muted-foreground pt-2">NIF {doc.client.fiscalNumber}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Statut & informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label>Statut</Label>
                <Select
                  value={doc.status}
                  onValueChange={(v) => updateStatus.mutate({ id: doc.id, data: { status: v as never } })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{DOCUMENT_STATUS_LABEL[s] ?? s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DataRow label="Date" value={formatDate(doc.date)} />
              <DataRow label="Échéance" value={formatDate(doc.echeance)} />
              <DataRow label="Vendeur" value={doc.vendeur || "—"} />
              <DataRow label="Référence" value={doc.reference || "—"} />
              <DataRow label="Mode de règlement" value={doc.modeReglement || "—"} />
              {doc.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-muted-foreground italic">{doc.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {doc.type !== "bon_livraison" && (
            <Card>
              <CardHeader>
                <CardTitle>Totaux</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <DataRow label="Total HT" value={`${formatMoney(doc.totalHt)} F`} />
                <DataRow label="Remise" value={`${formatMoney(doc.totalRemise)} F`} />
                <DataRow
                  label={
                    doc.tvaPourMemoire
                      ? "TVA (pour mémoire)"
                      : doc.applyTva
                      ? "Total TVA"
                      : "TVA"
                  }
                  value={`${formatMoney(doc.totalTva)} F`}
                />
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between font-bold text-base">
                    <span>Net à payer</span>
                    <span className="tabular-nums">{formatMoney(doc.totalTtc)} F</span>
                  </div>
                </div>
                {showReglements && (
                  <>
                    <div className="flex items-center justify-between text-sm pt-2">
                      <span className="text-muted-foreground">Total réglé</span>
                      <span className="tabular-nums text-green-700 dark:text-green-400">
                        {formatMoney(doc.totalRegle)} F
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-bold text-base">
                      <span>Reste à payer</span>
                      <span
                        className={`tabular-nums ${
                          doc.resteAPayer <= 0
                            ? "text-green-700 dark:text-green-400"
                            : "text-destructive"
                        }`}
                      >
                        {formatMoney(doc.resteAPayer)} F
                      </span>
                    </div>
                  </>
                )}
                {doc.tvaPourMemoire && (
                  <p className="text-xs text-muted-foreground italic pt-1">
                    TVA pour mémoire — non incluse dans le net à payer.
                  </p>
                )}
                {doc.status === "paye" && (
                  <p className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm pt-2">
                    <Check className="w-4 h-4" /> Facture acquittée
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showReglements && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              <CardTitle>Règlements / acomptes</CardTitle>
            </div>
            <Button size="sm" onClick={() => setReglementOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un règlement
            </Button>
          </CardHeader>
          <CardContent>
            {doc.reglements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun règlement enregistré pour ce document.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {doc.reglements.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{formatDate(r.date)}</TableCell>
                      <TableCell className="font-medium">{r.mode}</TableCell>
                      <TableCell className="text-xs">{r.reference || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(r.montant)} F
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteReglement.mutate({ id: r.id })}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ReglementDialog
        open={reglementOpen}
        onOpenChange={setReglementOpen}
        modesOptions={modesOptions}
        defaultMode={doc.modeReglement ?? ""}
        defaultMontant={doc.resteAPayer > 0 ? doc.resteAPayer : 0}
        onCreate={(v) =>
          createReglement.mutate({
            id: doc.id,
            data: {
              date: v.date,
              montant: Number(v.montant),
              mode: v.mode,
              reference: v.reference || null,
              notes: v.notes || null,
            } as CreateReglementBody,
          })
        }
        loading={createReglement.isPending}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le document {doc.numero} sera définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => remove.mutate({ id: doc.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">{children}</p>;
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function ReglementDialog({
  open,
  onOpenChange,
  modesOptions,
  defaultMode,
  defaultMontant,
  onCreate,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  modesOptions: string[];
  defaultMode: string;
  defaultMontant: number;
  onCreate: (v: ReglementFormValues) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, reset, watch, setValue, formState } =
    useForm<ReglementFormValues>({
      defaultValues: {
        date: todayIso(),
        montant: defaultMontant,
        mode: defaultMode,
        reference: "",
        notes: "",
      },
    });

  const watchedMode = watch("mode");

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) reset({ date: todayIso(), montant: defaultMontant, mode: defaultMode, reference: "", notes: "" });
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau règlement</DialogTitle>
          <DialogDescription>
            Enregistrer un acompte ou un règlement reçu pour cette facture.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <UiLabel htmlFor="r-date">Date *</UiLabel>
              <Input id="r-date" type="date" {...register("date", { required: true })} />
            </div>
            <div>
              <UiLabel htmlFor="r-montant">Montant (F CFA) *</UiLabel>
              <Input
                id="r-montant"
                type="number"
                step="any"
                {...register("montant", { required: true, valueAsNumber: true })}
              />
            </div>
            <div className="col-span-2">
              <UiLabel htmlFor="r-mode">Mode de règlement *</UiLabel>
              <div className="flex gap-2">
                <Select
                  value={modesOptions.includes(watchedMode) ? watchedMode : ""}
                  onValueChange={(v) => setValue("mode", v, { shouldValidate: true })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="— Choisir —" />
                  </SelectTrigger>
                  <SelectContent>
                    {modesOptions.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  placeholder="Ou saisir librement…"
                  {...register("mode", { required: true })}
                />
              </div>
              {formState.errors.mode && (
                <p className="text-xs text-destructive mt-1">Champ obligatoire</p>
              )}
            </div>
            <div className="col-span-2">
              <UiLabel htmlFor="r-ref">Référence (n° chèque, transaction…)</UiLabel>
              <Input id="r-ref" {...register("reference")} />
            </div>
            <div className="col-span-2">
              <UiLabel htmlFor="r-notes">Notes</UiLabel>
              <Input id="r-notes" {...register("notes")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
