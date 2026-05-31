import { useState } from "react";
import { toast } from "sonner";
import { Lock, KeyRound, ShieldCheck, Loader2 } from "lucide-react";
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
import { redeemLicenseKey } from "@/lib/license-api";
import { AdminSection } from "./admin-section";

interface Props {
  onUnlocked: () => void;
}

export function BlockedScreen({ onUnlocked }: Props) {
  const [showAdmin, setShowAdmin] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  if (showAdmin) return <AdminSection onExit={() => setShowAdmin(false)} />;

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await redeemLicenseKey(code.trim());
      toast.success("Licence activée. Bienvenue.");
      onUnlocked();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clé invalide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="mt-2">Licence expirée</CardTitle>
          <CardDescription>
            L'accès à l'application est bloqué. Saisissez une clé de licence valide pour
            réactiver l'application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={unlock} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="license-code">Clé de licence</Label>
              <Input
                id="license-code"
                value={code}
                autoFocus
                onChange={(e) => setCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="font-mono tracking-wider"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Débloquer l'application
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowAdmin(true)}
          >
            <ShieldCheck className="h-4 w-4" /> Accès administrateur
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
