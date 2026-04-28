import { useState } from "react";
import { Link } from "wouter";
import {
  useListDocuments,
  type ListDocumentsParams,
} from "@workspace/api-client-react";
import {
  Plus,
  Search,
  FileText,
  Receipt,
  Truck,
  Files,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TypeBadge, StatusBadge } from "@/components/status-badge";
import { formatMoney, formatDate } from "@/lib/format";

const TYPE_TABS = [
  { value: "all", label: "Tous", icon: Files },
  { value: "facture", label: "Factures", icon: Receipt },
  { value: "devis", label: "Devis", icon: FileText },
  { value: "bon_livraison", label: "Bons de livraison", icon: Truck },
] as const;

export default function DocumentsPage() {
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const params: ListDocumentsParams = {};
  if (type !== "all") params.type = type as ListDocumentsParams["type"];
  if (status !== "all") params.status = status as ListDocumentsParams["status"];
  if (search) params.search = search;

  const { data: documents = [], isLoading } = useListDocuments(params);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Factures, devis et bons de livraison."
        action={
          <Link href="/documents/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nouveau document
            </Button>
          </Link>
        }
      />

      <Tabs value={type} onValueChange={setType}>
        <TabsList>
          {TYPE_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              <t.icon className="w-4 h-4 mr-2" /> {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
            <SelectItem value="paye">Payé</SelectItem>
            <SelectItem value="livre">Livré</SelectItem>
            <SelectItem value="annule">Annulé</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{documents.length} document(s)</span>
      </div>

      {!isLoading && documents.length === 0 ? (
        <EmptyState
          icon={Files}
          title="Aucun document"
          description="Commencez par créer une facture, un devis ou un bon de livraison."
          action={
            <Link href="/documents/new">
              <Button><Plus className="w-4 h-4 mr-2" /> Créer un document</Button>
            </Link>
          }
        />
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => (window.location.href = `${import.meta.env.BASE_URL}documents/${d.id}`)}
                >
                  <TableCell className="font-mono text-xs font-semibold">{d.numero}</TableCell>
                  <TableCell><TypeBadge type={d.type} /></TableCell>
                  <TableCell className="max-w-[240px] truncate">{d.clientName}</TableCell>
                  <TableCell className="text-sm">{formatDate(d.date)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(d.echeance)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {formatMoney(d.totalTtc)} F
                  </TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
