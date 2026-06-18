import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { InvoiceForm } from "@/components/InvoiceForm";
import { SendEmailDialog } from "@/components/SendEmailDialog";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import { DocumentDataTable } from "@/components/documents/DocumentDataTable";
import { InvoiceDocumentActionsMenu } from "@/components/invoices/InvoiceDocumentActionsMenu";
import { DOCUMENT_TYPE, INVOICE_STATUS } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";
import type { Invoice, InvoiceInput } from "@/lib/invoices";

interface Props {
  company: CompanyWithRelations | null;
  clients: Client[];
  catalog: CatalogEntry[];
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
  catalog,
  settings,
  documentType = DOCUMENT_TYPE.INVOICE,
}: Props) {
  const copy = COPY[documentType];
  const isCreditNote = documentType === DOCUMENT_TYPE.CREDIT_NOTE;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Invoice | null>(null);
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

  async function handleSave(data: InvoiceInput) {
    const url = editing ? `/api/invoices/${editing.id}` : "/api/invoices";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to save invoice");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchInvoices();
  }

  async function handleFinalize(data: InvoiceInput) {
    // Persist the in-form edits before finalizing so the assigned Document
    // Number reflects what the user sees. Finalize only runs on a saved draft.
    if (!editing) return;
    const saveRes = await fetch(`/api/invoices/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      setError(err.error || "Failed to save invoice");
      return;
    }

    const res = await fetch(`/api/invoices/${editing.id}/finalize`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to finalize invoice");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchInvoices();
  }

  async function handleDuplicate(id: number) {
    const res = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to duplicate invoice");
      return;
    }
    setError(null);
    await fetchInvoices();
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
    window.location.href = "/credit-notes";
  }

  function openCreate() {
    setEditing(null);
    setError(null);
    setView("form");
  }

  function openEdit(invoice: Invoice) {
    setEditing(invoice);
    setError(null);
    setView("form");
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
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select or create a Company first to start invoicing.
        </CardContent>
      </Card>
    );
  }

  if (view === "form") {
    return (
      <div className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <InvoiceForm
          company={company}
          clients={clients}
          catalog={catalog}
          settings={settings}
          documentType={documentType}
          invoice={editing ?? undefined}
          onSave={handleSave}
          onFinalize={editing ? handleFinalize : undefined}
          onCancel={() => {
            setView("list");
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{copy.heading}</h1>
        <Button onClick={openCreate}>{copy.newLabel}</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

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
