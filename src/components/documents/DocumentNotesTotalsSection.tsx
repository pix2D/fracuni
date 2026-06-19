import { formatMoneyWithCurrency } from "@/lib/currency";
import { withFieldGroup } from "@/components/forms/app-form";
import {
  documentNotesDefaults,
  type DocumentNotesInput,
  type DocumentSubmitIntent,
} from "@/components/documents/document-form-model";
import type { InvoiceTotals } from "@/lib/invoice-totals";

interface DocumentNotesTotalsSectionProps {
  domestic: boolean;
  totals: InvoiceTotals | null;
  vatRate: number;
  readOnly: boolean;
}

export const DocumentNotesTotalsSection = withFieldGroup<
  DocumentNotesInput,
  DocumentSubmitIntent,
  DocumentNotesTotalsSectionProps
>({
  defaultValues: documentNotesDefaults,
  render: function Render({ group, domestic, totals, vatRate, readOnly }) {
    return (
      <section className="grid gap-6 border-t pt-6 md:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <h2 className="text-base font-semibold">Notes</h2>
          <group.AppField name="notesHr">
            {(field) => <field.TextareaField label="Notes (HR)" rows={3} disabled={readOnly} />}
          </group.AppField>
          {!domestic && (
            <group.AppField name="notesEn">
              {(field) => <field.TextareaField label="Notes (EN)" rows={3} disabled={readOnly} />}
            </group.AppField>
          )}
        </div>

        <div className="space-y-2 self-start border border-border p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{totals ? formatMoneyWithCurrency(totals.subtotal) : "-"}</span>
          </div>
          {totals?.pdv && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PDV ({vatRate}%)</span>
              <span className="tabular-nums">{formatMoneyWithCurrency(totals.pdv)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{totals ? formatMoneyWithCurrency(totals.total) : "-"}</span>
          </div>
        </div>
      </section>
    );
  },
});
