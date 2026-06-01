import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  KeyRound,
  Plus,
  Copy,
  ShieldCheck,
  Lock,
  Loader2,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDate } from "@/lib/format";
import {
  verifyAdminPassword,
  fetchLicenseKeys,
  createLicenseKey,
  changeAdminPassword,
  fetchLicenseStatus,
  disableTrial,
  formatDuration,
  DURATION_UNITS,
  type DurationUnit,
} from "@/lib/license-api";

interface Props {
  onExit: () => void;
}

export function AdminSection({ onExit }: Props) {
  const [password, setPassword] = useState<string | null>(null);
  if (!password) return <AdminLogin onSuccess={setPassword} onCancel={onExit} />;
  return <AdminPanel password={password} onExit={onExit} />;
}

function AdminLogin({
  onSuccess,
  onCancel,
}: {
  onSuccess: (password: string) => void;
  onCancel: () => void;
}) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyAdminPassword(pw);
      onSuccess(pw);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="mt-2">Administration</CardTitle>
          <CardDescription>Saisissez le mot de passe administrateur.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-pw">Mot de passe</Label>
              <Input
                id="admin-pw"
                type="password"
                value={pw}
                autoFocus
                onChange={(e) => setPw(e.target.value)}
                placeholder="Mot de passe administrateur"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
                <ArrowLeft className="h-4 w-4" /> Retour
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !pw}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Entrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminPanel({ password, onExit }: { password: string; onExit: () => void }) {
  const qc = useQueryClient();
  const keysQuery = useQuery({
    queryKey: ["license", "keys"],
    queryFn: () => fetchLicenseKeys(password),
  });
  const statusQuery = useQuery({
    queryKey: ["license", "status"],
    queryFn: fetchLicenseStatus,
  });

  const [durationValue, setDurationValue] = useState(12);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>("month");
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastKey, setLastKey] = useState<string | null>(null);

  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changing, setChanging] = useState(false);
  const [disabling, setDisabling] = useState(false);

  async function generate() {
    if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 100_000) {
      toast.error("La durée doit être un entier entre 1 et 100000.");
      return;
    }
    setGenerating(true);
    try {
      const key = await createLicenseKey(
        password,
        durationValue,
        durationUnit,
        note || undefined,
      );
      setLastKey(key.code);
      setNote("");
      toast.success("Clé de licence générée.");
      qc.invalidateQueries({ queryKey: ["license", "keys"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de génération.");
    } finally {
      setGenerating(false);
    }
  }

  function copy(code: string) {
    void navigator.clipboard.writeText(code);
    toast.success("Clé copiée.");
  }

  async function disableTrialNow() {
    setDisabling(true);
    try {
      await disableTrial(password);
      toast.success("Mode essai désactivé. L'application est maintenant bloquée.");
      qc.invalidateQueries({ queryKey: ["license", "status"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setDisabling(false);
    }
  }

  async function changePw() {
    if (newPw.length < 4) {
      toast.error("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }
    if (newPw !== confirmPw) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    setChanging(true);
    try {
      await changeAdminPassword(password, newPw);
      toast.success("Mot de passe administrateur modifié.");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setChanging(false);
    }
  }

  const status = statusQuery.data;
  const keys = keysQuery.data ?? [];

  return (
    <div className="min-h-screen bg-muted/30 overflow-y-auto">
      <div className="mx-auto max-w-4xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-amber-600" /> Administration
            </h1>
            <p className="text-sm text-muted-foreground">Gestion des clés de licence</p>
          </div>
          <Button variant="outline" onClick={onExit}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">État de la licence</CardTitle>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <Badge variant={status.expired ? "destructive" : "default"}>
                  {status.expired ? "Expirée" : status.isTrial ? "Essai" : "Active"}
                </Badge>
                <span className="text-muted-foreground">
                  Expire le <strong className="text-foreground">{formatDate(status.expiresAt)}</strong>
                </span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">{status.daysRemaining}</strong> jour(s) restant(s)
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> Générer une clé de licence
            </CardTitle>
            <CardDescription>
              Choisissez la durée (minute, heure, jour, mois ou année). La clé pourra être
              utilisée pour activer ou prolonger l'application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration-value">Durée</Label>
                <Input
                  id="duration-value"
                  type="number"
                  min={1}
                  max={100000}
                  value={durationValue}
                  onChange={(e) => setDurationValue(Number(e.target.value))}
                  className="w-28"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration-unit">Unité</Label>
                <Select
                  value={durationUnit}
                  onValueChange={(v) => setDurationUnit(v as DurationUnit)}
                >
                  <SelectTrigger id="duration-unit" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-48">
                <Label htmlFor="note">Note (facultatif)</Label>
                <Input
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ex. Client, référence…"
                />
              </div>
              <Button onClick={generate} disabled={generating}>
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Générer
              </Button>
            </div>

            {lastKey ? (
              <div className="flex items-center justify-between rounded-lg border bg-primary/5 px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Nouvelle clé générée</p>
                  <p className="font-mono text-lg font-semibold tracking-wider">{lastKey}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => copy(lastKey)}>
                  <Copy className="h-4 w-4" /> Copier
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Clés générées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune clé générée pour le moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Clé</TableHead>
                    <TableHead>Durée</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Utilisée le</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="font-mono">{k.code}</TableCell>
                      <TableCell>{formatDuration(k.durationValue, k.durationUnit)}</TableCell>
                      <TableCell>
                        <Badge variant={k.status === "used" ? "secondary" : "default"}>
                          {k.status === "used" ? "Utilisée" : "Disponible"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{k.note ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(k.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {k.redeemedAt ? formatDate(k.redeemedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => copy(k.code)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Power className="h-4 w-4 text-destructive" /> Désactiver le mode essai (30 jours)
            </CardTitle>
            <CardDescription>
              Coupe immédiatement la période d'essai : l'application se bloque aussitôt et exige
              une clé de licence valide pour fonctionner. Générez d'abord une clé si nécessaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={disabling || status?.expired}>
                  {disabling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                  {status?.expired ? "Essai déjà désactivé" : "Désactiver le mode essai"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Désactiver le mode essai ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    L'application sera bloquée immédiatement et ne pourra être utilisée qu'avec
                    une clé de licence valide. Cette action est irréversible sans clé.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={disableTrialNow}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Désactiver
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" /> Changer le mot de passe administrateur
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-pw">Nouveau mot de passe</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  className="w-56"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-pw">Confirmer</Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-56"
                />
              </div>
              <Button onClick={changePw} disabled={changing}>
                {changing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
