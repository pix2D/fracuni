import { FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  settingsFieldValidators,
  settingsFormDefaults,
} from "@/components/settings/settings-form-model";

export const SettingsDefaultsSection = withFieldGroup({
  defaultValues: settingsFormDefaults,
  render: function Render({ group }) {
    return (
      <FormSection
        title="Tax & Defaults"
        description="System-wide starting values. Payment terms and offer validity can be overridden per client and per document."
      >
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          <group.AppField name="defaultVatRate" validators={settingsFieldValidators.defaultVatRate}>
            {(field) => (
              <field.NumberField
                label="Default VAT Rate (%)"
                min={0}
                max={100}
                step={0.1}
                description="Croatian PDV applied to domestic invoices."
              />
            )}
          </group.AppField>

          <group.AppField name="defaultPaymentTermsDays" validators={settingsFieldValidators.defaultPaymentTermsDays}>
            {(field) => <field.NumberField label="Payment Terms (days)" min={1} description="Default days until an invoice is due." />}
          </group.AppField>

          <group.AppField name="defaultOfferValidityDays" validators={settingsFieldValidators.defaultOfferValidityDays}>
            {(field) => <field.NumberField label="Offer Validity (days)" min={1} description="Default days an offer stays valid." />}
          </group.AppField>
        </FieldGroup>
      </FormSection>
    );
  },
});
