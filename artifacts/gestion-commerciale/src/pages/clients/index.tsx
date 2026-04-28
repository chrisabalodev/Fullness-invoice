import { useState } from "react";
import { Link } from "wouter";
import {
  useListClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
  getListClientsQueryKey,
  type Client,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Search, Pencil, Trash2, Users, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface ClientFormValues {
  name: string;
  contactName?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  fiscalNumber?: string | null;
  notes?: string | null;
}

function ClientForm({
  initial,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<Client>;
  onSubmit: (v: ClientFormValues) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const { register, handleSubmit, formState } = useForm<ClientFormValues>({
    defaultValues: {
      name: initial?.name ?? "",
      contactName: initial?.contactName ?? "",
      address: initial?.address ?? "",
      city: initial?.city ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      fiscalNumber: initial?.fiscalNumber ?? "",
      notes: initial?.notes ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((v) =>
        onSubmit({
          ...v,
          contactName: v.contactName || null,
          address: v.address || null,
          city: v.city || null,
          phone: v.phone || null,
          email: v.email || null,
          fiscalNumber: v.fiscalNumber || null,
          notes: v.notes || null,
        }),
      )}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Raison sociale *</Label>
          <Input id="name" {...register("name", { required: true })} placeholder="Ex. FULLNESS SARL" />
          {formState.errors.name && (
            <p className="text-xs text-destructive mt-1">Champ obligatoire</p>
          )}
        </div>
        <div>
          <Label htmlFor="contactName">Contact</Label>
          <Input id="contactName" {...register("contactName")} />
        </div>
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input id="phone" {...register("phone")} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" {...register("email")} />
        </div>
        <div>
          <Label htmlFor="city">Ville</Label>
          <Input id="city" {...register("city")} placeholder="Lomé" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="address">Adresse</Label>
          <Input id="address" {...register("address")} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="fiscalNumber">Numéro fiscal (NIF)</Label>
          <Input id="fiscalNumber" {...register("fiscalNumber")} />
        </div>
        <div className="col-span-2">
          <Label htmlFor="notes">Notes internes</Label>
          <Textarea id="notes" {...register("notes")} rows={2} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const { data: clients = [], isLoading } = useListClients(
    search ? { search } : undefined,
  );

  const create = useCreateClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client créé");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setOpen(false);
      },
      onError: () => toast.error("Erreur lors de la création"),
    },
  });

  const update = useUpdateClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client mis à jour");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setEditing(null);
      },
      onError: () => toast.error("Erreur lors de la mise à jour"),
    },
  });

  const remove = useDeleteClient({
    mutation: {
      onSuccess: () => {
        toast.success("Client supprimé");
        qc.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setDeleting(null);
      },
      onError: () => toast.error("Suppression impossible (documents associés)"),
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clients"
        description="Gérer la base clients."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Nouveau client
          </Button>
        }
      />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, ville, téléphone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">{clients.length} client(s)</span>
      </div>

      {!isLoading && clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun client"
          description="Créez votre premier client pour commencer à émettre des documents."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter un client
            </Button>
          }
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raison sociale</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Coordonnées</TableHead>
                <TableHead>Ville</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="hover:bg-accent/40">
                  <TableCell className="font-medium">
                    <Link href={`/clients/${c.id}`}>
                      <span className="hover:text-primary cursor-pointer">{c.name}</span>
                    </Link>
                    {c.fiscalNumber && (
                      <p className="text-xs text-muted-foreground">NIF {c.fiscalNumber}</p>
                    )}
                  </TableCell>
                  <TableCell>{c.contactName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs">
                      {c.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      )}
                      {c.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {c.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {c.city ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" /> {c.city}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setEditing(c)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleting(c)}
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
            <DialogTitle>{editing ? "Modifier le client" : "Nouveau client"}</DialogTitle>
            <DialogDescription>
              {editing ? "Modifiez les informations du client." : "Renseignez les informations du nouveau client."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm
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
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client « {deleting?.name} » sera définitivement supprimé.
              Les clients ayant des documents associés ne peuvent pas être supprimés.
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
