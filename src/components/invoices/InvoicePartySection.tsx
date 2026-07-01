import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormSection } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  addTermsToDate,
  clientOptions,
  currencyOptions,
  defaultCurrency,
  invoiceFormDefaults,
  type InvoiceFormValues,
  type InvoiceSubmitIntent,
  locationOptions,
  paymentMethodOptions,
  resolvePaymentTerms,
} from "@/components/invoices/invoice-form-model";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Settings } from "@/lib/settings";

const EMPTY_SELECT_VALUE = "__empty__";

interface InvoicePartySectionProps {
  company: CompanyWithRelations;
  clients: Client[];
  settings: Settings;
  readOnly: boolean;
}

export const InvoicePartySection = withFieldGroup<
  InvoiceFormValues,
  InvoiceSubmitIntent,
  InvoicePartySectionProps
>({
  defaultValues: invoiceFormDefaults,
  render: function Render({ group, company, clients, settings, readOnly }) {
    const clientItems = clientOptions(clients);
    const locationItems = locationOptions(company);
    const paymentMethodItems = paymentMethodOptions(company);
    const currencyItems = currencyOptions(settings);

    return (
      <FormSection
        title="Party and Payment"
        description="Who the document is for and how it will be paid. Picking a client fills in the currency, payment terms, and email below."
      >
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>Company</FieldLabel>
            <div className="flex h-8 items-center border border-input bg-muted/40 px-2.5 text-xs">
              {company.name}
            </div>
            <FieldDescription>Set in the company profile.</FieldDescription>
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
                    const termsDays = resolvePaymentTerms(company, settings, client);

                    group.setFieldValue("clientId", clientId);
                    group.setFieldValue("currency", client ? defaultCurrency(settings, client) : group.state.values.currency);
                    group.setFieldValue("termsDays", termsDays);
                    if (client?.email) group.setFieldValue("email", client.email);

                    if (!group.state.values.dueDateManual) {
                      const dueDate = addTermsToDate(group.state.values.issueDate, termsDays);
                      if (dueDate) group.setFieldValue("dueDate", dueDate);
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
                <FieldDescription>Selecting a client pre-fills currency, payment terms, and email.</FieldDescription>
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
                description="Issuing location — forms part of the document number."
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
                description="Determines which document-number sequence is used."
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
                description="Non-EUR documents capture the HNB exchange rate at finalization."
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
                description="Stored with the document; used and overridable when sending."
              />
            )}
          </group.AppField>
        </FieldGroup>
      </FormSection>
    );
  },
});
