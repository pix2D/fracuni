import { LineItemsEditor } from "@/components/LineItemsEditor";
import { FormCard } from "@/components/forms/FormSection";
import { normalizeErrors } from "@/components/forms/TanStackFields";
import { withFieldGroup } from "@/components/forms/app-form";
import { FieldError } from "@/components/ui/field";
import {
  documentLineItemsDefaults,
  type DocumentLineItemsInput,
  type DocumentSubmitIntent,
} from "@/components/documents/document-form-model";
import type { CurrencyCode } from "@/lib/currency";
import type { CatalogEntry } from "@/lib/service-catalog";

interface DocumentLineItemsSectionProps {
  domestic: boolean;
  currencyCode: CurrencyCode | null;
  catalog: CatalogEntry[];
  readOnly: boolean;
  negativeAmounts?: boolean;
}

export const DocumentLineItemsSection = withFieldGroup<
  DocumentLineItemsInput,
  DocumentSubmitIntent,
  DocumentLineItemsSectionProps
>({
  defaultValues: documentLineItemsDefaults,
  render: function Render({ group, domestic, currencyCode, catalog, readOnly, negativeAmounts = false }) {
    return (
      <FormCard className="space-y-4">
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
      </FormCard>
    );
  },
});
