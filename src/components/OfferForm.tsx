import { useState } from "react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
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
import { chargesCroatianPdv, determineTaxTreatment } from "@/lib/tax-engine";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";
import type { Offer, OfferInput } from "@/lib/offers";
import { OFFER_STATUS } from "@/lib/documents";

interface Props {
  company: CompanyWithRelations;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
  offer?: Offer;
  onSave: (data: OfferInput) => Promise<void> | void;
  onFinalize?: (data: OfferInput) => Promise<void> | void;
  onCancel: () => void;
}

// On an offer row issue_date carries the offer date and due_date the valid-until
// date, so the form state names them by their offer meaning.
interface FormState {
  clientId: number | null;
  locationId: number | null;
  paymentMethodId: number | null;
  currency: string;
  email: string;
  offerDate: Date | undefined;
  validUntil: Date | undefined;
  validityDays: number | undefined;
  notesHr: string;
  notesEn: string;
  lineItems: LineItemRow[];
  validUntilManual: boolean;
}

function strToDate(value: string | null | undefined): Date | undefined {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

function dateToStr(date: Date | undefined): string | null {
  return date ? format(date, "yyyy-MM-dd") : null;
}

function daysBetween(start: Date | undefined, end: Date | undefined): number | undefined {
  if (!start || !end) return undefined;
  return differenceInCalendarDays(end, start);
}

export function OfferForm({ company, clients, catalog, settings, offer, onSave, onFinalize, onCancel }: Props) {
  const defaultCurrency = (client?: Client): string => {
    const supported = settings.supportedCurrencies;
    if (client?.defaultCurrency && supported.includes(client.defaultCurrency)) {
      return client.defaultCurrency;
    }
    return supported[0] ?? "EUR";
  };

  // Validity cascade: Settings default → Client override → manual on the form.
  const resolveValidity = (client?: Client): number =>
    client?.defaultOfferValidityDays ?? settings.defaultOfferValidityDays;

  const [state, setState] = useState<FormState>(() => {
    if (offer) {
      return {
        clientId: offer.clientId,
        locationId: offer.locationId,
        paymentMethodId: offer.paymentMethodId,
        currency: offer.currency ?? defaultCurrency(),
        email: offer.email ?? "",
        offerDate: strToDate(offer.issueDate),
        validUntil: strToDate(offer.dueDate),
        validityDays:
          daysBetween(strToDate(offer.issueDate), strToDate(offer.dueDate)) ??
          resolveValidity(clients.find((c) => c.id === offer.clientId) ?? undefined),
        notesHr: offer.notesHr ?? "",
        notesEn: offer.notesEn ?? "",
        lineItems: offer.lineItems.map((li) => ({
          descriptionHr: li.descriptionHr ?? "",
          descriptionEn: li.descriptionEn ?? "",
          quantity: li.quantity != null ? String(li.quantity) : "",
          unitPrice: li.unitPrice != null ? String(li.unitPrice) : "",
        })),
        validUntilManual: true,
      };
    }

    const today = new Date();
    const validity = resolveValidity();
    const defaultLocation = company.locations.find((l) => l.isDefault) ?? company.locations[0];
    const defaultPaymentMethod =
      company.paymentMethods.find((p) => p.isDefault) ?? company.paymentMethods[0];

    return {
      clientId: null,
      locationId: defaultLocation?.id ?? null,
      paymentMethodId: defaultPaymentMethod?.id ?? null,
      currency: defaultCurrency(),
      email: "",
      offerDate: today,
      validUntil: addDays(today, validity),
      validityDays: validity,
      notesHr: "",
      notesEn: "",
      lineItems: [{ ...EMPTY_LINE_ITEM }],
      validUntilManual: false,
    };
  });

  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const selectedClient = clients.find((c) => c.id === state.clientId);
  const domestic = isDomestic(selectedClient?.country);
  const taxTreatment = selectedClient
    ? determineTaxTreatment({
        clientType: selectedClient.clientType,
        clientCountry: selectedClient.country,
        clientVatNumber: selectedClient.vatNumber,
      })
    : null;
  const chargeVat = taxTreatment ? chargesCroatianPdv(taxTreatment) : false;
  const currencyCode: CurrencyCode | null = isCurrencyCode(state.currency) ? state.currency : null;

  function handleClientChange(value: string) {
    const id = value ? Number(value) : null;
    const client = clients.find((c) => c.id === id);
    setState((prev) => {
      const validity = resolveValidity(client);
      const next: FormState = {
        ...prev,
        clientId: id,
        currency: client ? defaultCurrency(client) : prev.currency,
        email: client?.email ?? prev.email,
        validityDays: validity,
      };
      if (!prev.validUntilManual && next.offerDate) {
        next.validUntil = addDays(next.offerDate, validity);
      }
      return next;
    });
  }

  function handleOfferDate(date: Date | undefined) {
    setState((prev) => {
      const next: FormState = { ...prev, offerDate: date };
      if (!prev.validUntilManual && date && prev.validityDays != null) {
        next.validUntil = addDays(date, prev.validityDays);
      }
      return next;
    });
  }

  function handleValidityChange(value: string) {
    const validity = value ? Number(value) : undefined;
    setState((prev) => {
      const next: FormState = { ...prev, validityDays: validity };
      if (!prev.validUntilManual && prev.offerDate && validity != null) {
        next.validUntil = addDays(prev.offerDate, validity);
      }
      return next;
    });
  }

  function handleValidUntil(date: Date | undefined) {
    setState((prev) => ({ ...prev, validUntil: date, validUntilManual: true }));
  }

  const totalsItems = state.lineItems.map((li) => ({
    quantity: parseDecimal(li.quantity) ?? 0,
    unitPrice: parseDecimal(li.unitPrice) ?? 0,
  }));
  const totals = currencyCode
    ? computeInvoiceTotals(totalsItems, currencyCode, {
        chargeVat,
        vatRate: settings.defaultVatRate,
      })
    : null;

  function buildPayload(): OfferInput {
    return {
      companyId: company.id,
      clientId: state.clientId,
      locationId: state.locationId,
      paymentMethodId: state.paymentMethodId,
      currency: state.currency || null,
      email: state.email.trim() || null,
      issueDate: dateToStr(state.offerDate),
      dueDate: dateToStr(state.validUntil),
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

  const isDraft = !offer || offer.status === OFFER_STATUS.DRAFT;
  const canFinalize = !!onFinalize && !!offer && isDraft;
  const busy = saving || finalizing;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{offer ? "Edit Offer" : "New Offer"}</h1>
        <Badge variant="secondary">{offer?.status ?? "draft"}</Badge>
      </div>

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
              <Label htmlFor="offer-client">Client</Label>
              <Select value={state.clientId ? String(state.clientId) : ""} onValueChange={handleClientChange}>
                <SelectTrigger id="offer-client">
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
              <Label htmlFor="offer-location">Location</Label>
              <Select
                value={state.locationId ? String(state.locationId) : ""}
                onValueChange={(v) => setState((p) => ({ ...p, locationId: v ? Number(v) : null }))}
              >
                <SelectTrigger id="offer-location">
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
              <Label htmlFor="offer-payment">Payment Method</Label>
              <Select
                value={state.paymentMethodId ? String(state.paymentMethodId) : ""}
                onValueChange={(v) => setState((p) => ({ ...p, paymentMethodId: v ? Number(v) : null }))}
              >
                <SelectTrigger id="offer-payment">
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
              <Label htmlFor="offer-currency">Currency</Label>
              <Select
                value={state.currency}
                onValueChange={(v) => setState((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger id="offer-currency">
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
              <Label htmlFor="offer-email">Email</Label>
              <Input
                id="offer-email"
                type="email"
                value={state.email}
                onChange={(e) => setState((p) => ({ ...p, email: e.target.value }))}
                placeholder="recipient@example.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Datum ponude</Label>
            <DatePicker value={state.offerDate} onChange={handleOfferDate} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-validity">Validity (days)</Label>
            <Input
              id="offer-validity"
              type="number"
              min="0"
              value={state.validityDays ?? ""}
              onChange={(e) => handleValidityChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Vrijedi do</Label>
            <DatePicker value={state.validUntil} onChange={handleValidUntil} />
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
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offer-notes-hr">Notes (HR)</Label>
              <Textarea
                id="offer-notes-hr"
                rows={3}
                value={state.notesHr}
                onChange={(e) => setState((p) => ({ ...p, notesHr: e.target.value }))}
                placeholder="Napomena"
              />
            </div>
            {!domestic && (
              <div className="space-y-2">
                <Label htmlFor="offer-notes-en">Notes (EN)</Label>
                <Textarea
                  id="offer-notes-en"
                  rows={3}
                  value={state.notesEn}
                  onChange={(e) => setState((p) => ({ ...p, notesEn: e.target.value }))}
                  placeholder="Note"
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

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" onClick={handleSubmit} disabled={busy}>
          {saving ? "Saving…" : "Save Draft"}
        </Button>
        {canFinalize && (
          <Button type="button" onClick={handleFinalize} disabled={busy}>
            {finalizing ? "Finalizing…" : "Finalize"}
          </Button>
        )}
      </div>
    </div>
  );
}
