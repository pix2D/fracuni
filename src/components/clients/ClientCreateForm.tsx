import { useState } from "react";
import { ClientDetailSections } from "@/components/clients/ClientDetailSections";
import { ClientTaxIdsEditor } from "@/components/clients/ClientTaxIdsEditor";
import { ClientFormShell, FormActions } from "@/components/clients/ClientFormLayout";
import { clientDefaults, clientDetailFields, clientTaxIdsFields } from "@/components/clients/client-form-model";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { CreateClientSchema } from "@/lib/clients.schema";

export function ClientCreateForm() {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: clientDefaults,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CreateClientSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to create client"));
        return;
      }

      window.location.href = "/clients";
    },
  });

  return (
    <ClientFormShell title="New Client" error={error}>
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <ClientDetailSections form={form} fields={clientDetailFields} />
        <ClientTaxIdsEditor form={form} fields={clientTaxIdsFields} />
        <FormActions submitLabel="Create Client" />
      </form>
    </ClientFormShell>
  );
}
