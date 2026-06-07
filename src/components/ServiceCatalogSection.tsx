import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PencilSimpleIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

interface CatalogEntry {
  id: number;
  descriptionHr: string;
  descriptionEn: string | null;
}

type FormData = {
  descriptionHr: string;
  descriptionEn: string;
};

const EMPTY_FORM: FormData = { descriptionHr: "", descriptionEn: "" };

export function ServiceCatalogSection() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/service-catalog${params}`);
    if (res.ok) setEntries(await res.json());
  }, [search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(entry: CatalogEntry) {
    setEditingId(entry.id);
    setForm({
      descriptionHr: entry.descriptionHr,
      descriptionEn: entry.descriptionEn ?? "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const body = {
      descriptionHr: form.descriptionHr,
      descriptionEn: form.descriptionEn || null,
    };

    const url = editingId
      ? `/api/service-catalog/${editingId}`
      : "/api/service-catalog";

    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to save");
    } else {
      setDialogOpen(false);
      await fetchEntries();
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/service-catalog/${id}`, { method: "DELETE" });
    if (res.ok) await fetchEntries();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Service Catalog</CardTitle>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="mr-1 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Reusable line item templates. Descriptions support placeholders:{" "}
          <code className="rounded bg-muted px-1 py-0.5">{"{day}"}</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5">{"{month}"}</code>,{" "}
          <code className="rounded bg-muted px-1 py-0.5">{"{year}"}</code>{" "}
          — expanded to current date values when selected during document creation.
        </p>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {search ? "No matching entries." : "No catalog entries yet."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description (HR)</TableHead>
                <TableHead>Description (EN)</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-normal">{entry.descriptionHr}</TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">
                    {entry.descriptionEn || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(entry)}>
                        <PencilSimpleIcon className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(entry.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Catalog Entry" : "New Catalog Entry"}</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="descriptionHr">Description (Croatian) *</Label>
                <Textarea
                  id="descriptionHr"
                  value={form.descriptionHr}
                  onChange={(e) => setForm({ ...form, descriptionHr: e.target.value })}
                  placeholder="e.g. Konzultacije za {month}/{year}"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionEn">Description (English)</Label>
                <Textarea
                  id="descriptionEn"
                  value={form.descriptionEn}
                  onChange={(e) => setForm({ ...form, descriptionEn: e.target.value })}
                  placeholder="e.g. Consulting for {month}/{year}"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !form.descriptionHr.trim()}>
                {saving ? "Saving…" : editingId ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
