import { useState } from "react";
import { CompanyDetailSections } from "@/components/companies/CompanyDetailSections";
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
      window.location.href = `/companies/${company.id}`;
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
        <FormActions submitLabel="Create Company" />
      </form>
    </CompanyFormShell>
  );
}
