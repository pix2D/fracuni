import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LocationsSection } from "@/components/LocationsSection";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import type { CompanyWithRelations, CompanyInput } from "@/lib/companies";

const PLACEHOLDER_TOKENS = [
  { token: "{broj}", description: "Document number" },
  { token: "{kupac}", description: "Client name" },
  { token: "{datum}", description: "Document date" },
];

interface Props {
  company?: CompanyWithRelations;
  onSave: (data: CompanyInput) => void;
  onCancel: () => void;
  onCompanyUpdated: () => void;
}

export function CompanyForm({ company, onSave, onCancel, onCompanyUpdated }: Props) {
  const [form, setForm] = useState<CompanyInput>({
    name: company?.name ?? "",
    address: company?.address ?? "",
    phone: company?.phone ?? "",
    oib: company?.oib ?? "",
    taglineHr: company?.taglineHr ?? "",
    taglineEn: company?.taglineEn ?? "",
    iban: company?.iban ?? "",
    swift: company?.swift ?? "",
    legalTextDomestic: company?.legalTextDomestic ?? "",
    legalTextForeignHr: company?.legalTextForeignHr ?? "",
    legalTextForeignEn: company?.legalTextForeignEn ?? "",
    emailFromAddress: company?.emailFromAddress ?? "",
    emailFromName: company?.emailFromName ?? "",
    emailSubjectTemplate: company?.emailSubjectTemplate ?? "",
    emailBodyTemplate: company?.emailBodyTemplate ?? "",
    defaultPaymentTermsDays: company?.defaultPaymentTermsDays ?? 15,
    issuerName: company?.issuerName ?? "",
  });

  function update(field: keyof CompanyInput, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="bank">Bank & Legal</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          {company && <TabsTrigger value="locations">Locations</TabsTrigger>}
          {company && <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>}
        </TabsList>

        <TabsContent value="general" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oib">OIB *</Label>
              <Input id="oib" value={form.oib} onChange={(e) => update("oib", e.target.value)} required maxLength={11} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Textarea id="address" value={form.address} onChange={(e) => update("address", e.target.value)} required rows={2} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuerName">Issuer Name (Izdavatelj računa) *</Label>
              <Input id="issuerName" value={form.issuerName} onChange={(e) => update("issuerName", e.target.value)} required />
            </div>
          </div>

          <Separator />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="taglineHr">Tagline (HR)</Label>
              <Input id="taglineHr" value={form.taglineHr ?? ""} onChange={(e) => update("taglineHr", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taglineEn">Tagline (EN)</Label>
              <Input id="taglineEn" value={form.taglineEn ?? ""} onChange={(e) => update("taglineEn", e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPaymentTermsDays">Default Payment Terms (days) *</Label>
            <Input
              id="defaultPaymentTermsDays"
              type="number"
              min={1}
              value={form.defaultPaymentTermsDays}
              onChange={(e) => update("defaultPaymentTermsDays", Number(e.target.value))}
              required
            />
          </div>

          {company && (
            <div className="space-y-2">
              <Label>Logo</Label>
              <LogoUpload companyId={company.id} currentPath={company.logoPath} onUploaded={onCompanyUpdated} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="bank" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN *</Label>
              <Input id="iban" value={form.iban} onChange={(e) => update("iban", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="swift">SWIFT/BIC *</Label>
              <Input id="swift" value={form.swift} onChange={(e) => update("swift", e.target.value)} required />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="legalTextDomestic">Legal Text — Domestic (HR)</Label>
            <Textarea
              id="legalTextDomestic"
              value={form.legalTextDomestic ?? ""}
              onChange={(e) => update("legalTextDomestic", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalTextForeignHr">Legal Text — Foreign (HR)</Label>
            <Textarea
              id="legalTextForeignHr"
              value={form.legalTextForeignHr ?? ""}
              onChange={(e) => update("legalTextForeignHr", e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalTextForeignEn">Legal Text — Foreign (EN)</Label>
            <Textarea
              id="legalTextForeignEn"
              value={form.legalTextForeignEn ?? ""}
              onChange={(e) => update("legalTextForeignEn", e.target.value)}
              rows={3}
            />
          </div>
        </TabsContent>

        <TabsContent value="email" className="space-y-4 pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emailFromAddress">From Address *</Label>
              <Input
                id="emailFromAddress"
                type="email"
                value={form.emailFromAddress}
                onChange={(e) => update("emailFromAddress", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailFromName">From Name *</Label>
              <Input id="emailFromName" value={form.emailFromName} onChange={(e) => update("emailFromName", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailSubjectTemplate">Subject Template</Label>
            <Input
              id="emailSubjectTemplate"
              value={form.emailSubjectTemplate ?? ""}
              onChange={(e) => update("emailSubjectTemplate", e.target.value)}
            />
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {PLACEHOLDER_TOKENS.map(({ token, description }) => (
                <span key={token} className="rounded bg-muted px-1.5 py-0.5 font-mono">
                  {token} <span className="text-muted-foreground/70">— {description}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailBodyTemplate">Body Template</Label>
            <Textarea
              id="emailBodyTemplate"
              value={form.emailBodyTemplate ?? ""}
              onChange={(e) => update("emailBodyTemplate", e.target.value)}
              rows={5}
            />
          </div>
        </TabsContent>

        {company && (
          <TabsContent value="locations" className="pt-4">
            <LocationsSection companyId={company.id} locations={company.locations ?? []} onUpdated={onCompanyUpdated} />
          </TabsContent>
        )}

        {company && (
          <TabsContent value="payment-methods" className="pt-4">
            <PaymentMethodsSection companyId={company.id} paymentMethods={company.paymentMethods ?? []} onUpdated={onCompanyUpdated} />
          </TabsContent>
        )}
      </Tabs>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {company ? "Save Changes" : "Create Company"}
        </Button>
      </div>
    </form>
  );
}

function LogoUpload({ companyId, currentPath, onUploaded }: { companyId: number; currentPath?: string | null; onUploaded: () => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);
    await fetch(`/api/companies/${companyId}/logo`, { method: "POST", body: formData });
    setUploading(false);
    onUploaded();
  }

  return (
    <div className="flex items-center gap-4">
      {currentPath && (
        <img src={`/api/companies/${companyId}/logo`} alt="Logo" className="h-10 w-10 rounded object-contain" />
      )}
      <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} disabled={uploading} />
    </div>
  );
}
