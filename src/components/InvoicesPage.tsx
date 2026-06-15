import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InvoiceForm } from "@/components/InvoiceForm";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { formatMoneyWithCurrency, isCurrencyCode } from "@/lib/currency";
import { isDomestic } from "@/lib/countries";
import { INVOICE_STATUS } from "@/lib/documents";
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
}

export function InvoicesPage({ company, clients, catalog, settings }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/invoices?companyId=${company.id}&type=invoice`);
    if (res.ok) setInvoices(await res.json());
  }, [company]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  function clientName(id: number | null): string {
    if (id === null) return "—";
    return clients.find((c) => c.id === id)?.name ?? "—";
  }

  function invoiceTotal(invoice: Invoice): string {
    if (!invoice.currency || !isCurrencyCode(invoice.currency)) return "—";
    const domestic = isDomestic(clients.find((c) => c.id === invoice.clientId)?.country);
    const totals = computeInvoiceTotals(
      invoice.lineItems.map((li) => ({ quantity: li.quantity ?? 0, unitPrice: li.unitPrice ?? 0 })),
      invoice.currency,
      { domestic, vatRate: settings.defaultVatRate },
    );
    return formatMoneyWithCurrency(totals.total);
  }

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

  async function handleDelete(id: number) {
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to delete invoice");
      return;
    }
    await fetchInvoices();
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
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <Button onClick={openCreate}>New Invoice</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No invoices yet. Create your first Draft to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-muted-foreground">
                    {invoice.documentNumber ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{clientName(invoice.clientId)}</TableCell>
                  <TableCell>{invoice.issueDate ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{invoiceTotal(invoice)}</TableCell>
                  <TableCell>
                    <Badge variant={invoice.status === INVOICE_STATUS.DRAFT ? "secondary" : "default"}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(invoice)}>
                        Edit
                      </Button>
                      {invoice.status === INVOICE_STATUS.DRAFT && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice.id)}>
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
