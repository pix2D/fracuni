import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { EmailLog } from "@/lib/email";
import type { HnbPreview } from "@/lib/hnb";
import type { Invoice } from "@/lib/invoices";
import type { ViesVerification } from "@/lib/vies-verifications";
import type { InvoiceDocumentType } from "@/components/invoices/invoice-form-model";
import type { PdfLang } from "@/lib/pdf-document";

interface Props {
  invoice: Extract<Invoice, { type: InvoiceDocumentType }>;
  documentType: InvoiceDocumentType;
  defaultLang: PdfLang;
  viesRequired: boolean;
  viesVerification: ViesVerification | null;
  emailLogs: EmailLog[];
  previewExchangeRate?: HnbPreview | null;
}

function routeBase(documentType: InvoiceDocumentType): "/invoices" | "/credit-notes" {
  return documentType === DOCUMENT_TYPE.CREDIT_NOTE ? "/credit-notes" : "/invoices";
}

function noun(documentType: InvoiceDocumentType): "Invoice" | "Credit Note" {
  return documentType === DOCUMENT_TYPE.CREDIT_NOTE ? "Credit Note" : "Invoice";
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
  const previewRate = invoice.exchangeRate == null ? previewExchangeRate : null;
  const rate = invoice.exchangeRate ?? previewRate?.rate ?? null;
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
        ) : rate == null ? (
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
  const [lang, setLang] = useState<PdfLang>(defaultLang);
  const base = routeBase(documentType);
  const label = noun(documentType);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">View {label}</h1>
          <p className="text-sm text-muted-foreground">
            Document Number{" "}
            <span className="font-medium text-foreground">{invoice.documentNumber ?? "Draft"}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant={statusVariant(invoice.status)}>{invoice.status}</Badge>
          {invoice.status === INVOICE_STATUS.DRAFT && (
            <Button asChild variant="secondary">
              <a href={`${base}/${invoice.id}/edit`}>Edit Draft</a>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={base}>Back to {label}s</a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-3">
          <Tabs value={lang} onValueChange={(value) => setLang(value as PdfLang)}>
            <TabsList aria-label="Preview language">
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>
          </Tabs>
          <iframe
            key={lang}
            title={`${label} preview`}
            src={`/api/invoices/${invoice.id}/preview?lang=${lang}`}
            className="h-[calc(100vh-13rem)] min-h-[760px] w-full border border-border bg-white"
          />
        </div>

        <aside className="space-y-4">
          <ExchangeStatus invoice={invoice} previewExchangeRate={previewExchangeRate} />
          <ViesStatus required={viesRequired} verification={viesVerification} invoice={invoice} />
          <EmailStatus invoice={invoice} logs={emailLogs} />
          <PdfStatus invoice={invoice} />
        </aside>
      </div>
    </div>
  );
}
