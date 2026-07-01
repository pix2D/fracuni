import { useState } from "react";
import { responseEntityId, responseError } from "@/lib/api-response";
import type { Invoice } from "@/lib/invoices";
import type { InvoiceDocumentType } from "@/components/invoices/invoice-form-model";
import { invoiceNoun, invoiceRouteBase } from "@/components/invoices/InvoiceFormLayout";

type ActionCallback = () => Promise<void> | void;

interface UseInvoiceDocumentActionsOptions {
  documentType: InvoiceDocumentType;
  onChanged?: ActionCallback;
  onDeleted?: ActionCallback;
}

async function run(callback: ActionCallback | undefined): Promise<void> {
  await callback?.();
}

export function useInvoiceDocumentActions({
  documentType,
  onChanged,
  onDeleted,
}: UseInvoiceDocumentActionsOptions) {
  const [sending, setSending] = useState<Invoice | null>(null);
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const basePath = invoiceRouteBase(documentType);
  const label = invoiceNoun(documentType).toLowerCase();

  function clearError(): void {
    setError(null);
  }

  function openView(invoice: Invoice): void {
    clearError();
    window.location.href = `${basePath}/${invoice.id}`;
  }

  function openEdit(invoice: Invoice): void {
    clearError();
    window.location.href = `${basePath}/${invoice.id}/edit`;
  }

  function openSend(invoice: Invoice): void {
    clearError();
    setSending(invoice);
  }

  function openPay(invoice: Invoice): void {
    clearError();
    setPaying(invoice);
  }

  async function handleDuplicate(id: number): Promise<void> {
    clearError();
    const response = await fetch(`/api/invoices/${id}/duplicate`, { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response, `Failed to duplicate ${label}`));
      return;
    }

    const duplicateId = await responseEntityId(response);
    if (!duplicateId) {
      setError("The duplicate was created, but the server did not return its ID");
      return;
    }

    window.location.href = `${basePath}/${duplicateId}/edit`;
  }

  async function handleDelete(id: number): Promise<void> {
    clearError();
    const response = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await responseError(response, `Failed to delete ${label}`));
      return;
    }

    await run(onDeleted ?? onChanged);
  }

  async function handleMarkSent(id: number): Promise<void> {
    clearError();
    const response = await fetch(`/api/invoices/${id}/mark-sent`, { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response, `Failed to mark ${label} as sent`));
      return;
    }

    await run(onChanged);
  }

  async function handleCreateCreditNote(id: number): Promise<void> {
    clearError();
    const response = await fetch(`/api/invoices/${id}/credit-note`, { method: "POST" });
    if (!response.ok) {
      setError(await responseError(response, "Failed to create credit note"));
      return;
    }

    const creditNoteId = await responseEntityId(response);
    if (!creditNoteId) {
      setError("The credit note was created, but the server did not return its ID");
      return;
    }

    window.location.href = `/credit-notes/${creditNoteId}/edit`;
  }

  async function handleDialogAction(): Promise<void> {
    setSending(null);
    setPaying(null);
    await run(onChanged);
  }

  return {
    error,
    sending,
    paying,
    setError,
    openView,
    openEdit,
    openSend,
    openPay,
    closeSend: () => setSending(null),
    closePay: () => setPaying(null),
    handleSent: handleDialogAction,
    handlePaid: handleDialogAction,
    handleDuplicate,
    handleDelete,
    handleMarkSent,
    handleCreateCreditNote,
  };
}

export type InvoiceDocumentActions = ReturnType<typeof useInvoiceDocumentActions>;
