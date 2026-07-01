import { useState, useEffect, useCallback } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { InvoiceDocumentActionDialogs } from "@/components/invoices/InvoiceDocumentActionDialogs";
import { InvoiceDocumentActionsMenu } from "@/components/invoices/InvoiceDocumentActionsMenu";
import { useInvoiceDocumentActions } from "@/components/invoices/useInvoiceDocumentActions";
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

  const fetchInvoices = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/invoices?companyId=${company.id}&type=${documentType}`);
    if (res.ok) setInvoices(await res.json());
  }, [company, documentType]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const actions = useInvoiceDocumentActions({
    documentType,
    onChanged: fetchInvoices,
    onDeleted: fetchInvoices,
  });

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

      {actions.error ? (
        <Alert variant="destructive">
          <AlertDescription>{actions.error}</AlertDescription>
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
            onView={actions.openView}
            onEdit={actions.openEdit}
            onSend={actions.openSend}
            onMarkSent={actions.handleMarkSent}
            onMarkPaid={actions.openPay}
            onDuplicate={actions.handleDuplicate}
            onDelete={actions.handleDelete}
            onCreateCreditNote={actions.handleCreateCreditNote}
          />
        )}
      />

      <InvoiceDocumentActionDialogs actions={actions} />
    </div>
  );
}
