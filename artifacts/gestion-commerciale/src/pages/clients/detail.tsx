import { Link, useLocation } from "wouter";
import {
  useGetClient,
  useListDocuments,
} from "@workspace/api-client-react";
import { ArrowLeft, Phone, Mail, MapPin, Building2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
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
import { TypeBadge, StatusBadge } from "@/components/status-badge";
import { formatMoney, formatDate } from "@/lib/format";

export default function ClientDetailPage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { data: client } = useGetClient(id);
  const { data: documents = [] } = useListDocuments({ clientId: id });

  if (!client) return <p className="text-muted-foreground">Chargement…</p>;

  const totalRevenue = documents
    .filter((d) => d.type === "facture")
    .reduce((s, d) => s + d.totalTtc, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={client.name}
        description={client.contactName || undefined}
        action={
          <Button variant="outline" onClick={() => navigate("/clients")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Coordonnées
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {client.address && (
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{client.address}{client.city ? `, ${client.city}` : ""}</span>
              </p>
            )}
            {client.phone && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" /> {client.phone}
              </p>
            )}
            {client.email && (
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" /> {client.email}
              </p>
            )}
            {client.fiscalNumber && (
              <p className="text-xs text-muted-foreground pt-2">NIF {client.fiscalNumber}</p>
            )}
            {client.notes && (
              <div className="pt-3 mt-3 border-t border-border text-sm italic text-muted-foreground">
                {client.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <Stat label="Documents" value={`${documents.length}`} />
            <Stat label="Factures" value={`${documents.filter((d) => d.type === "facture").length}`} />
            <Stat label="Chiffre d'affaires" value={`${formatMoney(totalRevenue)} F`} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aucun document pour ce client.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numéro</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total TTC</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id} className="hover:bg-accent/40 cursor-pointer">
                    <TableCell className="font-mono text-xs font-semibold">
                      <Link href={`/documents/${d.id}`}>{d.numero}</Link>
                    </TableCell>
                    <TableCell><TypeBadge type={d.type} /></TableCell>
                    <TableCell>{formatDate(d.date)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatMoney(d.totalTtc)} F</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xl font-bold tabular-nums mt-1">{value}</p>
    </div>
  );
}
