import { FieldGroup } from "@/components/ui/field";
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
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Client Identity</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <group.AppField name="name" validators={clientFieldValidators.name}>
              {(field) => <field.TextField label="Client Name" />}
            </group.AppField>
            <group.AppField name="clientType" validators={clientFieldValidators.clientType}>
              {(field) => <field.RadioField label="Client Type" options={clientTypeOptions} />}
            </group.AppField>
            <group.AppField name="country" validators={clientFieldValidators.country}>
              {(field) => <field.SelectField label="Country" placeholder="Select country" options={clientCountryOptions} />}
            </group.AppField>
            <group.AppField name="address" validators={clientFieldValidators.address}>
              {(field) => <field.TextareaField label="Address" rows={3} />}
            </group.AppField>
            <group.AppField name="email" validators={clientFieldValidators.email}>
              {(field) => <field.TextField label="Email" type="email" />}
            </group.AppField>
          </FieldGroup>
        </section>

        <group.Subscribe selector={(state) => ({ clientType: state.values.clientType, country: state.values.country })}>
          {({ clientType, country }) => {
            const business = clientType === CLIENT_TYPE.BUSINESS;
            const showOib = business && isDomestic(country);
            const showVat = business && !isDomestic(country) && isEuCountry(country);

            if (!showOib && !showVat) return null;

            return (
              <section className="space-y-4 border-t pt-6">
                <h2 className="text-base font-semibold">Tax Details</h2>
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  {showOib && (
                    <group.AppField name="oib" validators={clientFieldValidators.oib}>
                      {(field) => <field.TextField label="OIB" maxLength={11} />}
                    </group.AppField>
                  )}
                  {showVat && (
                    <group.AppField name="vatNumber" validators={clientFieldValidators.vatNumber}>
                      {(field) => <field.TextField label="VAT Number" />}
                    </group.AppField>
                  )}
                </FieldGroup>
              </section>
            );
          }}
        </group.Subscribe>

        <section className="space-y-4 border-t pt-6">
          <h2 className="text-base font-semibold">Document Defaults</h2>
          <FieldGroup className="grid gap-4 sm:grid-cols-3">
            <group.AppField name="defaultCurrency" validators={clientFieldValidators.defaultCurrency}>
              {(field) => (
                <field.SelectField
                  label="Default Currency"
                  placeholder="Default currency"
                  emptyLabel="No default"
                  options={clientCurrencyOptions}
                />
              )}
            </group.AppField>
            <group.AppField name="defaultPaymentTermsDays" validators={clientFieldValidators.defaultPaymentTermsDays}>
              {(field) => <field.NumberField label="Payment Terms (days)" min={1} />}
            </group.AppField>
            <group.AppField name="defaultOfferValidityDays" validators={clientFieldValidators.defaultOfferValidityDays}>
              {(field) => <field.NumberField label="Offer Validity (days)" min={1} />}
            </group.AppField>
          </FieldGroup>
        </section>
      </>
    );
  },
});
