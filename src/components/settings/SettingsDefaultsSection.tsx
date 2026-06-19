import { FieldGroup } from "@/components/ui/field";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  settingsFieldValidators,
  settingsFormDefaults,
} from "@/components/settings/settings-form-model";

export const SettingsDefaultsSection = withFieldGroup({
  defaultValues: settingsFormDefaults,
  render: function Render({ group }) {
    return (
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Tax & Defaults</h2>
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <group.AppField name="defaultVatRate" validators={settingsFieldValidators.defaultVatRate}>
            {(field) => (
              <field.NumberField
                label="Default VAT Rate (%)"
                min={0}
                max={100}
                step={0.1}
              />
            )}
          </group.AppField>

          <group.AppField name="defaultPaymentTermsDays" validators={settingsFieldValidators.defaultPaymentTermsDays}>
            {(field) => <field.NumberField label="Payment Terms (days)" min={1} />}
          </group.AppField>

          <group.AppField name="defaultOfferValidityDays" validators={settingsFieldValidators.defaultOfferValidityDays}>
            {(field) => <field.NumberField label="Offer Validity (days)" min={1} />}
          </group.AppField>
        </FieldGroup>
      </section>
    );
  },
});
