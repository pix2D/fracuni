import { FieldGroup } from "@/components/ui/field";
import { FormSection } from "@/components/forms/FormSection";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  clientCountryOptions,
  clientCurrencyOptions,
  clientDetailDefaults,
  clientFieldValidators,
  clientTypeOptions,
} from "@/components/clients/client-form-model";
import { CLIENT_TYPE } from "@/lib/client-types";
import { isDomestic, isEuCountry } from "@/lib/countries";

export const ClientDetailSections = withFieldGroup({
  defaultValues: clientDetailDefaults,
  render: function Render({ group }) {
    return (
      <>
        <FormSection
          title="Client Identity"
          description="Who you're billing. These details pre-fill onto every new document for this client."
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="name" validators={clientFieldValidators.name}>
              {(field) => <field.TextField label="Client Name" />}
            </group.AppField>
            <group.AppField name="clientType" validators={clientFieldValidators.clientType}>
              {(field) => (
                <field.RadioField
                  label="Client Type"
                  options={clientTypeOptions}
                  description="Drives VAT treatment and which tax identifier is required."
                />
              )}
            </group.AppField>
            <group.AppField name="country" validators={clientFieldValidators.country}>
              {(field) => (
                <field.SelectField
                  label="Country"
                  placeholder="Select country"
                  options={clientCountryOptions}
                  description="Determines domestic, EU, or non-EU tax handling."
                />
              )}
            </group.AppField>
            <group.AppField name="address" validators={clientFieldValidators.address}>
              {(field) => <field.TextareaField label="Address" rows={3} />}
            </group.AppField>
            <group.AppField name="email" validators={clientFieldValidators.email}>
              {(field) => <field.TextField label="Email" type="email" description="Pre-fills the recipient when emailing documents." />}
            </group.AppField>
          </FieldGroup>
        </FormSection>

        <group.Subscribe selector={(state) => ({ clientType: state.values.clientType, country: state.values.country })}>
          {({ clientType, country }) => {
            const business = clientType === CLIENT_TYPE.BUSINESS;
            const showOib = business && isDomestic(country);
            const showVat = business && !isDomestic(country) && isEuCountry(country);

            if (!showOib && !showVat) return null;

            return (
              <FormSection
                title="Tax Details"
                description={
                  showVat
                    ? "A valid EU VAT number (checked via VIES at finalization) means invoices use reverse charge with no Croatian PDV."
                    : "Tax identifier required for this client."
                }
              >
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  {showOib && (
                    <group.AppField name="oib" validators={clientFieldValidators.oib}>
                      {(field) => (
                        <field.TextField
                          label="OIB"
                          maxLength={11}
                          description="11 digits. Required for Croatian business clients."
                        />
                      )}
                    </group.AppField>
                  )}
                  {showVat && (
                    <group.AppField name="vatNumber" validators={clientFieldValidators.vatNumber}>
                      {(field) => (
                        <field.TextField label="VAT Number" description="Leave empty to charge Croatian PDV instead of reverse charge." />
                      )}
                    </group.AppField>
                  )}
                </FieldGroup>
              </FormSection>
            );
          }}
        </group.Subscribe>

        <FormSection
          title="Document Defaults"
          description="Pre-filled on new documents for this client; each document can still override them."
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <group.AppField name="defaultCurrency" validators={clientFieldValidators.defaultCurrency}>
              {(field) => (
                <field.SelectField
                  label="Default Currency"
                  placeholder="Default currency"
                  emptyLabel="No default"
                  options={clientCurrencyOptions}
                  description="Leave unset to use the system default."
                />
              )}
            </group.AppField>
            <group.AppField name="defaultPaymentTermsDays" validators={clientFieldValidators.defaultPaymentTermsDays}>
              {(field) => <field.NumberField label="Payment Terms (days)" min={1} description="Overrides the company default." />}
            </group.AppField>
            <group.AppField name="defaultOfferValidityDays" validators={clientFieldValidators.defaultOfferValidityDays}>
              {(field) => <field.NumberField label="Offer Validity (days)" min={1} description="Overrides the system default." />}
            </group.AppField>
          </FieldGroup>
        </FormSection>
      </>
    );
  },
});
