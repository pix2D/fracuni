import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  addValidityToDate,
  clientOptions,
  currencyOptions,
  defaultOfferCurrency,
  locationOptions,
  offerFormDefaults,
  paymentMethodOptions,
  resolveOfferValidity,
  type OfferFormValues,
  type OfferSubmitIntent,
} from "@/components/offers/offer-form-model";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Settings } from "@/lib/settings";

const EMPTY_SELECT_VALUE = "__empty__";

interface OfferPartySectionProps {
  company: CompanyWithRelations;
  clients: Client[];
  settings: Settings;
  readOnly: boolean;
}

export const OfferPartySection = withFieldGroup<
  OfferFormValues,
  OfferSubmitIntent,
  OfferPartySectionProps
>({
  defaultValues: offerFormDefaults,
  render: function Render({ group, company, clients, settings, readOnly }) {
    const clientItems = clientOptions(clients);
    const locationItems = locationOptions(company);
    const paymentMethodItems = paymentMethodOptions(company);
    const currencyItems = currencyOptions(settings);

    return (
      <FormSection
        title="Party and Payment"
        description="Who the offer is for and the proposed payment details. Picking a client fills in the currency and email below."
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Company</FieldLabel>
            <div className="flex h-8 items-center border border-input bg-muted/40 px-2.5 text-xs">
              {company.name}
            </div>
            <FieldDescription>Set by the company selector in the top navigation.</FieldDescription>
          </Field>

          <group.AppField name="clientId">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Client</FieldLabel>
                <Select
                  value={field.state.value || EMPTY_SELECT_VALUE}
                  disabled={readOnly}
                  onValueChange={(value) => {
                    const clientId = value === EMPTY_SELECT_VALUE ? "" : value;
                    const client = clients.find((candidate) => String(candidate.id) === clientId);
                    const validityDays = resolveOfferValidity(settings, client);

                    group.setFieldValue("clientId", clientId);
                    group.setFieldValue("currency", client ? defaultOfferCurrency(settings, client) : group.state.values.currency);
                    group.setFieldValue("validityDays", validityDays);
                    if (client?.email) group.setFieldValue("email", client.email);

                    if (!group.state.values.validUntilManual) {
                      const validUntil = addValidityToDate(group.state.values.offerDate, validityDays);
                      if (validUntil) group.setFieldValue("validUntil", validUntil);
                    }
                  }}
                >
                  <SelectTrigger id={field.name} className="w-full" aria-invalid={!field.state.meta.isValid}>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>No client</SelectItem>
                    {clientItems.map((client) => (
                      <SelectItem key={client.value} value={client.value}>
                        {client.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>Selecting a client pre-fills currency, validity, and email.</FieldDescription>
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="locationId">
            {(field) => (
              <field.SelectField
                label="Location"
                placeholder="Select location"
                emptyLabel="No location"
                options={locationItems}
                disabled={readOnly}
                description="Issuing location — forms part of the offer number."
              />
            )}
          </group.AppField>

          <group.AppField name="paymentMethodId">
            {(field) => (
              <field.SelectField
                label="Payment Method"
                placeholder="Select payment method"
                emptyLabel="No payment method"
                options={paymentMethodItems}
                disabled={readOnly}
              />
            )}
          </group.AppField>

          <group.AppField name="currency">
            {(field) => (
              <field.SelectField
                label="Currency"
                placeholder="Select currency"
                options={currencyItems}
                disabled={readOnly}
              />
            )}
          </group.AppField>

          <group.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email"
                type="email"
                placeholder="recipient@example.com"
                disabled={readOnly}
                description="Stored with the offer; used and overridable when sending."
              />
            )}
          </group.AppField>
        </FieldGroup>
      </FormSection>
    );
  },
});
