import { DatePicker } from "@/components/DatePicker";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addTermsToDate,
  invoiceDateDefaults,
  type InvoiceDateFieldsInput,
  type InvoiceSubmitIntent,
} from "@/components/invoices/invoice-form-model";

interface InvoiceDatesSectionProps {
  readOnly: boolean;
}

export const InvoiceDatesSection = withFieldGroup<
  InvoiceDateFieldsInput,
  InvoiceSubmitIntent,
  InvoiceDatesSectionProps
>({
  defaultValues: invoiceDateDefaults,
  render: function Render({ group, readOnly }) {
    return (
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-base font-semibold">Dates</h2>
        <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <group.AppField name="issueDate">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel>Issue Date</FieldLabel>
                <DatePicker
                  value={field.state.value}
                  disabled={readOnly}
                  onChange={(date) => {
                    field.handleChange(date);
                    if (!group.state.values.dueDateManual) {
                      const dueDate = addTermsToDate(date, group.state.values.termsDays);
                      if (dueDate) group.setFieldValue("dueDate", dueDate);
                    }
                  }}
                />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="deliveryDate">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel>Delivery Date</FieldLabel>
                <DatePicker value={field.state.value} disabled={readOnly} onChange={field.handleChange} />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="termsDays">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Payment Terms (days)</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="number"
                  min={0}
                  value={field.state.value != null && Number.isFinite(Number(field.state.value)) ? Number(field.state.value) : ""}
                  disabled={readOnly}
                  aria-invalid={!field.state.meta.isValid}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    const termsDays = event.target.value === "" ? undefined : event.target.valueAsNumber;
                    field.handleChange(termsDays);

                    if (!group.state.values.dueDateManual) {
                      const dueDate = addTermsToDate(group.state.values.issueDate, termsDays);
                      if (dueDate) group.setFieldValue("dueDate", dueDate);
                    }
                  }}
                />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="dueDate">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel>Due Date</FieldLabel>
                <DatePicker
                  value={field.state.value}
                  disabled={readOnly}
                  onChange={(date) => {
                    field.handleChange(date);
                    group.setFieldValue("dueDateManual", true);
                  }}
                />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>
        </FieldGroup>
      </section>
    );
  },
});
