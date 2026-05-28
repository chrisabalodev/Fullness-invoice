import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCompany,
  useUpdateCompany,
  getGetCompanyQueryKey,
} from "@workspace/api-client-react";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface CompanyFormValues {
  name: string;
  description: string;
  address: string;
  phone: string;
  fiscalNumber: string;
  rccm: string;
  bankAccounts: string;
  modesReglement: string;
  conditionsPaiement: string;
  comptoirName: string;
  comptoirCity: string;
  comptoirPhone: string;
  tvaRate: number;
  currency: string;
  legalFooter: string;
  emailSignature: string;
}

export default function ParametresPage() {
  const qc = useQueryClient();
  const { data: company } = useGetCompany();
  const update = useUpdateCompany({
    mutation: {
      onSuccess: () => {
        toast.success("Paramètres enregistrés");
        qc.invalidateQueries({ queryKey: getGetCompanyQueryKey() });
      },
      onError: () => toast.error("Erreur d'enregistrement"),
    },
  });

  const { register, handleSubmit, reset } = useForm<CompanyFormValues>();

  useEffect(() => {
    if (company) reset(company as CompanyFormValues);
  }, [company, reset]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres"
        description="Coordonnées de l'entreprise affichées sur tous les documents imprimés."
      />

      <form
        onSubmit={handleSubmit((v) =>
          update.mutate({
            data: {
              ...v,
              tvaRate: Number(v.tvaRate),
            },
          }),
        )}
        className="space-y-6 max-w-4xl"
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Identité de l'entreprise
            </CardTitle>
            <CardDescription>Apparaît dans le bandeau supérieur des factures et bons.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Raison sociale</Label>
              <Input id="name" {...register("name", { required: true })} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Description / Activité</Label>
              <Input id="description" {...register("description")} placeholder="Ex : Grossiste en matériel électrique, quincaillerie…" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Adresse complète</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div>
              <Label htmlFor="fiscalNumber">N° fiscal</Label>
              <Input id="fiscalNumber" {...register("fiscalNumber")} />
            </div>
            <div>
              <Label htmlFor="rccm">RCCM</Label>
              <Input id="rccm" {...register("rccm")} />
            </div>
            <div>
              <Label htmlFor="currency">Devise</Label>
              <Input id="currency" {...register("currency")} />
            </div>
            <div>
              <Label htmlFor="tvaRate">Taux de TVA (%)</Label>
              <Input id="tvaRate" type="number" step="0.01" {...register("tvaRate", { valueAsNumber: true })} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="bankAccounts">Comptes bancaires (un par ligne)</Label>
              <Textarea id="bankAccounts" rows={3} {...register("bankAccounts")} className="font-mono text-sm" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="modesReglement">Modes de règlement (un par ligne)</Label>
              <Textarea
                id="modesReglement"
                rows={4}
                {...register("modesReglement")}
                className="font-mono text-sm"
                placeholder={"Espèces\nChèque\nVirement bancaire\nMobile money\nCarte bancaire"}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ces modes apparaissent dans la liste déroulante sur les documents et les règlements.
              </p>
            </div>
            <div className="col-span-2">
              <Label htmlFor="conditionsPaiement">Conditions de paiement (une par ligne)</Label>
              <Textarea
                id="conditionsPaiement"
                rows={6}
                {...register("conditionsPaiement")}
                className="font-mono text-sm"
                placeholder={
                  "Paiement comptant à la livraison\n" +
                  "20% à la commande, solde à la réception\n" +
                  "30% à la commande, 70% à la livraison\n" +
                  "Paiement fin de mois\n" +
                  "Paiement 30 jours fin de mois\n" +
                  "Paiement 30 jours fin de mois le 10"
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ces modèles de conditions apparaissent en liste déroulante sur les documents et le PDF imprimé.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comptoir / Point de vente</CardTitle>
            <CardDescription>Bloc affiché sous le code-barres en haut des documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="comptoirName">Nom du comptoir</Label>
              <Input id="comptoirName" {...register("comptoirName")} />
            </div>
            <div>
              <Label htmlFor="comptoirCity">Ville</Label>
              <Input id="comptoirCity" {...register("comptoirCity")} />
            </div>
            <div>
              <Label htmlFor="comptoirPhone">Téléphone</Label>
              <Input id="comptoirPhone" {...register("comptoirPhone")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mentions légales</CardTitle>
            <CardDescription>Affiché en bas des documents imprimés.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea rows={3} {...register("legalFooter")} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Signature email / WhatsApp</CardTitle>
            <CardDescription>Ajoutée automatiquement au bas des messages de partage de documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              {...register("emailSignature")}
              placeholder={"Cordialement,\nSTE LE WATT\nTél : +228 22 22 27 74\nwww.exemple.com"}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending} size="lg">
            <Save className="w-4 h-4 mr-2" />
            {update.isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
          </Button>
        </div>
      </form>
    </div>
  );
}
