import { useState } from "react";
import { CompanyDetailSections } from "@/components/companies/CompanyDetailSections";
import { CompanyFormShell, FormActions } from "@/components/companies/CompanyFormLayout";
import { companyDefaults, companyDetailFields } from "@/components/companies/company-form-model";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { CompanyFieldsSchema } from "@/lib/companies.schema";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompanyEditForm({ company }: { company: CompanyWithRelations }) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: companyDefaults(company),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CompanyFieldsSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch(`/api/companies/${company.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to save company"));
        return;
      }

      window.location.href = `/companies/${company.id}`;
    },
  });

  return (
    <CompanyFormShell
      title="Edit Company"
      error={error}
      backHref={`/companies/${company.id}`}
      backLabel="Back to Company"
    >
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <CompanyDetailSections form={form} fields={companyDetailFields} />
        <FormActions submitLabel="Save Changes" cancelHref={`/companies/${company.id}`} />
      </form>
    </CompanyFormShell>
  );
}
