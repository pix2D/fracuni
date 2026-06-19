import { useState } from "react";
import { ClientDetailSections } from "@/components/clients/ClientDetailSections";
import { ClientTaxIdsEditor } from "@/components/clients/ClientTaxIdsEditor";
import { ClientFormShell, FormActions } from "@/components/clients/ClientFormLayout";
import {
  clientDefaultsFromClient,
  clientDetailFields,
  clientTaxIdsFields,
} from "@/components/clients/client-form-model";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { ClientFieldsSchema } from "@/lib/clients.schema";
import type { Client } from "@/lib/clients";

export function ClientEditForm({ client }: { client: Client }) {
  const [error, setError] = useState<string | null>(null);

  const form = useAppForm({
    defaultValues: clientDefaultsFromClient(client),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ClientFieldsSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
    },
    onSubmit: async ({ value }) => {
      setError(null);
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to update client"));
        return;
      }

      window.location.href = "/clients";
    },
  });

  return (
    <ClientFormShell title="Edit Client" error={error}>
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
        <FormActions submitLabel="Save Changes" />
      </form>
    </ClientFormShell>
  );
}
