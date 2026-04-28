import { useLocation } from "wouter";
import { useGetArticle } from "@workspace/api-client-react";
import { ArrowLeft, Package } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";

export default function ArticleDetailPage({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { data: article } = useGetArticle(id);

  if (!article) return <p className="text-muted-foreground">Chargement…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={article.designation}
        description={`Référence ${article.reference}`}
        action={
          <Button variant="outline" onClick={() => navigate("/articles")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour
          </Button>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" /> Informations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Référence" value={article.reference} />
            <Row label="Désignation" value={article.designation} />
            <Row label="Unité" value={article.unite} />
            <Row label="Dépôt" value={article.depot ?? "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tarif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-primary">
              {formatMoney(article.prixUnitaire)} F
            </p>
            <p className="text-sm text-muted-foreground mt-1">par {article.unite.toLowerCase()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(article.stock)}</p>
            <p className="text-sm text-muted-foreground mt-1">{article.unite.toLowerCase()}(s) disponibles</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border pb-2 last:border-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
