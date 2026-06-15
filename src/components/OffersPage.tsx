import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OfferForm } from "@/components/OfferForm";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import {
  formatMoneyWithCurrency,
  isCurrencyCode,
  sumAmounts,
  toSmallestUnit,
  type Money,
} from "@/lib/currency";
import { isDomestic } from "@/lib/countries";
import { OFFER_STATUS, type OfferStatus } from "@/lib/documents";
import type { Client } from "@/lib/clients";
import type { CompanyWithRelations } from "@/lib/companies";
import type { CatalogEntry } from "@/lib/service-catalog";
import type { Settings } from "@/lib/settings";
import type { Offer, OfferInput } from "@/lib/offers";

interface Props {
  company: CompanyWithRelations | null;
  clients: Client[];
  catalog: CatalogEntry[];
  settings: Settings;
}

type SortKey = "number" | "client" | "date" | "amount" | "status";
type StatusFilter = "all" | OfferStatus;

export function OffersPage({ company, clients, catalog, settings }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  });

  const fetchOffers = useCallback(async () => {
    if (!company) return;
    const res = await fetch(`/api/offers?companyId=${company.id}`);
    if (res.ok) setOffers(await res.json());
  }, [company]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const clientName = useCallback(
    (id: number | null): string => {
      if (id === null) return "—";
      return clients.find((c) => c.id === id)?.name ?? "—";
    },
    [clients],
  );

  // The Money total of an offer, or null when its currency is unset/unsupported.
  const offerMoney = useCallback(
    (offer: Offer): Money | null => {
      if (!offer.currency || !isCurrencyCode(offer.currency)) return null;
      const domestic = isDomestic(clients.find((c) => c.id === offer.clientId)?.country);
      return computeInvoiceTotals(
        offer.lineItems.map((li) => ({ quantity: li.quantity ?? 0, unitPrice: li.unitPrice ?? 0 })),
        offer.currency,
        { domestic, vatRate: settings.defaultVatRate },
      ).total;
    },
    [clients, settings.defaultVatRate],
  );

  const offerNumber = (offer: Offer): string =>
    offer.documentNumber ? `#${offer.documentNumber}` : "—";

  // Filter (search + status), then sort. All client-side over the company's set.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = offers.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (!term) return true;
      return (
        clientName(o.clientId).toLowerCase().includes(term) ||
        offerNumber(o).toLowerCase().includes(term)
      );
    });

    const dir = sort.dir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      switch (sort.key) {
        case "number":
          return dir * (Number(a.documentNumber ?? 0) - Number(b.documentNumber ?? 0));
        case "client":
          return dir * clientName(a.clientId).localeCompare(clientName(b.clientId));
        case "amount": {
          const am = offerMoney(a);
          const bm = offerMoney(b);
          return dir * ((am ? toSmallestUnit(am) : 0) - (bm ? toSmallestUnit(bm) : 0));
        }
        case "status":
          return dir * a.status.localeCompare(b.status);
        case "date":
        default:
          return dir * (a.issueDate ?? "").localeCompare(b.issueDate ?? "");
      }
    });
    return rows;
  }, [offers, search, statusFilter, sort, clientName, offerMoney]);

  // Summary bar: total of the current filter, grouped by currency (offers may mix).
  const summary = useMemo(() => {
    const byCurrency = new Map<string, Money[]>();
    for (const offer of visible) {
      const money = offerMoney(offer);
      if (!money || !offer.currency) continue;
      const list = byCurrency.get(offer.currency) ?? [];
      list.push(money);
      byCurrency.set(offer.currency, list);
    }
    return [...byCurrency.values()].map((amounts) => formatMoneyWithCurrency(sumAmounts(amounts)));
  }, [visible, offerMoney]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  }

  async function handleSave(data: OfferInput) {
    const url = editing ? `/api/offers/${editing.id}` : "/api/offers";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to save offer");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchOffers();
  }

  async function handleFinalize(data: OfferInput) {
    if (!editing) return;
    const saveRes = await fetch(`/api/offers/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}));
      setError(err.error || "Failed to save offer");
      return;
    }

    const res = await fetch(`/api/offers/${editing.id}/finalize`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to finalize offer");
      return;
    }
    setError(null);
    setView("list");
    setEditing(null);
    await fetchOffers();
  }

  async function handleStatus(offer: Offer, status: OfferStatus) {
    const res = await fetch(`/api/offers/${offer.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to update offer status");
      return;
    }
    setError(null);
    await fetchOffers();
  }

  async function handleConvert(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/convert`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to convert offer");
      return;
    }
    // The new Draft Invoice lives on the Invoices page.
    window.location.href = "/invoices";
  }

  async function handleDuplicate(offer: Offer) {
    const res = await fetch(`/api/offers/${offer.id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to duplicate offer");
      return;
    }
    setError(null);
    await fetchOffers();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Failed to delete offer");
      return;
    }
    await fetchOffers();
  }

  function openCreate() {
    setEditing(null);
    setError(null);
    setView("form");
  }

  function openEdit(offer: Offer) {
    setEditing(offer);
    setError(null);
    setView("form");
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Select or create a Company first to start making offers.
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
        <OfferForm
          company={company}
          clients={clients}
          catalog={catalog}
          settings={settings}
          offer={editing ?? undefined}
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
        <h1 className="text-2xl font-semibold">Offers</h1>
        <Button onClick={openCreate}>New Offer</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search by client or number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={OFFER_STATUS.DRAFT}>Draft</SelectItem>
            <SelectItem value={OFFER_STATUS.FINALIZED}>Finalized</SelectItem>
            <SelectItem value={OFFER_STATUS.ACCEPTED}>Accepted</SelectItem>
            <SelectItem value={OFFER_STATUS.REJECTED}>Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {visible.length} offer{visible.length === 1 ? "" : "s"}
          {summary.length > 0 && <> · {summary.join(" · ")}</>}
        </div>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No offers match. Create your first Draft to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead label="Number" sortKey="number" sort={sort} onSort={toggleSort} />
                <SortableHead label="Client" sortKey="client" sort={sort} onSort={toggleSort} />
                <SortableHead label="Datum ponude" sortKey="date" sort={sort} onSort={toggleSort} />
                <SortableHead label="Amount" sortKey="amount" sort={sort} onSort={toggleSort} />
                <TableHead>Currency</TableHead>
                <SortableHead label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
                <TableHead className="w-72" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((offer) => {
                const money = offerMoney(offer);
                return (
                  <TableRow key={offer.id}>
                    <TableCell className="text-muted-foreground">{offerNumber(offer)}</TableCell>
                    <TableCell className="font-medium">{clientName(offer.clientId)}</TableCell>
                    <TableCell>{offer.issueDate ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">
                      {money ? formatMoneyWithCurrency(money) : "—"}
                    </TableCell>
                    <TableCell>{offer.currency ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={offer.status === OFFER_STATUS.DRAFT ? "secondary" : "default"}>
                        {offer.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(offer)}>
                          Edit
                        </Button>
                        {offer.status === OFFER_STATUS.FINALIZED && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleStatus(offer, OFFER_STATUS.ACCEPTED)}>
                              Accept
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatus(offer, OFFER_STATUS.REJECTED)}>
                              Reject
                            </Button>
                          </>
                        )}
                        {offer.status === OFFER_STATUS.REJECTED && (
                          <Button variant="ghost" size="sm" onClick={() => handleStatus(offer, OFFER_STATUS.FINALIZED)}>
                            Reopen
                          </Button>
                        )}
                        {offer.status === OFFER_STATUS.ACCEPTED && (
                          <Button variant="ghost" size="sm" onClick={() => handleConvert(offer)}>
                            Convert to Invoice
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(offer)}>
                          Duplicate
                        </Button>
                        {offer.status === OFFER_STATUS.DRAFT && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(offer.id)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <TableHead>
      <button
        type="button"
        className="flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(sortKey)}
      >
        {label}
        {active && <span aria-hidden="true">{sort.dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </TableHead>
  );
}
