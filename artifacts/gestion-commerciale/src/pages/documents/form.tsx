import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateDocument,
  useUpdateDocument,
  useGetDocument,
  useGetCompany,
  getListDocumentsQueryKey,
  getGetDocumentQueryKey,
  type Article,
  type CreateDocumentBody,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientCombobox } from "@/components/client-combobox";
import { ArticleCombobox } from "@/components/article-combobox";
import { formatMoney, todayIso } from "@/lib/format";

interface LineFormValues {
  articleId?: number | null;
  reference: string;
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  remisePct: number;
  depot?: string | null;
}

interface DocumentFormValues {
  type: "facture" | "devis" | "bon_livraison";
  status: "brouillon" | "valide" | "paye" | "livre" | "annule";
  date: string;
  echeance?: string | null;
  clientId?: number;
  vendeur?: string | null;
  reference?: string | null;
  notes?: string | null;
  applyTva: boolean;
  lines: LineFormValues[];
}

function emptyLine(): LineFormValues {
  return {
    reference: "",
    designation: "",
    quantite: 1,
    unite: "PIECE",
    prixUnitaire: 0,
    remisePct: 0,
    articleId: null,
    depot: null,
  };
}

export default function DocumentFormPage({ id }: { id?: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: company } = useGetCompany();
  const tvaRate = company?.tvaRate ?? 18;

  const editing = id != null;
  const { data: existing } = useGetDocument(id ?? 0, {
    query: { enabled: editing },
  });

  const { register, handleSubmit, control, watch, reset, setValue, formState } = useForm<DocumentFormValues>({
    defaultValues: {
      type: "facture",
      status: "brouillon",
      date: todayIso(),
      echeance: null,
      vendeur: "",
      reference: "",
      notes: "",
      applyTva: true,
      lines: [emptyLine()],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  useEffect(() => {
    if (editing && existing) {
      reset({
        type: existing.type,
        status: existing.status,
        date: existing.date,
        echeance: existing.echeance ?? null,
        clientId: existing.clientId,
        vendeur: existing.vendeur ?? "",
        reference: existing.reference ?? "",
        notes: existing.notes ?? "",
        applyTva: existing.applyTva,
        lines: existing.lines.length > 0
          ? existing.lines.map((l) => ({
              articleId: l.articleId ?? null,
              reference: l.reference,
              designation: l.designation,
              quantite: l.quantite,
              unite: l.unite,
              prixUnitaire: l.prixUnitaire,
              remisePct: l.remisePct,
              depot: l.depot ?? null,
            }))
          : [emptyLine()],
      });
    }
  }, [editing, existing, reset]);

  const watchedLines = watch("lines");
  const watchedApplyTva = watch("applyTva");
  const watchedType = watch("type");

  const totals = useMemo(() => {
    let totalHt = 0;
    let totalRemise = 0;
    for (const l of watchedLines) {
      const q = Number(l.quantite) || 0;
      const p = Number(l.prixUnitaire) || 0;
      const r = Number(l.remisePct) || 0;
      const base = q * p;
      const remise = base * (r / 100);
      totalHt += base - remise;
      totalRemise += remise;
    }
    const totalTva = watchedApplyTva ? totalHt * (tvaRate / 100) : 0;
    const totalTtc = totalHt + totalTva;
    return { totalHt, totalRemise, totalTva, totalTtc };
  }, [watchedLines, watchedApplyTva, tvaRate]);

  const create = useCreateDocument({
    mutation: {
      onSuccess: (doc) => {
        toast.success("Document créé");
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        navigate(`/documents/${doc.id}`);
      },
      onError: () => toast.error("Erreur lors de la création"),
    },
  });

  const update = useUpdateDocument({
    mutation: {
      onSuccess: (doc) => {
        toast.success("Document mis à jour");
        qc.invalidateQueries({ queryKey: getListDocumentsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetDocumentQueryKey(doc.id) });
        navigate(`/documents/${doc.id}`);
      },
    },
  });

  const onSubmit = (v: DocumentFormValues) => {
    if (!v.clientId) {
      toast.error("Veuillez choisir un client");
      return;
    }
    if (v.lines.length === 0 || v.lines.every((l) => !l.designation)) {
      toast.error("Ajoutez au moins une ligne avec une désignation");
      return;
    }
    const body: CreateDocumentBody = {
      type: v.type,
      status: v.status,
      date: v.date,
      echeance: v.echeance || null,
      clientId: v.clientId,
      vendeur: v.vendeur || null,
      reference: v.reference || null,
      notes: v.notes || null,
      applyTva: v.applyTva,
      lines: v.lines
        .filter((l) => l.designation)
        .map((l) => ({
          articleId: l.articleId ?? null,
          reference: l.reference,
          designation: l.designation,
          quantite: Number(l.quantite),
          unite: l.unite,
          prixUnitaire: Number(l.prixUnitaire),
          remisePct: Number(l.remisePct),
          depot: l.depot ?? null,
        })),
    };
    if (editing && id) {
      update.mutate({ id, data: body });
    } else {
      create.mutate({ data: body });
    }
  };

  const handlePickArticle = (idx: number, a: Article) => {
    setValue(`lines.${idx}.articleId`, a.id);
    setValue(`lines.${idx}.reference`, a.reference);
    setValue(`lines.${idx}.designation`, a.designation);
    setValue(`lines.${idx}.unite`, a.unite);
    setValue(`lines.${idx}.prixUnitaire`, a.prixUnitaire);
    if (a.depot) setValue(`lines.${idx}.depot`, a.depot);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        title={editing ? `Modifier le document` : "Nouveau document"}
        description={editing ? existing?.numero : "Création d'une facture, d'un devis ou d'un bon de livraison."}
        action={
          <>
            <Button type="button" variant="outline" onClick={() => navigate(editing && id ? `/documents/${id}` : "/documents")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {create.isPending || update.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Entête</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type de document *</Label>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={editing}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="devis">Devis</SelectItem>
                      <SelectItem value="bon_livraison">Bon de livraison</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brouillon">Brouillon</SelectItem>
                      <SelectItem value="valide">Validé</SelectItem>
                      {watchedType === "facture" && <SelectItem value="paye">Payé</SelectItem>}
                      {watchedType === "bon_livraison" && <SelectItem value="livre">Livré</SelectItem>}
                      <SelectItem value="annule">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2">
              <Label>Client *</Label>
              <Controller
                control={control}
                name="clientId"
                rules={{ required: true }}
                render={({ field }) => (
                  <ClientCombobox value={field.value} onChange={field.onChange} />
                )}
              />
              {formState.errors.clientId && (
                <p className="text-xs text-destructive mt-1">Client obligatoire</p>
              )}
            </div>
            <div>
              <Label htmlFor="date">Date *</Label>
              <Input id="date" type="date" {...register("date", { required: true })} />
            </div>
            <div>
              <Label htmlFor="echeance">Échéance</Label>
              <Input id="echeance" type="date" {...register("echeance")} />
            </div>
            <div>
              <Label htmlFor="vendeur">Vendeur</Label>
              <Input id="vendeur" {...register("vendeur")} placeholder="Nom du vendeur" />
            </div>
            <div>
              <Label htmlFor="reference">Référence interne</Label>
              <Input id="reference" {...register("reference")} placeholder="Bon de commande…" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50">
              <div>
                <Label htmlFor="applyTva" className="cursor-pointer">Appliquer TVA {tvaRate}%</Label>
              </div>
              <Controller
                control={control}
                name="applyTva"
                render={({ field }) => (
                  <Switch id="applyTva" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Total HT" value={`${formatMoney(totals.totalHt)} F`} />
              <Row label="Remise" value={`${formatMoney(totals.totalRemise)} F`} />
              <Row label={`TVA ${tvaRate}%`} value={`${formatMoney(totals.totalTva)} F`} />
              <div className="border-t border-border pt-2 mt-2">
                <Row
                  label="Total TTC"
                  value={`${formatMoney(totals.totalTtc)} F`}
                  bold
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptyLine())}>
            <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Article</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead className="w-[80px]">Qté</TableHead>
                <TableHead className="w-[80px]">Unité</TableHead>
                <TableHead className="w-[110px]">Prix U.</TableHead>
                <TableHead className="w-[80px]">R %</TableHead>
                <TableHead className="w-[120px] text-right">Montant HT</TableHead>
                <TableHead className="w-[40px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((f, idx) => {
                const l = watchedLines[idx];
                const montant =
                  ((Number(l?.quantite) || 0) * (Number(l?.prixUnitaire) || 0)) *
                  (1 - (Number(l?.remisePct) || 0) / 100);
                return (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`lines.${idx}.reference`}
                        render={({ field }) => (
                          <ArticleCombobox
                            value={field.value}
                            onSelect={(a) => handlePickArticle(idx, a)}
                          />
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Input {...register(`lines.${idx}.designation`)} className="h-9" />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.quantite`, { valueAsNumber: true })}
                        className="h-9 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <Input {...register(`lines.${idx}.unite`)} className="h-9" />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.prixUnitaire`, { valueAsNumber: true })}
                        className="h-9 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.remisePct`, { valueAsNumber: true })}
                        className="h-9 text-right tabular-nums"
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(montant)} F
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(idx)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
