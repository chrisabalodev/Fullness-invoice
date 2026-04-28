import { Link } from "wouter";
import {
  useGetDashboardSummary,
  useGetRecentDocuments,
  useGetTopClients,
  useGetTopArticles,
  useGetMonthlyRevenue,
} from "@workspace/api-client-react";
import {
  TrendingUp,
  Receipt,
  FileText,
  Truck,
  Users,
  Package,
  Plus,
  AlertCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { TypeBadge, StatusBadge } from "@/components/status-badge";
import { formatMoney, formatDate } from "@/lib/format";

const MONTH_LABELS = [
  "Janv.", "Févr.", "Mars", "Avril", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc.",
];

function monthLabel(yyyymm: string): string {
  const [, mm] = yyyymm.split("-");
  const idx = parseInt(mm ?? "1", 10) - 1;
  return MONTH_LABELS[idx] ?? mm ?? "";
}

export default function Dashboard() {
  const { data: summary } = useGetDashboardSummary();
  const { data: recent = [] } = useGetRecentDocuments({ limit: 8 });
  const { data: topClients = [] } = useGetTopClients({ limit: 5 });
  const { data: topArticles = [] } = useGetTopArticles({ limit: 5 });
  const { data: monthly = [] } = useGetMonthlyRevenue();

  const chartData = monthly.map((m) => ({
    name: monthLabel(m.month),
    Revenu: m.revenue,
    Factures: m.invoiceCount,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de l'activité commerciale."
        action={
          <Link href="/documents/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouveau document
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={TrendingUp}
          label="Chiffre d'affaires"
          value={`${formatMoney(summary?.totalRevenue ?? 0)} F`}
          tone="primary"
        />
        <KpiCard
          icon={AlertCircle}
          label="Impayé"
          value={`${formatMoney(summary?.totalUnpaid ?? 0)} F`}
          tone="warning"
        />
        <KpiCard
          icon={Receipt}
          label="Factures"
          value={`${summary?.invoiceCount ?? 0}`}
        />
        <KpiCard icon={FileText} label="Devis" value={`${summary?.quoteCount ?? 0}`} />
        <KpiCard icon={Truck} label="Bons de livraison" value={`${summary?.deliveryCount ?? 0}`} />
        <KpiCard
          icon={Users}
          label="Clients / Articles"
          value={`${summary?.clientCount ?? 0} / ${summary?.articleCount ?? 0}`}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chiffre d'affaires mensuel</CardTitle>
            <CardDescription>12 derniers mois (en F CFA, TTC)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(v) => formatMoney(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => `${formatMoney(v)} F`}
                  />
                  <Area
                    type="monotone"
                    dataKey="Revenu"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#rev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top clients</CardTitle>
            <CardDescription>Par chiffre d'affaires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topClients.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            )}
            {topClients.map((c, i) => (
              <Link key={c.clientId} href={`/clients/${c.clientId}`}>
                <div className="flex items-center justify-between gap-3 p-2 -mx-2 rounded hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.clientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.invoiceCount} facture{c.invoiceCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm tabular-nums">
                    {formatMoney(c.totalRevenue)} F
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Documents récents</CardTitle>
              <CardDescription>Dernières créations toutes catégories</CardDescription>
            </div>
            <Link href="/documents">
              <Button variant="ghost" size="sm">Tout voir</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Aucun document n'a encore été créé.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => (window.location.href = `${import.meta.env.BASE_URL}documents/${d.id}`)}
                    >
                      <TableCell className="font-mono text-xs font-semibold">{d.numero}</TableCell>
                      <TableCell><TypeBadge type={d.type} /></TableCell>
                      <TableCell className="truncate max-w-[180px]">{d.clientName}</TableCell>
                      <TableCell className="text-xs">{formatDate(d.date)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatMoney(d.totalTtc)} F
                      </TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top articles</CardTitle>
            <CardDescription>Les plus vendus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topArticles.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            )}
            {topArticles.map((a, i) => (
              <div key={`${a.reference}-${i}`} className="flex items-start justify-between gap-3 py-1">
                <div className="flex items-start gap-3 min-w-0">
                  <Package className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold">{a.reference}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.designation}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm tabular-nums">{formatMoney(a.totalRevenue)} F</p>
                  <p className="text-xs text-muted-foreground">Qté {formatMoney(a.totalQuantity)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone?: "primary" | "warning";
}) {
  const accent =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "warning"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-muted text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </span>
          <span className={`p-1.5 rounded-md ${accent}`}>
            <Icon className="w-3.5 h-3.5" />
          </span>
        </div>
        <p className="text-lg md:text-xl font-bold tabular-nums leading-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
