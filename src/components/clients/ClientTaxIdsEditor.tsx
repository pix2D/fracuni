import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  clientFieldValidators,
  clientTaxIdFieldValidators,
  clientTaxIdsDefaults,
} from "@/components/clients/client-form-model";
import type { ClientTaxIdInput } from "@/lib/clients.schema";

function emptyTaxId(): ClientTaxIdInput {
  return { label: "", value: "" };
}

export const ClientTaxIdsEditor = withFieldGroup({
  defaultValues: clientTaxIdsDefaults,
  render: function Render({ group }) {
    function setTaxIds(taxIds: ClientTaxIdInput[]) {
      group.setFieldValue("taxIds", taxIds);
    }

    function addTaxId() {
      setTaxIds([...(group.state.values.taxIds ?? []), emptyTaxId()]);
    }

    function removeTaxId(index: number) {
      setTaxIds((group.state.values.taxIds ?? []).filter((_, itemIndex) => itemIndex !== index));
    }

    return (
      <FormSection
        title="Additional Tax IDs"
        description="Optional extra identifiers (e.g. a company registration number) printed alongside the OIB or VAT number."
        action={
          <Button type="button" variant="outline" size="sm" onClick={addTaxId}>
            Add Tax ID
          </Button>
        }
      >
        <group.AppField name="taxIds" validators={clientFieldValidators.taxIds}>
          {(field) => <FieldError errors={normalizeErrors(field.state.meta.errors)} />}
        </group.AppField>

        <group.Subscribe selector={(state) => state.values.taxIds ?? []}>
          {(taxIds) =>
            taxIds.length === 0 ? (
              <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                No additional tax IDs.
              </p>
            ) : (
              <FieldGroup className="gap-3">
                {taxIds.map((_, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <group.AppField name={`taxIds[${index}].label`} validators={clientTaxIdFieldValidators.label}>
                      {(field) => <field.TextField label="Label" placeholder="e.g. Registration no." />}
                    </group.AppField>
                    <group.AppField name={`taxIds[${index}].value`} validators={clientTaxIdFieldValidators.value}>
                      {(field) => <field.TextField label="Value" />}
                    </group.AppField>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTaxId(index)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </FieldGroup>
            )
          }
        </group.Subscribe>
      </FormSection>
    );
  },
});
