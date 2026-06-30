import { useEffect, useRef, useState } from "react";
import { InvoiceDatesSection } from "@/components/invoices/InvoiceDatesSection";
import {
  InvoiceFormActions,
  InvoiceFormShell,
  InvoiceReadOnlyNotice,
  invoiceNoun,
  invoiceRouteBase,
} from "@/components/invoices/InvoiceFormLayout";
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
import { responseError } from "@/lib/api-response";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Invoice } from "@/lib/invoices";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";

type InvoiceFormDocument = Extract<Invoice, { type: InvoiceDocumentType }>;

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
  invoice: InvoiceFormDocument;
  documentType?: InvoiceDocumentType;
}

const DEFAULT_SUBMIT_INTENT: InvoiceSubmitIntent = "save";

export function InvoiceEditForm({
  company,
  clients,
  catalog,
  settings,
  invoice,
  documentType = DOCUMENT_TYPE.INVOICE,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<InvoiceSubmitIntent | null>(null);
  const submitIntent = useRef<InvoiceSubmitIntent>(DEFAULT_SUBMIT_INTENT);
  const readOnly = invoice.status !== INVOICE_STATUS.DRAFT;
  const title = readOnly ? `View ${invoiceNoun(documentType)}` : `Edit ${invoiceNoun(documentType)}`;

  useEffect(() => {
    const key = `invoice-form-error:${invoice.id}`;
    const stored = window.sessionStorage.getItem(key);
    if (!stored) return;
    window.sessionStorage.removeItem(key);
    setError(stored);
  }, [invoice.id]);

  const form = useAppForm({
    defaultValues: invoiceDefaults({ company, clients, settings, documentType, invoice }),
    onSubmitMeta: DEFAULT_SUBMIT_INTENT,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: ({ value }) => validateInvoiceForm(value, submitIntent.current, { company, clients, settings }),
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSubmitting(null);
    },
    onSubmit: async ({ value, meta }) => {
      setError(null);
      try {
        const base = invoiceRouteBase(documentType);
        const domestic = isDomesticInvoice(value, clients);
        const saveResponse = await fetch(`/api/invoices/${invoice.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayloadFromValues(value, company.id, documentType, domestic)),
        });

        if (!saveResponse.ok) {
          setError(await responseError(saveResponse, `Failed to save ${invoiceNoun(documentType).toLowerCase()}`));
          return;
        }

        if (meta === "save") {
          window.location.href = base;
          return;
        }

        const finalizeResponse = await fetch(`/api/invoices/${invoice.id}/finalize`, { method: "POST" });
        if (!finalizeResponse.ok) {
          setError(await responseError(finalizeResponse, `Failed to finalize ${invoiceNoun(documentType).toLowerCase()}`));
          return;
        }

        window.location.href = `${base}/${invoice.id}`;
      } finally {
        setSubmitting(null);
      }
    },
  });

  function submit(intent: InvoiceSubmitIntent) {
    submitIntent.current = intent;
    setSubmitting(intent);
    void form.handleSubmit(intent).catch(() => setSubmitting(null));
  }

  return (
    <InvoiceFormShell
      title={title}
      documentType={documentType}
      status={invoice.status}
      documentNumber={invoice.documentNumber}
      originalInvoiceNumber={invoice.originalInvoiceNumber}
      error={error}
      aside={<InvoiceHealthStatus visible={!readOnly} />}
    >
      <form
        noValidate
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          submit("save");
        }}
      >
        {readOnly && <InvoiceReadOnlyNotice documentType={documentType} status={invoice.status} />}

        <InvoicePartySection
          form={form}
          fields={invoiceFormFields}
          company={company}
          clients={clients}
          settings={settings}
          readOnly={readOnly}
        />
        <InvoiceDatesSection form={form} fields={invoiceDateFields} readOnly={readOnly} />

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
                  readOnly={readOnly}
                  negativeAmounts={documentType === DOCUMENT_TYPE.CREDIT_NOTE}
                />
                <DocumentNotesTotalsSection
                  form={form}
                  fields={invoiceNoteFields}
                  domestic={domestic}
                  totals={totals}
                  vatRate={settings.defaultVatRate}
                  readOnly={readOnly}
                />
              </>
            );
          }}
        </form.Subscribe>

        <InvoiceFormActions
          documentType={documentType}
          readOnly={readOnly}
          canFinalize={!readOnly}
          saveLabel="Save Draft"
          submitting={submitting}
          onSave={() => submit("save")}
          onFinalize={() => submit("finalize")}
        />
      </form>
    </InvoiceFormShell>
  );
}
