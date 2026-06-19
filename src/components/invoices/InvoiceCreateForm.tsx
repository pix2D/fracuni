import { useRef, useState } from "react";
import { InvoiceDatesSection } from "@/components/invoices/InvoiceDatesSection";
import { InvoiceFormActions, InvoiceFormShell, invoiceNoun, invoiceRouteBase } from "@/components/invoices/InvoiceFormLayout";
import { InvoiceHealthStatus } from "@/components/invoices/InvoiceHealthStatus";
import { InvoicePartySection } from "@/components/invoices/InvoicePartySection";
import { DocumentLineItemsSection } from "@/components/documents/DocumentLineItemsSection";
import { DocumentNotesTotalsSection } from "@/components/documents/DocumentNotesTotalsSection";
import {
  invoiceCurrencyCode,
  invoiceDateFields,
  invoiceDefaults,
  invoiceFormDefaults,
  invoiceFormFields,
  invoiceLineItemFields,
  invoiceNoteFields,
  invoicePayloadFromValues,
  invoiceTotals,
  isDomesticInvoice,
  validateInvoiceForm,
  type InvoiceDocumentType,
  type InvoiceSubmitIntent,
} from "@/components/invoices/invoice-form-model";
import { useAppForm } from "@/components/forms/app-form";
import { responseEntityId, responseError } from "@/lib/api-response";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
  documentType?: InvoiceDocumentType;
}

const DEFAULT_SUBMIT_INTENT: InvoiceSubmitIntent = "save";

export function InvoiceCreateForm({
  company,
  clients,
  catalog,
  settings,
  documentType = DOCUMENT_TYPE.INVOICE,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<InvoiceSubmitIntent | null>(null);
  const submitIntent = useRef<InvoiceSubmitIntent>(DEFAULT_SUBMIT_INTENT);

  const form = useAppForm({
    defaultValues: invoiceDefaults({ company, clients, settings, documentType }),
    onSubmitMeta: DEFAULT_SUBMIT_INTENT,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateInvoiceForm(value, submitIntent.current, { company, clients, settings }),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSubmitting(null);
    },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        const domestic = isDomesticInvoice(value, clients);
        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayloadFromValues(value, company.id, documentType, domestic)),
        });

        if (!response.ok) {
          setError(await responseError(response, `Failed to create ${invoiceNoun(documentType).toLowerCase()}`));
          return;
        }

        const invoiceId = await responseEntityId(response);
        if (!invoiceId) {
          setError("The draft was created, but the server did not return its ID.");
          return;
        }

        window.location.href = `${invoiceRouteBase(documentType)}/${invoiceId}/edit`;
      } finally {
        setSubmitting(null);
      }
    },
  });

  function submitSave() {
    submitIntent.current = "save";
    setSubmitting("save");
    void form.handleSubmit("save").catch(() => setSubmitting(null));
  }

  return (
    <InvoiceFormShell
      title={`New ${invoiceNoun(documentType)}`}
      documentType={documentType}
      status={INVOICE_STATUS.DRAFT}
      error={error}
      aside={<InvoiceHealthStatus visible />}
    >
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submitSave();
        }}
      >
        <InvoicePartySection
          form={form}
          fields={invoiceFormFields}
          company={company}
          clients={clients}
          settings={settings}
          readOnly={false}
        />
        <InvoiceDatesSection form={form} fields={invoiceDateFields} readOnly={false} />

        <form.Subscribe selector={(state) => state.values}>
          {(values = invoiceFormDefaults) => {
            const domestic = isDomesticInvoice(values, clients);
            const currencyCode = invoiceCurrencyCode(values);
            const totals = invoiceTotals(values, clients, settings, documentType);

            return (
              <>
                <DocumentLineItemsSection
                  form={form}
                  fields={invoiceLineItemFields}
                  domestic={domestic}
                  currencyCode={currencyCode}
                  catalog={catalog}
                  readOnly={false}
                  negativeAmounts={documentType === DOCUMENT_TYPE.CREDIT_NOTE}
                />
                <DocumentNotesTotalsSection
                  form={form}
                  fields={invoiceNoteFields}
                  domestic={domestic}
                  totals={totals}
                  vatRate={settings.defaultVatRate}
                  readOnly={false}
                />
              </>
            );
          }}
        </form.Subscribe>

        <InvoiceFormActions
          documentType={documentType}
          readOnly={false}
          canFinalize={false}
          saveLabel="Save Draft"
          submitting={submitting}
          onSave={submitSave}
        />
      </form>
    </InvoiceFormShell>
  );
}
