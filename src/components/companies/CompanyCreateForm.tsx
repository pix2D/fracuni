import { useState } from "react";
import { CompanyDetailSections } from "@/components/companies/CompanyDetailSections";
import { CompanySetupEditor, companySetupFields } from "@/components/companies/CompanySetupEditor";
import { CompanyFormShell, FormActions } from "@/components/companies/CompanyFormLayout";
import { companyDetailFields, createCompanyDefaults } from "@/components/companies/company-form-model";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { CreateCompanySchema } from "@/lib/companies.schema";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompanyCreateForm() {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: createCompanyDefaults,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CreateCompanySchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to create company"));
        return;
      }

      const company = (await response.json()) as CompanyWithRelations;
      document.cookie = `companyId=${company.id};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
      window.location.href = `/companies/${company.id}/edit`;
    },
  });

  return (
    <CompanyFormShell title="New Company" error={error}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <CompanyDetailSections form={form} fields={companyDetailFields} />
        <CompanySetupEditor
          form={form}
          fields={companySetupFields}
          name="locations"
          title="Locations"
          description="Issuing locations. The default is pre-selected on new documents and forms part of the document number."
          addLabel="Add Location"
        />
        <CompanySetupEditor
          form={form}
          fields={companySetupFields}
          name="paymentMethods"
          title="Payment Methods"
          description="Each payment method keeps its own document-number sequence. The default is pre-selected on new documents."
          addLabel="Add Payment Method"
        />
        <FormActions submitLabel="Create Company" />
      </form>
    </CompanyFormShell>
  );
}
