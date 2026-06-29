import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { useAppForm } from "@/components/forms/app-form";
import {
  serviceCatalogDefaults,
  serviceCatalogFieldValidators,
  serviceCatalogFormFields,
  serviceCatalogPayloadFromValues,
} from "@/components/service-catalog/service-catalog-form-model";
import { responseError } from "@/lib/api-response";
import { CatalogEntryFieldsSchema } from "@/lib/service-catalog.schema";
import type { CatalogEntry } from "@/lib/service-catalog";

interface ServiceCatalogFormProps {
  entry: CatalogEntry | null;
  onSaved: () => Promise<void> | void;
}

export function ServiceCatalogForm({ entry, onSaved }: ServiceCatalogFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const form = useAppForm({
    defaultValues: serviceCatalogDefaults(entry),
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: CatalogEntryFieldsSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSaving(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const response = await fetch(entry ? `/api/service-catalog/${entry.id}` : "/api/service-catalog", {
          method: entry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serviceCatalogPayloadFromValues(value)),
        });

        if (!response.ok) {
          setError(await responseError(response, "Failed to save catalog entry"));
          return;
        }

        await onSaved();
      } finally {
        setSaving(false);
      }
    },
  });

  function submitEntry() {
    setSaving(true);
    void form.handleSubmit().catch(() => setSaving(false));
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submitEntry();
      }}
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup>
        <form.AppField
          name={serviceCatalogFormFields.descriptionHr}
          validators={serviceCatalogFieldValidators.descriptionHr}
        >
          {(field) => (
            <field.TextareaField
              label="Description (Croatian)"
              placeholder="e.g. Konzultacije za {month}/{year}"
              rows={3}
              description="Placeholders {day}, {month}, {year} expand to the current date when added to a document."
            />
          )}
        </form.AppField>

        <form.AppField
          name={serviceCatalogFormFields.descriptionEn}
          validators={serviceCatalogFieldValidators.descriptionEn}
        >
          {(field) => (
            <field.TextareaField
              label="Description (English)"
              placeholder="e.g. Consulting for {month}/{year}"
              rows={3}
              description="Optional. Used on documents for foreign clients."
            />
          )}
        </form.AppField>
      </FieldGroup>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : entry ? "Update" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
}
