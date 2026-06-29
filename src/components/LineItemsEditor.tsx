import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowUpIcon, ArrowDownIcon, TrashIcon, PlusIcon } from "@phosphor-icons/react";
import { CatalogPicker } from "@/components/CatalogPicker";
import { expandPlaceholders } from "@/lib/placeholders";
import { lineItemAmount, formatMoney, type CurrencyCode } from "@/lib/currency";
import { parseDecimalInput } from "@/lib/decimal-input";
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

interface Props {
  items: LineItemRow[];
  domestic: boolean;
  currencyCode: CurrencyCode | null;
  catalog: CatalogEntry[];
  onChange: (items: LineItemRow[]) => void;
  disabled?: boolean;
  negativeAmounts?: boolean;
}

export function LineItemsEditor({
  items,
  domestic,
  currencyCode,
  catalog,
  onChange,
  disabled = false,
  negativeAmounts = false,
}: Props) {
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
    const qty = parseDecimalInput(row.quantity);
    const price = parseDecimalInput(row.unitPrice);
    if (qty === null || price === null) return "—";
    const signedQty = negativeAmounts ? Math.abs(qty) : qty;
    const signedPrice = negativeAmounts ? -Math.abs(price) : price;
    return formatMoney(lineItemAmount(signedQty, signedPrice, currencyCode));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold leading-none">Line Items</h2>
          <p className="max-w-prose text-xs/relaxed text-muted-foreground">
            Amounts are calculated automatically. Use the catalog button on a row to insert a saved template.
          </p>
        </div>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <PlusIcon className="size-4" />
            Add Line Item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          No line items yet. Click “Add Line Item” to start.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((row, index) => (
            <div key={index} className="border border-border p-3">
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
                  <Label htmlFor={`line-item-${index}-description-hr`} className="text-xs">
                    Description (HR)
                  </Label>
                  <Textarea
                    id={`line-item-${index}-description-hr`}
                    rows={2}
                    value={row.descriptionHr}
                    onChange={(e) => updateRow(index, { descriptionHr: e.target.value })}
                    placeholder="Opis stavke"
                    disabled={disabled}
                  />
                </div>
                {!domestic && (
                  <div className="space-y-1">
                    <Label htmlFor={`line-item-${index}-description-en`} className="text-xs">
                      Description (EN)
                    </Label>
                    <Textarea
                      id={`line-item-${index}-description-en`}
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
                  <Label htmlFor={`line-item-${index}-quantity`} className="text-xs">
                    Quantity
                  </Label>
                  <Input
                    id={`line-item-${index}-quantity`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`line-item-${index}-unit-price`} className="text-xs">
                    Unit Price
                  </Label>
                  <Input
                    id={`line-item-${index}-unit-price`}
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
                  <div className="flex h-9 items-center justify-end border border-input bg-muted/40 px-3 text-sm tabular-nums">
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
