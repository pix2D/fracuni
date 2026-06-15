import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, PlusIcon } from "@phosphor-icons/react";
import { CatalogPicker } from "@/components/CatalogPicker";
import { expandPlaceholders } from "@/lib/placeholders";
import { lineItemAmount, formatMoney, type CurrencyCode } from "@/lib/currency";
import type { CatalogEntry } from "@/lib/service-catalog";

export interface LineItemRow {
  descriptionHr: string;
  descriptionEn: string;
  quantity: string;
  unitPrice: string;
}

export const EMPTY_LINE_ITEM: LineItemRow = {
  descriptionHr: "",
  descriptionEn: "",
  quantity: "1",
  unitPrice: "",
};

export function parseDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (normalized === "") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

interface Props {
  items: LineItemRow[];
  domestic: boolean;
  currencyCode: CurrencyCode | null;
  catalog: CatalogEntry[];
  onChange: (items: LineItemRow[]) => void;
  disabled?: boolean;
}

export function LineItemsEditor({ items, domestic, currencyCode, catalog, onChange, disabled = false }: Props) {
  function updateRow(index: number, patch: Partial<LineItemRow>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...items, { ...EMPTY_LINE_ITEM }]);
  }

  function removeRow(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  function applyCatalog(index: number, entry: CatalogEntry) {
    updateRow(index, {
      descriptionHr: expandPlaceholders(entry.descriptionHr),
      descriptionEn: entry.descriptionEn ? expandPlaceholders(entry.descriptionEn) : "",
    });
  }

  function rowAmount(row: LineItemRow): string {
    if (!currencyCode) return "—";
    const qty = parseDecimal(row.quantity);
    const price = parseDecimal(row.unitPrice);
    if (qty === null || price === null) return "—";
    return formatMoney(lineItemAmount(qty, price, currencyCode));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Line Items</Label>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <PlusIcon className="size-4" />
            Add Line Item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          No line items yet.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row, index) => (
            <div key={index} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                {!disabled && (
                  <div className="flex items-center gap-1">
                    <CatalogPicker entries={catalog} onSelect={(entry) => applyCatalog(index, entry)} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ArrowUpIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      title="Move down"
                    >
                      <ArrowDownIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeRow(index)}
                      title="Remove"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className={domestic ? "space-y-2" : "grid gap-2 sm:grid-cols-2"}>
                <div className="space-y-1">
                  <Label className="text-xs">Description (HR)</Label>
                  <Textarea
                    rows={2}
                    value={row.descriptionHr}
                    onChange={(e) => updateRow(index, { descriptionHr: e.target.value })}
                    placeholder="Opis stavke"
                    disabled={disabled}
                  />
                </div>
                {!domestic && (
                  <div className="space-y-1">
                    <Label className="text-xs">Description (EN)</Label>
                    <Textarea
                      rows={2}
                      value={row.descriptionEn}
                      onChange={(e) => updateRow(index, { descriptionEn: e.target.value })}
                      placeholder="Item description"
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(index, { unitPrice: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Amount</Label>
                  <div className="flex h-9 items-center justify-end rounded-md border border-input bg-muted/40 px-3 text-sm tabular-nums">
                    {rowAmount(row)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
