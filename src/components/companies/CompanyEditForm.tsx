import { useState } from "react";
import { CompanyDetailSections } from "@/components/companies/CompanyDetailSections";
import { CompanyFormShell, FormActions } from "@/components/companies/CompanyFormLayout";
import { FormSection } from "@/components/forms/FormSection";
import { LogoUpload } from "@/components/companies/LogoUpload";
import { companyDefaults, companyDetailFields } from "@/components/companies/company-form-model";
import { LocationsSection } from "@/components/LocationsSection";
import { PaymentMethodsSection } from "@/components/PaymentMethodsSection";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { CompanyFieldsSchema } from "@/lib/companies.schema";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompanyEditForm({ company }: { company: CompanyWithRelations }) {
  const [currentCompany, setCurrentCompany] = useState(company);
  const [error, setError] = useState<string | null>(null);

  async function refreshCompany() {
    const response = await fetch(`/api/companies/${currentCompany.id}`);
    if (response.ok) {
      setCurrentCompany(await response.json());
    }
  }

  const form = useAppForm({
    defaultValues: companyDefaults(currentCompany),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CompanyFieldsSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch(`/api/companies/${currentCompany.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to save company"));
        return;
      }

      window.location.href = "/companies";
    },
  });

  return (
    <CompanyFormShell title="Edit Company" error={error}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <CompanyDetailSections form={form} fields={companyDetailFields} />
        <FormActions submitLabel="Save Changes" />
      </form>

      <FormSection title="Logo" description="Shown in the document header. PNG, JPG, or SVG. Saved immediately on upload.">
        <LogoUpload companyId={currentCompany.id} currentPath={currentCompany.logoPath} onUploaded={refreshCompany} />
      </FormSection>
      <LocationsSection companyId={currentCompany.id} locations={currentCompany.locations ?? []} onUpdated={refreshCompany} />
      <PaymentMethodsSection
        companyId={currentCompany.id}
        paymentMethods={currentCompany.paymentMethods ?? []}
        onUpdated={refreshCompany}
      />
    </CompanyFormShell>
  );
}
