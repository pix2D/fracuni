import { DatePicker } from "@/components/DatePicker";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  addValidityToDate,
  offerDateDefaults,
  type OfferDateFieldsInput,
  type OfferSubmitIntent,
} from "@/components/offers/offer-form-model";

interface OfferDatesSectionProps {
  readOnly: boolean;
}

export const OfferDatesSection = withFieldGroup<
  OfferDateFieldsInput,
  OfferSubmitIntent,
  OfferDatesSectionProps
>({
  defaultValues: offerDateDefaults,
  render: function Render({ group, readOnly }) {
    return (
      <section className="space-y-4 border-t pt-6">
        <h2 className="text-base font-semibold">Dates</h2>
        <FieldGroup className="grid gap-4 sm:grid-cols-3">
          <group.AppField name="offerDate">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel>Datum ponude</FieldLabel>
                <DatePicker
                  value={field.state.value}
                  disabled={readOnly}
                  onChange={(date) => {
                    field.handleChange(date);
                    if (!group.state.values.validUntilManual) {
                      const validUntil = addValidityToDate(date, group.state.values.validityDays);
                      if (validUntil) group.setFieldValue("validUntil", validUntil);
                    }
                  }}
                />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="validityDays">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel htmlFor={field.name}>Validity (days)</FieldLabel>
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
                    const validityDays = event.target.value === "" ? undefined : event.target.valueAsNumber;
                    field.handleChange(validityDays);

                    if (!group.state.values.validUntilManual) {
                      const validUntil = addValidityToDate(group.state.values.offerDate, validityDays);
                      if (validUntil) group.setFieldValue("validUntil", validUntil);
                    }
                  }}
                />
                <FieldError errors={normalizeErrors(field.state.meta.errors)} />
              </Field>
            )}
          </group.AppField>

          <group.AppField name="validUntil">
            {(field) => (
              <Field data-invalid={!field.state.meta.isValid}>
                <FieldLabel>Vrijedi do</FieldLabel>
                <DatePicker
                  value={field.state.value}
                  disabled={readOnly}
                  onChange={(date) => {
                    field.handleChange(date);
                    group.setFieldValue("validUntilManual", true);
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
