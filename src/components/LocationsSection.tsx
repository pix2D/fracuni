import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyNumberedSettingForm } from "@/components/companies/CompanyNumberedSettingForm";
import { responseError } from "@/lib/api-response";
import type { CompanyNumberedSettingInput } from "@/lib/companies.schema";
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

  async function handleAdd(data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/companies/${companyId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to add location"));
    }
    setAdding(false);
    setError(null);
    onUpdated();
  }

  async function handleUpdate(id: number, data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/locations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to update location"));
    }
    setEditingId(null);
    setError(null);
    onUpdated();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await responseError(res, "Failed to delete location"));
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

function LocationForm(props: {
  initial?: Location;
  onSave: (data: CompanyNumberedSettingInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  return (
    <CompanyNumberedSettingForm {...props} />
  );
}
