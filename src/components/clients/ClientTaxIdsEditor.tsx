import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup } from "@/components/ui/field";
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
      <section className="space-y-4 border-t pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Additional Tax IDs</h2>
          <Button type="button" variant="outline" size="sm" onClick={addTaxId}>
            Add Tax ID
          </Button>
        </div>

        <group.AppField name="taxIds" validators={clientFieldValidators.taxIds}>
          {(field) => <FieldError errors={normalizeErrors(field.state.meta.errors)} />}
        </group.AppField>

        <group.Subscribe selector={(state) => state.values.taxIds ?? []}>
          {(taxIds) =>
            taxIds.length > 0 && (
              <FieldGroup className="gap-3">
                {taxIds.map((_, index) => (
                  <div key={index} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <group.AppField name={`taxIds[${index}].label`} validators={clientTaxIdFieldValidators.label}>
                      {(field) => <field.TextField label="Label" placeholder="Tax ID" />}
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
      </section>
    );
  },
});
