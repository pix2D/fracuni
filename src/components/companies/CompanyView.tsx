import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/forms/FormSection";
import { CompanyDetailSections } from "@/components/companies/CompanyDetailSections";
import { companyDefaults, companyDetailFields, createCompanyDefaults } from "@/components/companies/company-form-model";
import { LogoUpload } from "@/components/companies/LogoUpload";
import { DocumentNumberingSection } from "@/components/DocumentNumberingSection";
import { LocationsSection } from "@/components/LocationsSection";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { CompanyFieldsSchema } from "@/lib/companies.schema";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompanyView({ company }: { company: CompanyWithRelations | null }) {
  const [currentCompany, setCurrentCompany] = useState<CompanyWithRelations | null>(company);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function refreshCompany() {
    const response = await fetch("/api/company");
    if (response.ok) {
      setCurrentCompany(await response.json());
    }
  }

  const form = useAppForm({
    defaultValues: currentCompany ? companyDefaults(currentCompany) : createCompanyDefaults,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CompanyFieldsSchema,
    },
    onSubmitInvalid: () => {
      setSaved(null);
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSaved(null);
      const response = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to save company profile"));
        return;
      }

      setCurrentCompany(await response.json());
      setSaved("Company profile saved.");
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Company</h1>
        <p className="text-sm text-muted-foreground">Issuer profile used on every document.</p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {saved ? (
        <Alert>
          <AlertDescription>{saved}</AlertDescription>
        </Alert>
      ) : null}

      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <CompanyDetailSections form={form} fields={companyDetailFields} />
        <div className="flex justify-end border-t pt-4">
          <Button type="submit">{currentCompany ? "Save Company Profile" : "Create Company Profile"}</Button>
        </div>
      </form>

      {currentCompany ? (
        <>
          <FormSection title="Logo" description="Shown in the document header. PNG, JPG, or WebP. Saved immediately on upload.">
            <LogoUpload currentPath={currentCompany.logoPath} onUploaded={refreshCompany} />
          </FormSection>

          <LocationsSection locations={currentCompany.locations ?? []} onUpdated={refreshCompany} />
          <PaymentMethodsSection
            paymentMethods={currentCompany.paymentMethods ?? []}
            onUpdated={refreshCompany}
          />
          <DocumentNumberingSection
            locations={currentCompany.locations ?? []}
            paymentMethods={currentCompany.paymentMethods ?? []}
          />
        </>
      ) : null}
    </div>
  );
}
