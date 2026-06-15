import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, ClientInput, TaxIdInput } from "@/lib/clients";
import { COUNTRIES, isDomestic } from "@/lib/countries";

interface Props {
  client?: Client;
  onSave: (data: ClientInput) => void;
  onCancel: () => void;
}

export function ClientForm({ client, onSave, onCancel }: Props) {
  const [form, setForm] = useState<ClientInput>({
    name: client?.name ?? "",
    country: client?.country ?? "",
    address: client?.address ?? "",
    oib: client?.oib ?? "",
    vatNumber: client?.vatNumber ?? "",
    defaultCurrency: client?.defaultCurrency ?? "",
    defaultPaymentTermsDays: client?.defaultPaymentTermsDays ?? undefined,
    email: client?.email ?? "",
    taxIds: client?.taxIds?.map((t) => ({ label: t.label, value: t.value })) ?? [],
  });

  function update(field: keyof Omit<ClientInput, "taxIds">, value: string | number | null | undefined) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateTaxId(index: number, field: keyof TaxIdInput, value: string) {
    setForm((prev) => {
      const taxIds = [...(prev.taxIds ?? [])];
      taxIds[index] = { ...taxIds[index]!, [field]: value };
      return { ...prev, taxIds };
    });
  }

  function addTaxId() {
    setForm((prev) => ({
      ...prev,
      taxIds: [...(prev.taxIds ?? []), { label: "", value: "" }],
    }));
  }

  function removeTaxId(index: number) {
    setForm((prev) => ({
      ...prev,
      taxIds: (prev.taxIds ?? []).filter((_, i) => i !== index),
    }));
  }

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    onSave(form);
  }

  const isCroatia = isDomestic(form.country);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-name">Name *</Label>
          <Input id="client-name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-country">Country *</Label>
          <Select value={form.country} onValueChange={(v) => update("country", v)}>
            <SelectTrigger id="client-country">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="client-address">Address</Label>
        <Textarea
          id="client-address"
          value={form.address ?? ""}
          onChange={(e) => update("address", e.target.value)}
          rows={3}
          placeholder="Free-text address (displayed on PDFs as-is)"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isCroatia && (
          <div className="space-y-2">
            <Label htmlFor="client-oib">OIB</Label>
            <Input
              id="client-oib"
              value={form.oib ?? ""}
              onChange={(e) => update("oib", e.target.value)}
              maxLength={11}
              placeholder="11-digit OIB"
            />
          </div>
        )}
        {!isCroatia && form.country && (
          <div className="space-y-2">
            <Label htmlFor="client-vat">VAT Number</Label>
            <Input
              id="client-vat"
              value={form.vatNumber ?? ""}
              onChange={(e) => update("vatNumber", e.target.value)}
              placeholder="e.g. DE123456789"
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="client-email">Email</Label>
          <Input
            id="client-email"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="client-currency">Default Currency</Label>
          <Input
            id="client-currency"
            value={form.defaultCurrency ?? ""}
            onChange={(e) => update("defaultCurrency", e.target.value)}
            placeholder="e.g. EUR, USD, GBP"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client-terms">Default Payment Terms (days)</Label>
          <Input
            id="client-terms"
            type="number"
            min={1}
            value={form.defaultPaymentTermsDays ?? ""}
            onChange={(e) => update("defaultPaymentTermsDays", e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Additional Tax IDs</Label>
          <Button type="button" variant="outline" size="sm" onClick={addTaxId}>
            Add Tax ID
          </Button>
        </div>
        {(form.taxIds ?? []).map((taxId, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Label (e.g. Tax ID)"
              value={taxId.label}
              onChange={(e) => updateTaxId(i, "label", e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={taxId.value}
              onChange={(e) => updateTaxId(i, "value", e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => removeTaxId(i)}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {client ? "Save Changes" : "Create Client"}
        </Button>
      </div>
    </form>
  );
}
