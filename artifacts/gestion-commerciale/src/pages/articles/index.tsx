import { useState } from "react";
import {
  useListArticles,
  useCreateArticle,
  useUpdateArticle,
  useDeleteArticle,
  getListArticlesQueryKey,
  type Article,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatMoney } from "@/lib/format";

interface ArticleFormValues {
  reference: string;
  designation: string;
  unite: string;
  prixUnitaire: number;
  depot?: string | null;
  stock: number;
}

function ArticleForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<Article>;
  onSubmit: (v: ArticleFormValues) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { register, handleSubmit, formState } = useForm<ArticleFormValues>({
    defaultValues: {
      reference: initial?.reference ?? "",
      designation: initial?.designation ?? "",
      unite: initial?.unite ?? "PIECE",
      prixUnitaire: initial?.prixUnitaire ?? 0,
      depot: initial?.depot ?? "",
      stock: initial?.stock ?? 0,
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) =>
        onSubmit({
          ...v,
          prixUnitaire: Number(v.prixUnitaire),
          stock: Number(v.stock),
          depot: v.depot || null,
        }),
      )}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="reference">Référence *</Label>
          <Input id="reference" {...register("reference", { required: true })} />
          {formState.errors.reference && <p className="text-xs text-destructive mt-1">Champ obligatoire</p>}
        </div>
        <div>
          <Label htmlFor="unite">Unité *</Label>
          <Input id="unite" {...register("unite", { required: true })} placeholder="PIECE, PAIRE, KG…" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="designation">Désignation *</Label>
          <Input id="designation" {...register("designation", { required: true })} />
        </div>
        <div>
          <Label htmlFor="prixUnitaire">Prix unitaire (F CFA) *</Label>
          <Input id="prixUnitaire" type="number" step="any" {...register("prixUnitaire", { required: true, valueAsNumber: true })} />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input id="stock" type="number" step="any" {...register("stock", { valueAsNumber: true })} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="depot">Dépôt</Label>
          <Input id="depot" {...register("depot")} placeholder="M1 ET, M2…" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer"}</Button>
      </DialogFooter>
    </form>
  );
}

export default function ArticlesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [deleting, setDeleting] = useState<Article | null>(null);

  const { data: articles = [], isLoading } = useListArticles(
    search ? { search } : undefined,
  );

  const create = useCreateArticle({
    mutation: {
      onSuccess: () => {
        toast.success("Article créé");
        qc.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        setOpen(false);
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast.error(msg || "Erreur lors de la création");
      },
    },
  });

  const update = useUpdateArticle({
    mutation: {
      onSuccess: () => {
        toast.success("Article mis à jour");
        qc.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        setEditing(null);
      },
    },
  });

  const remove = useDeleteArticle({
    mutation: {
      onSuccess: () => {
        toast.success("Article supprimé");
        qc.invalidateQueries({ queryKey: getListArticlesQueryKey() });
        setDeleting(null);
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Articles"
        description="Catalogue produits et tarifs."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouvel article
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par référence ou désignation…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{articles.length} article(s)</span>
      </div>

      {!isLoading && articles.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun article"
          description="Créez votre premier article pour le catalogue."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un article
            </Button>
          }
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Référence</TableHead>
                <TableHead>Désignation</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead>Dépôt</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((a) => (
                <TableRow key={a.id} className="hover:bg-accent/40">
                  <TableCell className="font-mono text-xs font-semibold">{a.reference}</TableCell>
                  <TableCell>{a.designation}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{a.unite}</TableCell>
                  <TableCell className="text-xs">{a.depot || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatMoney(a.prixUnitaire)} F</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(a.stock)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(a)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(a)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open || !!editing} onOpenChange={(o) => { if (!o) { setOpen(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier l'article" : "Nouvel article"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations de l'article." : "Ajoutez un article au catalogue."}
            </DialogDescription>
          </DialogHeader>
          <ArticleForm
            initial={editing ?? undefined}
            loading={create.isPending || update.isPending}
            onCancel={() => { setOpen(false); setEditing(null); }}
            onSubmit={(v) => {
              if (editing) {
                update.mutate({ id: editing.id, data: v });
              } else {
                create.mutate({ data: v });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet article ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'article « {deleting?.designation} » sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && remove.mutate({ id: deleting.id })}
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
