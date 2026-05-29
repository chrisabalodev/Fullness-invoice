import { useState, useRef } from "react";
import { toast } from "sonner";
import { Send, Download, MessageCircle, Paperclip, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  facture: "facture",
  facture_proforma: "facture proforma",
  devis: "devis",
  bon_livraison: "bon de livraison",
  avoir: "avoir",
};

function buildDefaultMessage(
  doc: { type: string; numero: string; totalTtc?: number | null; client?: { name?: string } | null },
  company: { name?: string; emailSignature?: string } | undefined,
): string {
  const typeLabel = TYPE_LABELS[doc.type] ?? doc.type;
  const clientName = doc.client?.name ?? "Client";
  const montant = formatMoney(doc.totalTtc ?? 0);
  const sig = company?.emailSignature ?? "";

  let body = "";
  if (doc.type === "facture") {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre facture N° ${doc.numero} d'un montant de ${montant}.\n\n` +
      `Nous vous remercions de votre confiance et restons disponibles pour tout renseignement.`;
  } else if (doc.type === "facture_proforma") {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre facture proforma N° ${doc.numero} d'un montant de ${montant}.\n\n` +
      `N'hésitez pas à nous contacter pour confirmer votre commande ou pour toute question.`;
  } else if (doc.type === "devis") {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre devis N° ${doc.numero} d'un montant de ${montant}.\n\n` +
      `Ce devis est valable 30 jours. Nous restons à votre disposition pour tout complément d'information.`;
  } else if (doc.type === "bon_livraison") {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre bon de livraison N° ${doc.numero}.\n\n` +
      `Nous vous remercions de bien vouloir signer et nous retourner ce bon après réception de la marchandise.`;
  } else if (doc.type === "avoir") {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre avoir N° ${doc.numero} d'un montant de ${montant}.\n\n` +
      `Cet avoir sera déduit de votre prochaine commande.`;
  } else {
    body =
      `Bonjour ${clientName},\n\n` +
      `Veuillez trouver ci-joint votre ${typeLabel} N° ${doc.numero}.`;
  }
  if (sig) body += `\n\n${sig}`;
  return body;
}

function buildDefaultSubject(
  doc: { type: string; numero: string },
  company: { name?: string } | undefined,
): string {
  const typeLabel = TYPE_LABELS[doc.type] ?? doc.type;
  const name = company?.name ?? "";
  return `${name}${name ? " — " : ""}${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} N° ${doc.numero}`;
}

// ── Email Compose Dialog ────────────────────────────────────────────────────

interface EmailComposeDialogProps {
  open: boolean;
  onClose: () => void;
  doc: {
    id: number;
    type: string;
    numero: string;
    totalTtc?: number | null;
    client?: { name?: string; email?: string | null } | null;
  };
  company: { name?: string; emailSignature?: string; smtpHost?: string } | undefined;
}

export function EmailComposeDialog({ open, onClose, doc, company }: EmailComposeDialogProps) {
  const [to, setTo] = useState(() => doc.client?.email ?? "");
  const [subject, setSubject] = useState(() => buildDefaultSubject(doc, company));
  const [body, setBody] = useState(() => buildDefaultMessage(doc, company));
  const [sending, setSending] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasSmtp = !!company?.smtpHost;
  const printUrl = `/documents/${doc.id}/print`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }
    setUploadedFile(file);
  }

  function removeFile() {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSend() {
    if (!to.trim()) { toast.error("Veuillez saisir l'adresse email du destinataire"); return; }
    setSending(true);
    try {
      let pdfBase64: string | undefined;
      if (uploadedFile) {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        bytes.forEach((b) => { binary += String.fromCharCode(b); });
        pdfBase64 = btoa(binary);
      }
      const r = await fetch(`/api/documents/${doc.id}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, body, pdfBase64 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erreur lors de l'envoi");
      toast.success(`Email envoyé à ${to.trim()}`);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer par email — {doc.numero}</DialogTitle>
        </DialogHeader>

        {!hasSmtp && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            La configuration SMTP n'est pas renseignée. Rendez-vous dans{" "}
            <strong>Paramètres → Configuration SMTP</strong> pour activer l'envoi d'emails.
          </div>
        )}

        <div className="space-y-4 py-1">
          <div>
            <Label>Destinataire (email)</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="client@exemple.com"
              type="email"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Sujet</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Corps du message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="mt-1 font-mono text-sm"
            />
          </div>

          {/* Pièce jointe PDF */}
          <div className="rounded-md border px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Pièce jointe PDF</span>
              <a
                href={printUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Ouvrir la version imprimable
              </a>
            </div>

            {uploadedFile ? (
              <div className="flex items-center gap-2 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{uploadedFile.name}</span>
                <button onClick={removeFile} className="text-green-700 hover:text-red-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>PDF généré automatiquement (approximatif)</span>
                  <span className="text-xs">— ou —</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                  >
                    <Paperclip className="w-3 h-3" />
                    Joindre votre propre PDF
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Pour une mise en page exacte : ouvrez la version imprimable → Imprimer → Enregistrer en PDF → joignez le fichier ici.
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending || !hasSmtp}>
            <Send className="w-4 h-4 mr-2" />
            {sending ? "Envoi en cours…" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── WhatsApp Compose Dialog ─────────────────────────────────────────────────

interface WhatsAppComposeDialogProps {
  open: boolean;
  onClose: () => void;
  doc: {
    id: number;
    type: string;
    numero: string;
    totalTtc?: number | null;
    client?: { name?: string } | null;
  };
  company: { name?: string; emailSignature?: string } | undefined;
}

export function WhatsAppComposeDialog({ open, onClose, doc, company }: WhatsAppComposeDialogProps) {
  const [body, setBody] = useState(() => buildDefaultMessage(doc, company));

  function openWhatsApp() {
    const text = encodeURIComponent(body);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    onClose();
  }

  function downloadPdf() {
    window.open(`/api/documents/${doc.id}/pdf`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Envoyer par WhatsApp — {doc.numero}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
            WhatsApp ne permet pas les pièces jointes via un lien. Téléchargez d'abord le PDF,
            puis joignez-le manuellement dans WhatsApp.
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="w-4 h-4 mr-2" />
            Télécharger le PDF
          </Button>
          <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700 text-white">
            <MessageCircle className="w-4 h-4 mr-2" />
            Ouvrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
