import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDocument,
  useUpdateDocumentStatus,
  useDeleteDocument,
  useConvertDocument,
  getGetDocumentQueryKey,
  getListDocumentsQueryKey,
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
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TypeBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
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
import { formatMoney, formatDate, STATUS_OPTIONS_BY_TYPE, DOCUMENT_STATUS_LABEL } from "@/lib/format";

export default function DocumentDetailPage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: doc, isLoading } = useGetDocument(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        toast.success(`Converti en ${newDoc.type === "facture" ? "facture" : "bon de livraison"}`);
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        navigate(`/documents/${newDoc.id}`);
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
            {doc.type === "devis" && (
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
                      <TableHead className="text-right">Prix U.</TableHead>
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
                  label={doc.applyTva ? "TVA 18%" : "TVA"}
                  value={`${formatMoney(doc.totalTva)} F`}
                />
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between font-bold text-base">
                    <span>Total TTC</span>
                    <span className="tabular-nums">{formatMoney(doc.totalTtc)} F</span>
                  </div>
                </div>
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
