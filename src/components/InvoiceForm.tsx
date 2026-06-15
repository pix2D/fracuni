import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/DatePicker";
import {
  LineItemsEditor,
  parseDecimal,
  EMPTY_LINE_ITEM,
  type LineItemRow,
} from "@/components/LineItemsEditor";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import { formatMoneyWithCurrency, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { isDomestic } from "@/lib/countries";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";
import type { Invoice, InvoiceInput } from "@/lib/invoices";
import { DOCUMENT_TYPE, INVOICE_STATUS, type DocumentType } from "@/lib/documents";

interface ApiHealth {
  vies: { reachable: boolean };
  hnb: { reachable: boolean };
}

interface AuditEntry {
  id: number;
  description: string;
  createdAt: string;
}

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
  documentType?: DocumentType;
  invoice?: Invoice;
  onSave: (data: InvoiceInput) => Promise<void> | void;
  onFinalize?: (data: InvoiceInput) => Promise<void> | void;
  onCancel: () => void;
}

function HealthDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? "bg-muted-foreground/40" : ok ? "bg-green-500" : "bg-destructive";
  return <span className={`inline-block h-2 w-2 rounded-full ${color}`} aria-hidden="true" />;
}

interface FormState {
  clientId: number | null;
  locationId: number | null;
  paymentMethodId: number | null;
  currency: string;
  email: string;
  issueDate: Date | undefined;
  deliveryDate: Date | undefined;
  dueDate: Date | undefined;
  paymentTermsDays: number | undefined;
  notesHr: string;
  notesEn: string;
  lineItems: LineItemRow[];
  dueDateManual: boolean;
}

function strToDate(value: string | null | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function dateToStr(date: Date | undefined): string | null {
  return date ? format(date, "yyyy-MM-dd") : null;
}

export function InvoiceForm({
  company,
  clients,
  catalog,
  settings,
  documentType = DOCUMENT_TYPE.INVOICE,
  invoice,
  onSave,
  onFinalize,
  onCancel,
}: Props) {
  const noun = documentType === DOCUMENT_TYPE.CREDIT_NOTE ? "Credit Note" : "Invoice";
  const defaultCurrency = (client?: Client): string => {
    const supported = settings.supportedCurrencies;
    if (client?.defaultCurrency && supported.includes(client.defaultCurrency)) {
      return client.defaultCurrency;
    }
    return supported[0] ?? "EUR";
  };

  const resolveTerms = (client?: Client): number =>
    client?.defaultPaymentTermsDays ?? company.defaultPaymentTermsDays ?? settings.defaultPaymentTermsDays;

  const [state, setState] = useState<FormState>(() => {
    if (invoice) {
      return {
        clientId: invoice.clientId,
        locationId: invoice.locationId,
        paymentMethodId: invoice.paymentMethodId,
        currency: invoice.currency ?? defaultCurrency(),
        email: invoice.email ?? "",
        issueDate: strToDate(invoice.issueDate),
        deliveryDate: strToDate(invoice.deliveryDate),
        dueDate: strToDate(invoice.dueDate),
        paymentTermsDays: invoice.paymentTermsDays ?? undefined,
        notesHr: invoice.notesHr ?? "",
        notesEn: invoice.notesEn ?? "",
        lineItems: invoice.lineItems.map((li) => ({
          descriptionHr: li.descriptionHr ?? "",
          descriptionEn: li.descriptionEn ?? "",
          quantity: li.quantity != null ? String(li.quantity) : "",
          unitPrice: li.unitPrice != null ? String(li.unitPrice) : "",
        })),
        dueDateManual: true,
      };
    }

    const today = new Date();
    const terms = resolveTerms();
    const defaultLocation = company.locations.find((l) => l.isDefault) ?? company.locations[0];
    const defaultPaymentMethod =
      company.paymentMethods.find((p) => p.isDefault) ?? company.paymentMethods[0];

    return {
      clientId: null,
      locationId: defaultLocation?.id ?? null,
      paymentMethodId: defaultPaymentMethod?.id ?? null,
      currency: defaultCurrency(),
      email: "",
      issueDate: today,
      deliveryDate: today,
      dueDate: addDays(today, terms),
      paymentTermsDays: terms,
      notesHr: "",
      notesEn: "",
      lineItems: [{ ...EMPTY_LINE_ITEM }],
      dueDateManual: false,
    };
  });

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [health, setHealth] = useState<ApiHealth | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  const status = invoice?.status ?? INVOICE_STATUS.DRAFT;
  const isDraft = status === INVOICE_STATUS.DRAFT;
  const isFinalized = status === INVOICE_STATUS.FINALIZED;
  // Sent and Paid are immutable legal records — the form renders read-only.
  const readOnly = status === INVOICE_STATUS.SENT || status === INVOICE_STATUS.PAID;
  // The audit trail exists only once a document has been finalized.
  const showAuditLog = !!invoice && !isDraft;

  // Load the audit trail for any finalized-or-later document so edits are visible.
  useEffect(() => {
    if (!invoice || isDraft) return;
    let cancelled = false;
    fetch(`/api/invoices/${invoice.id}/audit-log`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: AuditEntry[]) => {
        if (!cancelled) setAuditLog(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setAuditLog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [invoice, isDraft]);

  // API health tells the user up front whether a finalization (which depends on
  // VIES / HNB) is likely to succeed. Fetched once when the form mounts.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiHealth | null) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth({ vies: { reachable: false }, hnb: { reachable: false } });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedClient = clients.find((c) => c.id === state.clientId);
  const domestic = isDomestic(selectedClient?.country);
  const currencyCode: CurrencyCode | null = isCurrencyCode(state.currency) ? state.currency : null;

  function handleClientChange(value: string) {
    const id = value ? Number(value) : null;
    const client = clients.find((c) => c.id === id);
    setState((prev) => {
      const terms = resolveTerms(client);
      const next: FormState = {
        ...prev,
        clientId: id,
        currency: client ? defaultCurrency(client) : prev.currency,
        email: client?.email ?? prev.email,
        paymentTermsDays: terms,
      };
      if (!prev.dueDateManual && next.issueDate) {
        next.dueDate = addDays(next.issueDate, terms);
      }
      return next;
    });
  }

  function handleIssueDate(date: Date | undefined) {
    setState((prev) => {
      const next: FormState = { ...prev, issueDate: date };
      if (!prev.dueDateManual && date && prev.paymentTermsDays != null) {
        next.dueDate = addDays(date, prev.paymentTermsDays);
      }
      return next;
    });
  }

  function handleTermsChange(value: string) {
    const terms = value ? Number(value) : undefined;
    setState((prev) => {
      const next: FormState = { ...prev, paymentTermsDays: terms };
      if (!prev.dueDateManual && prev.issueDate && terms != null) {
        next.dueDate = addDays(prev.issueDate, terms);
      }
      return next;
    });
  }

  function handleDueDate(date: Date | undefined) {
    setState((prev) => ({ ...prev, dueDate: date, dueDateManual: true }));
  }

  const totalsItems = state.lineItems.map((li) => ({
    quantity: parseDecimal(li.quantity) ?? 0,
    unitPrice: parseDecimal(li.unitPrice) ?? 0,
  }));
  const totals = currencyCode
    ? computeInvoiceTotals(totalsItems, currencyCode, {
        domestic,
        vatRate: settings.defaultVatRate,
      })
    : null;

  function buildPayload(): InvoiceInput {
    return {
      type: documentType,
      companyId: company.id,
      clientId: state.clientId,
      locationId: state.locationId,
      paymentMethodId: state.paymentMethodId,
      currency: state.currency || null,
      email: state.email.trim() || null,
      issueDate: dateToStr(state.issueDate),
      deliveryDate: dateToStr(state.deliveryDate),
      dueDate: dateToStr(state.dueDate),
      paymentTermsDays: state.paymentTermsDays ?? null,
      notesHr: state.notesHr.trim() || null,
      notesEn: domestic ? null : state.notesEn.trim() || null,
      lineItems: state.lineItems
        .filter(
          (li) =>
            li.descriptionHr.trim() ||
            li.descriptionEn.trim() ||
            parseDecimal(li.quantity) !== null ||
            parseDecimal(li.unitPrice) !== null,
        )
        .map((li) => ({
          descriptionHr: li.descriptionHr.trim() || null,
          descriptionEn: domestic ? null : li.descriptionEn.trim() || null,
          quantity: parseDecimal(li.quantity),
          unitPrice: parseDecimal(li.unitPrice),
        })),
    };
  }

  async function handleSubmit() {
    setSaving(true);
    try {
      await onSave(buildPayload());
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalize() {
    if (!onFinalize) return;
    setFinalizing(true);
    try {
      await onFinalize(buildPayload());
    } finally {
      setFinalizing(false);
    }
  }

  const canFinalize = !!onFinalize && !!invoice && isDraft;
  const busy = saving || finalizing;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">
            {!invoice ? `New ${noun}` : readOnly ? `View ${noun}` : `Edit ${noun}`}
          </h1>
          {invoice?.documentNumber && (
            <p className="text-sm text-muted-foreground">
              Document Number <span className="font-medium text-foreground">{invoice.documentNumber}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          {/* API health only matters while the document can still be finalized. */}
          {isDraft && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <HealthDot ok={health ? health.vies.reachable : null} />
                VIES
              </span>
              <span className="flex items-center gap-1.5">
                <HealthDot ok={health ? health.hnb.reachable : null} />
                HNB
              </span>
            </div>
          )}
          <Badge variant="secondary">{status}</Badge>
        </div>
      </div>

      {isFinalized && (
        <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm text-blue-700 dark:text-blue-300">
          This {noun.toLowerCase()} can be edited until it is sent. Each change is recorded in the
          audit log and regenerates the PDF.
        </div>
      )}
      {readOnly && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          This {noun.toLowerCase()} is {status} and is now read-only. Sent and paid documents cannot
          be edited.
        </div>
      )}
      {invoice?.originalInvoiceNumber && (
        <div className="text-sm text-muted-foreground">
          Credit Note for Invoice{" "}
          <span className="font-medium text-foreground">{invoice.originalInvoiceNumber}</span>
        </div>
      )}


      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Company</Label>
              <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm">
                {company.name}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-client">Client</Label>
              <Select value={state.clientId ? String(state.clientId) : ""} onValueChange={handleClientChange} disabled={readOnly}>
                <SelectTrigger id="invoice-client">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-location">Location</Label>
              <Select
                value={state.locationId ? String(state.locationId) : ""}
                onValueChange={(v) => setState((p) => ({ ...p, locationId: v ? Number(v) : null }))}
                disabled={readOnly}
              >
                <SelectTrigger id="invoice-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {company.locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.number} — {l.nameHr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-payment">Payment Method</Label>
              <Select
                value={state.paymentMethodId ? String(state.paymentMethodId) : ""}
                onValueChange={(v) => setState((p) => ({ ...p, paymentMethodId: v ? Number(v) : null }))}
                disabled={readOnly}
              >
                <SelectTrigger id="invoice-payment">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  {company.paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={String(pm.id)}>
                      {pm.number} — {pm.nameHr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-currency">Currency</Label>
              <Select
                value={state.currency}
                onValueChange={(v) => setState((p) => ({ ...p, currency: v }))}
                disabled={readOnly}
              >
                <SelectTrigger id="invoice-currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {settings.supportedCurrencies.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice-email">Email</Label>
              <Input
                id="invoice-email"
                type="email"
                value={state.email}
                onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))}
                placeholder="recipient@example.com"
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <DatePicker value={state.issueDate} onChange={handleIssueDate} disabled={readOnly} />
          </div>
          <div className="space-y-2">
            <Label>Delivery Date</Label>
            <DatePicker
              value={state.deliveryDate}
              onChange={(d) => setState((p) => ({ ...p, deliveryDate: d }))}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice-terms">Payment Terms (days)</Label>
            <Input
              id="invoice-terms"
              type="number"
              min="0"
              value={state.paymentTermsDays ?? ""}
              onChange={(e) => handleTermsChange(e.target.value)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <DatePicker value={state.dueDate} onChange={handleDueDate} disabled={readOnly} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <LineItemsEditor
            items={state.lineItems}
            domestic={domestic}
            currencyCode={currencyCode}
            catalog={catalog}
            onChange={(items) => setState((p) => ({ ...p, lineItems: items }))}
            disabled={readOnly}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-notes-hr">Notes (HR)</Label>
              <Textarea
                id="invoice-notes-hr"
                rows={3}
                value={state.notesHr}
                onChange={(e) => setState((p) => ({ ...p, notesHr: e.target.value }))}
                placeholder="Napomena"
                disabled={readOnly}
              />
            </div>
            {!domestic && (
              <div className="space-y-2">
                <Label htmlFor="invoice-notes-en">Notes (EN)</Label>
                <Textarea
                  id="invoice-notes-en"
                  rows={3}
                  value={state.notesEn}
                  onChange={(e) => setState((p) => ({ ...p, notesEn: e.target.value }))}
                  placeholder="Note"
                  disabled={readOnly}
                />
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-md border border-border p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {totals ? formatMoneyWithCurrency(totals.subtotal) : "—"}
              </span>
            </div>
            {totals?.pdv && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PDV ({settings.defaultVatRate}%)</span>
                <span className="tabular-nums">{formatMoneyWithCurrency(totals.pdv)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {totals ? formatMoneyWithCurrency(totals.total) : "—"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {showAuditLog && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <h2 className="text-sm font-semibold">Audit Log</h2>
            {auditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No changes recorded since finalization.
              </p>
            ) : (
              <ul className="space-y-2">
                {auditLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-0.5 border-b border-border pb-2 last:border-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <span className="text-sm">{entry.description}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {entry.createdAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {readOnly ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Close
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={handleSubmit} disabled={busy}>
              {saving ? "Saving…" : isDraft ? "Save Draft" : "Save Changes"}
            </Button>
            {canFinalize && (
              <Button type="button" onClick={handleFinalize} disabled={busy}>
                {finalizing ? "Finalizing…" : "Finalize"}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
