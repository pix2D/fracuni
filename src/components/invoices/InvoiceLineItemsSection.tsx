import { LineItemsEditor } from "@/components/LineItemsEditor";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import { FieldError } from "@/components/ui/field";
import {
  invoiceLineItemsDefaults,
  type InvoiceLineItemsInput,
  type InvoiceSubmitIntent,
} from "@/components/invoices/invoice-form-model";
import type { CurrencyCode } from "@/lib/currency";
import type { CatalogEntry } from "@/lib/service-catalog";

interface InvoiceLineItemsSectionProps {
  domestic: boolean;
  currencyCode: CurrencyCode | null;
  catalog: CatalogEntry[];
  readOnly: boolean;
  negativeAmounts: boolean;
}

export const InvoiceLineItemsSection = withFieldGroup<
  InvoiceLineItemsInput,
  InvoiceSubmitIntent,
  InvoiceLineItemsSectionProps
>({
  defaultValues: invoiceLineItemsDefaults,
  render: function Render({ group, domestic, currencyCode, catalog, readOnly, negativeAmounts }) {
    return (
      <section className="space-y-4 border-t pt-6">
        <group.AppField name="lineItems">
          {(field) => <FieldError errors={normalizeErrors(field.state.meta.errors)} />}
        </group.AppField>

        <group.Subscribe selector={(state) => state.values.lineItems}>
          {(lineItems) => (
            <LineItemsEditor
              items={lineItems}
              domestic={domestic}
              currencyCode={currencyCode}
              catalog={catalog}
              onChange={(items) => group.setFieldValue("lineItems", items)}
              disabled={readOnly}
              negativeAmounts={negativeAmounts}
            />
          )}
        </group.Subscribe>
      </section>
    );
  },
});
