import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { InvoiceDatesSection } from "@/components/invoices/InvoiceDatesSection";
import { InvoiceFormActions, InvoiceFormShell, invoiceNoun, invoiceRouteBase } from "@/components/invoices/InvoiceFormLayout";
import { InvoiceHealthStatus } from "@/components/invoices/InvoiceHealthStatus";
import { InvoicePartySection } from "@/components/invoices/InvoicePartySection";
import { DocumentLineItemsSection } from "@/components/documents/DocumentLineItemsSection";
import { DocumentNotesTotalsSection } from "@/components/documents/DocumentNotesTotalsSection";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

function IssueDateHolidayWarning({ issueDate }: { issueDate: Date | undefined }) {
  const [holidaysByYear, setHolidaysByYear] = useState<Record<number, string[]>>({});
  const year = issueDate?.getFullYear();
  const dateKey = issueDate ? format(issueDate, "yyyy-MM-dd") : null;
  const holidays = year ? holidaysByYear[year] : undefined;
  const isHoliday = !!dateKey && !!holidays?.includes(dateKey);

  useEffect(() => {
    if (!year || holidays) return;
    const holidayYear = year;

    let cancelled = false;

    async function fetchHolidays() {
      try {
        const response = await fetch(`/api/holidays?year=${holidayYear}`);
        if (!response.ok) return;

        const data: unknown = await response.json();
        if (
          !data ||
          typeof data !== "object" ||
          !Array.isArray((data as { holidays?: unknown }).holidays)
        ) {
          return;
        }

        const holidayDates = (data as { holidays: unknown[] }).holidays.filter(
          (holiday): holiday is string => typeof holiday === "string",
        );

        if (!cancelled) {
          setHolidaysByYear((current) => ({ ...current, [holidayYear]: holidayDates }));
        }
      } catch {
        // Holidays are advisory only; submission behavior must not depend on this.
      }
    }

    void fetchHolidays();

    return () => {
      cancelled = true;
    };
  }, [year, holidays]);

  if (!isHoliday) return null;

  return (
    <Alert className="border-amber-600/30 bg-amber-500/10 text-amber-800 *:data-[slot=alert-description]:text-amber-800/90 dark:border-amber-500/30 dark:text-amber-300 dark:*:data-[slot=alert-description]:text-amber-300/90">
      <WarningCircleIcon className="size-4" />
      <AlertDescription>The selected issue date is a Croatian public holiday.</AlertDescription>
    </Alert>
  );
}

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
    onSubmit: async ({ value, meta }) => {
      setError(null);
      try {
        const base = invoiceRouteBase(documentType);
        const domestic = isDomesticInvoice(value, clients);
        const response = await fetch("/api/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayloadFromValues(value, documentType, domestic)),
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

        if (meta === "save") {
          window.location.href = `${base}/${invoiceId}/edit`;
          return;
        }

        const finalizeResponse = await fetch(`/api/invoices/${invoiceId}/finalize`, { method: "POST" });
        if (!finalizeResponse.ok) {
          const message = await responseError(
            finalizeResponse,
            `The draft was created, but finalization failed.`,
          );
          window.sessionStorage.setItem(`invoice-form-error:${invoiceId}`, message);
          window.location.href = `${base}/${invoiceId}/edit`;
          return;
        }

        window.location.href = `${base}/${invoiceId}`;
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

  function submitFinalize() {
    submitIntent.current = "finalize";
    setSubmitting("finalize");
    void form.handleSubmit("finalize").catch(() => setSubmitting(null));
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
        <form.Subscribe selector={(state) => state.values.issueDate}>
          {(issueDate) => <IssueDateHolidayWarning issueDate={issueDate} />}
        </form.Subscribe>

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
          canFinalize
          saveLabel="Save Draft"
          finalizeLabel={`Finalize ${invoiceNoun(documentType)}`}
          submitting={submitting}
          onSave={submitSave}
          onFinalize={submitFinalize}
        />
      </form>
    </InvoiceFormShell>
  );
}
