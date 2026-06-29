import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/forms/FormSection";
import { LogoUpload } from "@/components/companies/LogoUpload";
import { DocumentNumberingSection } from "@/components/DocumentNumberingSection";
import { LocationsSection } from "@/components/LocationsSection";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompanyView({ company }: { company: CompanyWithRelations }) {
  const [currentCompany, setCurrentCompany] = useState(company);
  const [error, setError] = useState<string | null>(null);

  async function refreshCompany() {
    const response = await fetch(`/api/companies/${currentCompany.id}`);
    if (response.ok) {
      setCurrentCompany(await response.json());
    }
  }

  async function handleDelete() {
    const response = await fetch(`/api/companies/${currentCompany.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error || "Failed to delete company");
      return;
    }

    document.cookie = "companyId=;path=/;max-age=0;samesite=lax";
    window.location.href = "/companies";
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{currentCompany.name}</h1>
          <p className="font-mono text-xs text-muted-foreground">OIB {currentCompany.oib}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={`/companies/${currentCompany.id}/edit`}>Edit Details</a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete company?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes {currentCompany.name} and returns you to the companies list.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FormSection title="Company Details">
        <dl className="grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2">
          <Detail label="Issuer" value={currentCompany.issuerName} />
          <Detail label="Default Payment Terms" value={`${currentCompany.defaultPaymentTermsDays} days`} />
          <Detail label="Address" value={currentCompany.address} />
          <Detail label="Phone" value={currentCompany.phone} />
          <Detail label="IBAN" value={currentCompany.iban} mono />
          <Detail label="SWIFT/BIC" value={currentCompany.swift} mono />
          <Detail label="From Address" value={currentCompany.emailFromAddress} />
          <Detail label="From Name" value={currentCompany.emailFromName} />
        </dl>
      </FormSection>

      <FormSection title="Logo" description="Shown in the document header. PNG, JPG, or SVG. Saved immediately on upload.">
        <LogoUpload companyId={currentCompany.id} currentPath={currentCompany.logoPath} onUploaded={refreshCompany} />
      </FormSection>

      <LocationsSection companyId={currentCompany.id} locations={currentCompany.locations ?? []} onUpdated={refreshCompany} />
      <PaymentMethodsSection
        companyId={currentCompany.id}
        paymentMethods={currentCompany.paymentMethods ?? []}
        onUpdated={refreshCompany}
      />
      <DocumentNumberingSection
        companyId={currentCompany.id}
        locations={currentCompany.locations ?? []}
        paymentMethods={currentCompany.paymentMethods ?? []}
      />
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string | number | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono" : "font-medium"}>{value || "-"}</dd>
    </div>
  );
}
