import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import type { Location } from "@/lib/companies";

interface Props {
  companyId: number;
  locations: Location[];
  onUpdated: () => void;
}

export function LocationsSection({ companyId, locations, onUpdated }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(data: { number: number; nameHr: string; nameEn: string; isDefault: boolean }) {
    const res = await fetch(`/api/companies/${companyId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error);
      return;
    }
    setAdding(false);
    setError(null);
    onUpdated();
  }

  async function handleUpdate(id: number, data: Partial<{ number: number; nameHr: string; nameEn: string; isDefault: boolean }>) {
    const res = await fetch(`/api/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error);
      return;
    }
    setEditingId(null);
    setError(null);
    onUpdated();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error);
      return;
    }
    setError(null);
    onUpdated();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Locations</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          Add Location
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {locations.map((loc) =>
          editingId === loc.id ? (
            <LocationForm
              key={loc.id}
              initial={loc}
              onSave={(data) => handleUpdate(loc.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={loc.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{loc.number}</span>
                  <span className="text-sm font-medium">{loc.nameHr}</span>
                  {loc.nameEn && <span className="text-sm text-muted-foreground">/ {loc.nameEn}</span>}
                  {loc.isDefault && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(loc.id)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(loc.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {adding && (
        <LocationForm
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
    </div>
  );
}

function LocationForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Location;
  onSave: (data: { number: number; nameHr: string; nameEn: string; isDefault: boolean }) => void;
  onCancel: () => void;
}) {
  const [number, setNumber] = useState(initial?.number ?? 1);
  const [nameHr, setNameHr] = useState(initial?.nameHr ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">Number</Label>
            <Input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name (HR)</Label>
            <Input value={nameHr} onChange={(e) => setNameHr(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Name (EN)</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="flex items-end gap-2 pb-1">
            <div className="flex items-center gap-2">
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <Label className="text-xs">Default</Label>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => onSave({ number, nameHr, nameEn, isDefault })}>
            Save
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
