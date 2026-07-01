import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvoiceDocumentActionDialogs } from "@/components/invoices/InvoiceDocumentActionDialogs";
import { invoiceNoun, invoiceRouteBase } from "@/components/invoices/InvoiceFormLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { EmailLog } from "@/lib/email";
import type { HnbPreview } from "@/lib/hnb";
import type { Invoice } from "@/lib/invoices";
import type { ViesVerification } from "@/lib/vies-verifications";
import type { InvoiceDocumentType } from "@/components/invoices/invoice-form-model";
import { useInvoiceDocumentActions } from "@/components/invoices/useInvoiceDocumentActions";
import { DOCUMENT_LANGUAGES, parseDocumentLanguage, type DocumentLanguage } from "@/lib/language";

interface Props {
  invoice: Extract<Invoice, { type: InvoiceDocumentType }>;
  documentType: InvoiceDocumentType;
  defaultLang: DocumentLanguage;
  viesRequired: boolean;
  viesVerification: ViesVerification | null;
  emailLogs: EmailLog[];
  previewExchangeRate?: HnbPreview | null;
}

function statusVariant(status: string): "default" | "secondary" | "outline" {
  return status === INVOICE_STATUS.DRAFT ? "secondary" : "default";
}

function FieldRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-[11px] break-all" : "font-medium"}>{value || "-"}</dd>
    </div>
  );
}

function PdfStatus({ invoice }: { invoice: Invoice }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>PDFs</CardTitle>
        <CardDescription>Stored generated artifacts for finalized documents.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <FieldRow label="Croatian" value={invoice.pdfPathHr ? "Generated" : "Not generated"} />
          <FieldRow label="English" value={invoice.pdfPathEn ? "Generated" : "Not generated"} />
          {invoice.pdfHashHr && <FieldRow label="HR hash" value={invoice.pdfHashHr} mono />}
          {invoice.pdfHashEn && <FieldRow label="EN hash" value={invoice.pdfHashEn} mono />}
        </dl>
      </CardContent>
    </Card>
  );
}

function ExchangeStatus({
  invoice,
  previewExchangeRate,
}: {
  invoice: Invoice;
  previewExchangeRate?: HnbPreview | null;
}) {
  const currency = invoice.currency;
  const needsRate = currency != null && currency !== "EUR";
  const previewRate = invoice.exchangeRateText == null ? previewExchangeRate : null;
  const rateText = invoice.exchangeRateText ?? previewRate?.rateText ?? null;
  const issueDate = invoice.issueDate ?? previewRate?.issueDate ?? null;
  const rateDate = invoice.exchangeRateDate ?? previewRate?.effectiveDate ?? null;
  const fallback =
    issueDate != null &&
    rateDate != null &&
    issueDate !== rateDate;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Exchange Rate</CardTitle>
        <CardDescription>
          {previewRate ? "HNB preview rate. Finalization will capture and store it." : "HNB rate captured during finalization."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!currency ? (
          <p className="text-muted-foreground">No currency selected.</p>
        ) : !needsRate ? (
          <p className="text-muted-foreground">Not required for EUR documents.</p>
        ) : rateText == null ? (
          <p className="text-muted-foreground">Preview rate unavailable. Finalization will try again.</p>
        ) : (
          <dl className="space-y-2">
            <FieldRow label="Rate" value={rateText ? `1 EUR = ${rateText} ${currency}` : "-"} />
            <FieldRow label="Issue date" value={issueDate} />
            <FieldRow label="Rate date" value={rateDate} />
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Source</dt>
              <dd>
                <Badge variant={fallback ? "outline" : "secondary"}>
                  {fallback ? "Previous available date" : "Issue date"}
                </Badge>
              </dd>
            </div>
            {previewRate && <FieldRow label="Storage" value="Preview only" />}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function ViesStatus({
  required,
  verification,
  invoice,
}: {
  required: boolean;
  verification: ViesVerification | null;
  invoice: Invoice;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>VIES</CardTitle>
        <CardDescription>Stored VAT verification proof for reverse-charge documents.</CardDescription>
      </CardHeader>
      <CardContent>
        {verification ? (
          <dl className="space-y-2">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={verification.valid ? "secondary" : "destructive"}>
                  {verification.valid ? "Valid" : "Invalid"}
                </Badge>
              </dd>
            </div>
            <FieldRow label="VAT" value={`${verification.countryCode}${verification.vatNumber}`} />
            <FieldRow label="Request date" value={verification.requestDate} />
            <FieldRow label="Name" value={verification.name} />
            <FieldRow label="Address" value={verification.address} />
          </dl>
        ) : required ? (
          <p className="text-muted-foreground">
            {invoice.status === INVOICE_STATUS.DRAFT
              ? "Will run during finalization."
              : "No stored verification found."}
          </p>
        ) : (
          <p className="text-muted-foreground">Not required for this document.</p>
        )}
      </CardContent>
    </Card>
  );
}

function EmailStatus({ invoice, logs }: { invoice: Invoice; logs: EmailLog[] }) {
  const successful = logs.find((log) => log.status === "sent");
  const failed = logs.find((log) => log.status === "error");
  const manuallySent =
    !successful && (invoice.status === INVOICE_STATUS.SENT || invoice.status === INVOICE_STATUS.PAID);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Email</CardTitle>
        <CardDescription>Postmark delivery state and recent delivery attempts.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          {successful ? (
            <>
              <FieldRow label="Status" value="Sent via Postmark" />
              <FieldRow label="Recipient" value={successful.recipient} />
              <FieldRow label="Sent at" value={successful.createdAt} />
              <FieldRow label="Message ID" value={successful.postmarkMessageId} mono />
            </>
          ) : manuallySent ? (
            <FieldRow label="Status" value="Marked sent manually" />
          ) : invoice.status === INVOICE_STATUS.DRAFT ? (
            <FieldRow label="Status" value="Not available for drafts" />
          ) : (
            <FieldRow label="Status" value="Not sent yet" />
          )}
          {failed && (
            <>
              <FieldRow label="Last error" value={failed.errorMessage} />
              <FieldRow label="Error at" value={failed.createdAt} />
            </>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}

export function InvoiceView({
  invoice,
  documentType,
  defaultLang,
  viesRequired,
  viesVerification,
  emailLogs,
  previewExchangeRate,
}: Props) {
  const currentInvoice = invoice;
  const [lang, setLang] = useState<DocumentLanguage>(defaultLang);
  const base = invoiceRouteBase(documentType);
  const label = invoiceNoun(documentType);
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;
  const isDraft = currentInvoice.status === INVOICE_STATUS.DRAFT;
  const isFinalized = currentInvoice.status === INVOICE_STATUS.FINALIZED;
  const isSent = currentInvoice.status === INVOICE_STATUS.SENT;
  const actions = useInvoiceDocumentActions({
    documentType,
    onChanged: () => window.location.reload(),
    onDeleted: () => {
      window.location.href = base;
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">View {label}</h1>
          <p className="text-sm text-muted-foreground">
            Document Number{" "}
            <span className="font-medium text-foreground">{currentInvoice.documentNumber ?? "Draft"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={statusVariant(currentInvoice.status)}>{currentInvoice.status}</Badge>
          {isDraft && (
            <Button asChild variant="secondary">
              <a href={`${base}/${currentInvoice.id}/edit`}>Edit Draft</a>
            </Button>
          )}
          {isFinalized && (
            <>
              <Button type="button" onClick={() => actions.openSend(currentInvoice)}>
                Send Email
              </Button>
              <Button type="button" variant="secondary" onClick={() => actions.handleMarkSent(currentInvoice.id)}>
                Mark Sent
              </Button>
            </>
          )}
          {isSent && (
            <Button type="button" onClick={() => actions.openPay(currentInvoice)}>
              Mark as Paid
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => actions.handleDuplicate(currentInvoice.id)}>
            Duplicate
          </Button>
          {!isCreditNote && !isDraft && (
            <Button type="button" variant="outline" onClick={() => actions.handleCreateCreditNote(currentInvoice.id)}>
              Credit Note
            </Button>
          )}
          {isDraft && (
            <Button type="button" variant="destructive" onClick={() => actions.handleDelete(currentInvoice.id)}>
              Delete
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={base}>Back to {label}s</a>
          </Button>
        </div>
      </div>

      {actions.error ? (
        <Alert variant="destructive">
          <AlertDescription>{actions.error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <Tabs
            value={lang}
            onValueChange={(value) => {
              const nextLang = parseDocumentLanguage(value);
              if (nextLang) setLang(nextLang);
            }}
          >
            <TabsList aria-label="Preview language">
              {DOCUMENT_LANGUAGES.map((documentLang) => (
                <TabsTrigger key={documentLang} value={documentLang}>
                  {documentLang.toUpperCase()}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <iframe
            key={lang}
            title={`${label} preview`}
            src={`/api/invoices/${currentInvoice.id}/preview?lang=${lang}`}
            className="h-[calc(100vh-13rem)] min-h-[760px] w-full border border-border bg-white"
          />
        </div>

        <aside className="space-y-4">
          <ExchangeStatus invoice={currentInvoice} previewExchangeRate={previewExchangeRate} />
          <ViesStatus required={viesRequired} verification={viesVerification} invoice={currentInvoice} />
          <EmailStatus invoice={currentInvoice} logs={emailLogs} />
          <PdfStatus invoice={currentInvoice} />
        </aside>
      </div>

      <InvoiceDocumentActionDialogs actions={actions} />
    </div>
  );
}
