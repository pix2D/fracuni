import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { InvoiceDocumentActionsMenu } from "@/components/invoices/InvoiceDocumentActionsMenu";
import { responseEntityId } from "@/lib/api-response";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { Settings } from "@/lib/settings";
import type { Invoice } from "@/lib/invoices";

interface Props {
  company: CompanyWithRelations | null;
  clients: Client[];
  settings: Settings;
  // Invoices and Credit Notes share this page; the discriminator switches
  // labels, fetched document type, and type-specific actions.
  documentType?: typeof DOCUMENT_TYPE.INVOICE | typeof DOCUMENT_TYPE.CREDIT_NOTE;
}

const COPY = {
  [DOCUMENT_TYPE.INVOICE]: {
    heading: "Invoices",
    newLabel: "New Invoice",
    empty: "No invoices yet. Create your first Draft to get started.",
  },
  [DOCUMENT_TYPE.CREDIT_NOTE]: {
    heading: "Credit Notes",
    newLabel: "New Credit Note",
    empty: "No credit notes yet. Create one from scratch or from a finalized Invoice.",
  },
} as const;

export function InvoicesPage({
  company,
  clients,
  settings,
  documentType = DOCUMENT_TYPE.INVOICE,
}: Props) {
  const copy = COPY[documentType];
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;
  const basePath = isCreditNote ? "/credit-notes" : "/invoices";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sending, setSending] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/invoices?companyId=${company.id}&type=${documentType}`);
    if (res.ok) setInvoices(await res.json());
  }, [company, documentType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function handleDuplicate(id: number) {
    const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to duplicate invoice");
      return;
    }
    setError(null);
    const duplicateId = await responseEntityId(res);
    if (!duplicateId) {
      setError("The duplicate was created, but the server did not return its ID");
      return;
    }
    window.location.href = `${basePath}/${duplicateId}/edit`;
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to delete invoice");
      return;
    }
    await fetchInvoices();
  }

  async function handleMarkSent(id: number) {
    const res = await fetch(`/api/invoices/${id}/mark-sent`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to mark invoice as sent");
      return;
    }
    setError(null);
    await fetchInvoices();
  }

  // "Create Credit Note" off a Finalized Invoice: the server pre-fills a Draft
  // Credit Note with negative amounts; we send the user to the Credit Notes page
  // to review and finalize it.
  async function handleCreateCreditNote(id: number) {
    const res = await fetch(`/api/invoices/${id}/credit-note`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to create credit note");
      return;
    }
    const creditNoteId = await responseEntityId(res);
    if (!creditNoteId) {
      setError("The credit note was created, but the server did not return its ID");
      return;
    }
    window.location.href = `/credit-notes/${creditNoteId}/edit`;
  }

  function openEdit(invoice: Invoice) {
    setError(null);
    window.location.href = `${basePath}/${invoice.id}/edit`;
  }

  function openSend(invoice: Invoice) {
    setError(null);
    setSending(invoice);
  }

  function openPay(invoice: Invoice) {
    setError(null);
    setPaying(invoice);
  }

  async function handleSent() {
    setSending(null);
    await fetchInvoices();
  }

  async function handlePaid() {
    setPaying(null);
    await fetchInvoices();
  }

  if (!company) {
    return (
      <Empty className="border border-border">
        <EmptyHeader>
          <EmptyTitle>No company selected</EmptyTitle>
          <EmptyDescription>Select or create a company first to start invoicing.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{copy.heading}</h1>
        <Button asChild>
          <a href={`${basePath}/new`}>{copy.newLabel}</a>
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <DocumentDataTable
        documents={invoices}
        clients={clients}
        settings={settings}
        empty={copy.empty}
        documentLabel={{
          singular: isCreditNote ? "credit note" : "invoice",
          plural: isCreditNote ? "credit notes" : "invoices",
        }}
        dateLabel="Issue Date"
        statusOptions={[
          { value: INVOICE_STATUS.DRAFT, label: "Draft" },
          { value: INVOICE_STATUS.FINALIZED, label: "Finalized" },
          { value: INVOICE_STATUS.SENT, label: "Sent" },
          { value: INVOICE_STATUS.PAID, label: "Paid" },
        ]}
        summary={
          isCreditNote
            ? [{ label: "Credited", include: () => true }]
            : [
                {
                  label: "Outstanding",
                  include: (row) =>
                    row.status === INVOICE_STATUS.FINALIZED || row.status === INVOICE_STATUS.SENT,
                },
                { label: "Revenue", include: () => true },
              ]
        }
        showOriginalInvoiceNumber={isCreditNote}
        renderActions={(invoice) => (
          <InvoiceDocumentActionsMenu
            invoice={invoice}
            isCreditNote={isCreditNote}
            onOpen={openEdit}
            onSend={openSend}
            onMarkSent={handleMarkSent}
            onMarkPaid={openPay}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateCreditNote={handleCreateCreditNote}
          />
        )}
      />

      <SendEmailDialog invoice={sending} onClose={() => setSending(null)} onSent={handleSent} />
      <MarkPaidDialog invoice={paying} onClose={() => setPaying(null)} onPaid={handlePaid} />
    </div>
  );
}
