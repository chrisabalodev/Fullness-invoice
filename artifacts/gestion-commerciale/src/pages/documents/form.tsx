import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateDocument,
  useUpdateDocument,
  useGetDocument,
  useGetCompany,
  useCreateClient,
  getListDocumentsQueryKey,
  getGetDocumentQueryKey,
  getListClientsQueryKey,
  type Article,
  type CreateDocumentBody,
  type CreateClientBody,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Save, UserPlus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientCombobox } from "@/components/client-combobox";
import { ArticleCombobox } from "@/components/article-combobox";
import { formatMoney, todayIso, STATUS_OPTIONS_BY_TYPE, DOCUMENT_STATUS_LABEL } from "@/lib/format";

type DocumentType = "facture" | "devis" | "bon_livraison" | "facture_proforma" | "avoir";
type DocumentStatus = "brouillon" | "valide" | "paye" | "livre" | "annule";

interface LineFormValues {
  articleId?: number | null;
  reference: string;
  designation: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  remisePct: number;
  tvaRate: number;
  depot?: string | null;
}

interface DocumentFormValues {
  type: DocumentType;
  status: DocumentStatus;
  date: string;
  echeance?: string | null;
  clientId?: number;
  vendeur?: string | null;
  reference?: string | null;
  notes?: string | null;
  modeReglement?: string | null;
  conditionsPaiement?: string | null;
  applyTva: boolean;
  tvaPourMemoire: boolean;
  lines: LineFormValues[];
}

interface QuickClientValues {
  name: string;
  contactName?: string;
  phone?: string;
  city?: string;
  address?: string;
  fiscalNumber?: string;
}

function emptyLine(defaultTva = 18): LineFormValues {
  return {
    reference: "",
    designation: "",
    quantite: 1,
    unite: "PIECE",
    prixUnitaire: 0,
    remisePct: 0,
    tvaRate: defaultTva,
    articleId: null,
    depot: null,
  };
}

export default function DocumentFormPage({ id }: { id?: number }) {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: company } = useGetCompany();
  const tvaRate = company?.tvaRate ?? 18;
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [designEdit, setDesignEdit] = useState<{ idx: number; value: string } | null>(null);

  const editing = id != null;
  const { data: existing } = useGetDocument(id ?? 0);

  const modesReglementOptions = useMemo(() => {
    return (company?.modesReglement ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [company?.modesReglement]);

  const conditionsPaiementOptions = useMemo(() => {
    return (company?.conditionsPaiement ?? "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [company?.conditionsPaiement]);

  const { register, handleSubmit, control, watch, reset, setValue, formState } =
    useForm<DocumentFormValues>({
      defaultValues: {
        type: "facture",
        status: "brouillon",
        date: todayIso(),
        echeance: null,
        vendeur: "",
        reference: "",
        notes: "",
        modeReglement: "",
        conditionsPaiement: "",
        applyTva: true,
        tvaPourMemoire: false,
        lines: [emptyLine(tvaRate)],
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
        modeReglement: existing.modeReglement ?? "",
        conditionsPaiement: existing.conditionsPaiement ?? "",
        applyTva: existing.applyTva,
        tvaPourMemoire: existing.tvaPourMemoire ?? false,
        lines:
          existing.lines.length > 0
            ? existing.lines.map((l) => ({
                articleId: l.articleId ?? null,
                reference: l.reference,
                designation: l.designation,
                quantite: l.quantite,
                unite: l.unite,
                prixUnitaire: l.prixUnitaire,
                remisePct: l.remisePct,
                tvaRate: l.tvaRate ?? tvaRate,
                depot: l.depot ?? null,
              }))
            : [emptyLine(tvaRate)],
      });
    }
  }, [editing, existing, reset, tvaRate]);

  const watchedLines = watch("lines");
  const watchedApplyTva = watch("applyTva");
  const watchedMemoire = watch("tvaPourMemoire");
  const watchedType = watch("type");

  const totals = useMemo(() => {
    let totalHt = 0;
    let totalRemise = 0;
    let totalTva = 0;
    for (const l of watchedLines) {
      const q = Number(l.quantite) || 0;
      const p = Number(l.prixUnitaire) || 0;
      const r = Number(l.remisePct) || 0;
      const t = Number(l.tvaRate) || 0;
      const base = q * p;
      const remise = base * (r / 100);
      const ht = base - remise;
      totalHt += ht;
      totalRemise += remise;
      if (watchedApplyTva) totalTva += ht * (t / 100);
    }
    const totalTtc = watchedMemoire ? totalHt : totalHt + totalTva;
    return { totalHt, totalRemise, totalTva, totalTtc };
  }, [watchedLines, watchedApplyTva, watchedMemoire]);

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

  const createClient = useCreateClient({
    mutation: {
      onSuccess: (c) => {
        toast.success("Client créé");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setValue("clientId", c.id, { shouldValidate: true });
        setClientDialogOpen(false);
      },
      onError: () => toast.error("Erreur lors de la création du client"),
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
      modeReglement: v.modeReglement || null,
      conditionsPaiement: v.conditionsPaiement || null,
      applyTva: v.applyTva,
      tvaPourMemoire: v.tvaPourMemoire,
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
          tvaRate: Number(l.tvaRate) || 0,
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

  const statusOptions = STATUS_OPTIONS_BY_TYPE[watchedType] ?? [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader
        title={editing ? `Modifier le document` : "Nouveau document"}
        description={
          editing
            ? existing?.numero
            : "Création d'une facture, d'une proforma, d'un devis, d'un bon de livraison ou d'un avoir."
        }
        action={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(editing && id ? `/documents/${id}` : "/documents")
              }
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Annuler
            </Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {create.isPending || update.isPending
                ? "Enregistrement…"
                : "Enregistrer"}
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
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const allowed = STATUS_OPTIONS_BY_TYPE[v] ?? [];
                      const current = watch("status");
                      if (!allowed.includes(current)) {
                        setValue("status", (allowed[0] ?? "brouillon") as DocumentStatus);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="facture_proforma">Facture proforma</SelectItem>
                      <SelectItem value="devis">Devis</SelectItem>
                      <SelectItem value="bon_livraison">Bon de livraison</SelectItem>
                      <SelectItem value="avoir">Avoir</SelectItem>
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
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {DOCUMENT_STATUS_LABEL[s] ?? s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="col-span-2">
              <Label>Client *</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Controller
                    control={control}
                    name="clientId"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <ClientCombobox value={field.value} onChange={field.onChange} />
                    )}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setClientDialogOpen(true)}
                >
                  <UserPlus className="w-4 h-4 mr-2" /> Nouveau
                </Button>
              </div>
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
              <Label htmlFor="reference">Référence</Label>
              <Input
                id="reference"
                {...register("reference")}
                placeholder="Bon de commande, référence externe…"
              />
            </div>
            <div>
              <Label htmlFor="modeReglement">Mode de règlement</Label>
              <Controller
                control={control}
                name="modeReglement"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "__clear__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— Choisir un mode —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">— Aucun —</SelectItem>
                      {modesReglementOptions.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {modesReglementOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Configurez les modes dans Paramètres pour les retrouver ici.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="conditionsPaiement">Conditions de paiement</Label>
              <Controller
                control={control}
                name="conditionsPaiement"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(v) => field.onChange(v === "__clear__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="— Choisir des conditions —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__clear__">— Aucune —</SelectItem>
                      {conditionsPaiementOptions.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {conditionsPaiementOptions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Configurez les conditions dans Paramètres pour les retrouver ici.
                </p>
              )}
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
                <Label htmlFor="tvaPourMemoire" className="cursor-pointer">
                  TVA pour mémoire
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  TVA affichée mais non incluse dans le net à payer.
                </p>
              </div>
              <Controller
                control={control}
                name="tvaPourMemoire"
                render={({ field }) => (
                  <Switch
                    id="tvaPourMemoire"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="space-y-2 text-sm">
              <Row label="Total HT" value={`${formatMoney(totals.totalHt)} F`} />
              <Row label="Remise" value={`${formatMoney(totals.totalRemise)} F`} />
              <Row
                label={watchedMemoire ? `TVA ${tvaRate}% (pour mémoire)` : `TVA ${tvaRate}%`}
                value={`${formatMoney(totals.totalTva)} F`}
              />
              <div className="border-t border-border pt-2 mt-2">
                <Row
                  label="Net à payer"
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(emptyLine(tvaRate))}
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {/* ── Vue tableau : md+ ─────────────────────────────── */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Article</TableHead>
                  <TableHead className="w-[130px]">Référence</TableHead>
                  <TableHead className="w-[160px]">Désignation</TableHead>
                  <TableHead className="w-[70px]">Qté</TableHead>
                  <TableHead className="w-[80px]">Unité</TableHead>
                  <TableHead className="w-[110px]">Prix HT</TableHead>
                  <TableHead className="w-[80px]">TVA %</TableHead>
                  <TableHead className="w-[110px]">Prix TTC</TableHead>
                  <TableHead className="w-[70px]">R %</TableHead>
                  <TableHead className="w-[120px] text-right">Montant HT</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f, idx) => {
                  const l = watchedLines[idx];
                  const qty = Number(l?.quantite) || 0;
                  const pu = Number(l?.prixUnitaire) || 0;
                  const rem = Number(l?.remisePct) || 0;
                  const tva = Number(l?.tvaRate) || 0;
                  const montant = qty * pu * (1 - rem / 100);
                  const prixTtc =
                    watchedMemoire || !watchedApplyTva ? pu : pu * (1 + tva / 100);
                  return (
                    <TableRow key={f.id}>
                      <TableCell>
                        <ArticleCombobox
                          value={l?.reference ?? ""}
                          onSelect={(a) => handlePickArticle(idx, a)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          {...register(`lines.${idx}.reference`)}
                          className="h-9"
                          placeholder="Réf."
                        />
                      </TableCell>
                      <TableCell className="max-w-[160px] w-[160px] overflow-hidden">
                        <Controller
                          control={control}
                          name={`lines.${idx}.designation`}
                          render={({ field }) => (
                            <button
                              type="button"
                              onClick={() => setDesignEdit({ idx, value: field.value ?? "" })}
                              className="w-full h-9 px-3 text-left text-sm border border-input rounded-md bg-background hover:bg-muted/50 truncate"
                              title={field.value || "Cliquer pour saisir la désignation"}
                            >
                              {field.value ? (
                                <span className="truncate">{field.value}</span>
                              ) : (
                                <span className="text-muted-foreground">Désignation…</span>
                              )}
                            </button>
                          )}
                        />
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
                          {...register(`lines.${idx}.tvaRate`, { valueAsNumber: true })}
                          className="h-9 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          value={Number.isFinite(prixTtc) ? Math.round(prixTtc * 100) / 100 : 0}
                          onChange={(e) => {
                            const newTtc = Number(e.target.value) || 0;
                            const t = Number(l?.tvaRate) || 0;
                            const newHt =
                              watchedMemoire || !watchedApplyTva
                                ? newTtc
                                : newTtc / (1 + t / 100);
                            setValue(
                              `lines.${idx}.prixUnitaire`,
                              Math.round(newHt * 100) / 100,
                              { shouldDirty: true },
                            );
                          }}
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
          </div>

          {/* ── Vue cartes : < md ─────────────────────────────── */}
          <div className="flex flex-col gap-3 md:hidden px-4 pb-4">
            {fields.map((f, idx) => {
              const l = watchedLines[idx];
              const qty = Number(l?.quantite) || 0;
              const pu = Number(l?.prixUnitaire) || 0;
              const rem = Number(l?.remisePct) || 0;
              const tva = Number(l?.tvaRate) || 0;
              const montant = qty * pu * (1 - rem / 100);
              const prixTtc =
                watchedMemoire || !watchedApplyTva ? pu : pu * (1 + tva / 100);
              return (
                <div key={f.id} className="border border-border rounded-lg p-4 space-y-3 bg-background">
                  {/* En-tête carte : numéro + bouton supprimer */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Ligne {idx + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(idx)}
                      disabled={fields.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Article + Désignation */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Article (recherche)</Label>
                    <ArticleCombobox
                      value={l?.reference ?? ""}
                      onSelect={(a) => handlePickArticle(idx, a)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Désignation</Label>
                    <Controller
                      control={control}
                      name={`lines.${idx}.designation`}
                      render={({ field }) => (
                        <button
                          type="button"
                          onClick={() => setDesignEdit({ idx, value: field.value ?? "" })}
                          className="w-full h-10 px-3 text-left text-sm border border-input rounded-md bg-background hover:bg-muted/50"
                        >
                          {field.value ? (
                            <span>{field.value}</span>
                          ) : (
                            <span className="text-muted-foreground">Cliquer pour saisir…</span>
                          )}
                        </button>
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Référence</Label>
                    <Input
                      {...register(`lines.${idx}.reference`)}
                      className="h-10"
                      placeholder="Réf."
                    />
                  </div>

                  {/* Qté + Unité */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantité</Label>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.quantite`, { valueAsNumber: true })}
                        className="h-10 text-right tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unité</Label>
                      <Input {...register(`lines.${idx}.unite`)} className="h-10" />
                    </div>
                  </div>

                  {/* Prix HT + TVA % */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Prix HT</Label>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.prixUnitaire`, { valueAsNumber: true })}
                        className="h-10 text-right tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">TVA %</Label>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.tvaRate`, { valueAsNumber: true })}
                        className="h-10 text-right tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Prix TTC + R % */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Prix TTC</Label>
                      <Input
                        type="number"
                        step="any"
                        value={Number.isFinite(prixTtc) ? Math.round(prixTtc * 100) / 100 : 0}
                        onChange={(e) => {
                          const newTtc = Number(e.target.value) || 0;
                          const t = Number(l?.tvaRate) || 0;
                          const newHt =
                            watchedMemoire || !watchedApplyTva
                              ? newTtc
                              : newTtc / (1 + t / 100);
                          setValue(
                            `lines.${idx}.prixUnitaire`,
                            Math.round(newHt * 100) / 100,
                            { shouldDirty: true },
                          );
                        }}
                        className="h-10 text-right tabular-nums"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Remise %</Label>
                      <Input
                        type="number"
                        step="any"
                        {...register(`lines.${idx}.remisePct`, { valueAsNumber: true })}
                        className="h-10 text-right tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Montant calculé */}
                  <div className="flex justify-end pt-1 border-t border-border">
                    <span className="text-xs text-muted-foreground mr-2">Montant HT :</span>
                    <span className="font-semibold tabular-nums">{formatMoney(montant)} F</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <QuickClientDialog
        open={clientDialogOpen}
        onOpenChange={setClientDialogOpen}
        onCreate={(v) =>
          createClient.mutate({
            data: {
              name: v.name,
              contactName: v.contactName || null,
              phone: v.phone || null,
              city: v.city || null,
              address: v.address || null,
              fiscalNumber: v.fiscalNumber || null,
            } as CreateClientBody,
          })
        }
        loading={createClient.isPending}
      />

      <Dialog
        open={designEdit !== null}
        onOpenChange={(o) => { if (!o) setDesignEdit(null); }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Désignation</DialogTitle>
            <DialogDescription>
              Saisissez la désignation de l'article. Vous pouvez écrire sur plusieurs lignes.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={6}
            className="resize-y"
            autoFocus
            value={designEdit?.value ?? ""}
            onChange={(e) =>
              setDesignEdit((prev) => prev ? { ...prev, value: e.target.value } : prev)
            }
            placeholder="Description de l'article ou de la prestation…"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDesignEdit(null)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (designEdit !== null) {
                  setValue(`lines.${designEdit.idx}.designation`, designEdit.value, {
                    shouldDirty: true,
                  });
                  setDesignEdit(null);
                }
              }}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${bold ? "text-base font-bold" : ""}`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function QuickClientDialog({
  open,
  onOpenChange,
  onCreate,
  loading,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreate: (v: QuickClientValues) => void;
  loading: boolean;
}) {
  const { register, handleSubmit, reset, formState } = useForm<QuickClientValues>({
    defaultValues: {
      name: "",
      contactName: "",
      phone: "",
      city: "",
      address: "",
      fiscalNumber: "",
    },
  });

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau client</DialogTitle>
          <DialogDescription>
            Créer un client rapidement sans quitter le document.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="qc-name">Raison sociale *</Label>
              <Input
                id="qc-name"
                {...register("name", { required: true })}
                placeholder="Ex. FULLNESS SARL"
              />
              {formState.errors.name && (
                <p className="text-xs text-destructive mt-1">Champ obligatoire</p>
              )}
            </div>
            <div>
              <Label htmlFor="qc-contact">Contact</Label>
              <Input id="qc-contact" {...register("contactName")} />
            </div>
            <div>
              <Label htmlFor="qc-phone">Téléphone</Label>
              <Input id="qc-phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="qc-city">Ville</Label>
              <Input id="qc-city" {...register("city")} placeholder="Lomé" />
            </div>
            <div>
              <Label htmlFor="qc-fiscal">Numéro fiscal (NIF)</Label>
              <Input id="qc-fiscal" {...register("fiscalNumber")} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="qc-address">Adresse</Label>
              <Input id="qc-address" {...register("address")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Enregistrement…" : "Créer le client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
