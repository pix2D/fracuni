import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceCatalogForm } from "@/components/service-catalog/ServiceCatalogForm";
import type { CatalogEntry } from "@/lib/service-catalog";
import { PencilSimpleIcon, TrashIcon, PlusIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";

export function ServiceCatalogSection() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CatalogEntry | null>(null);

  const fetchEntries = useCallback(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/service-catalog${params}`);
    if (res.ok) setEntries(await res.json());
  }, [search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function openCreate() {
    setEditingEntry(null);
    setDialogOpen(true);
  }

  function openEdit(entry: CatalogEntry) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  async function handleSaved() {
    setDialogOpen(false);
    setEditingEntry(null);
    await fetchEntries();
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
            <PlusIcon className="size-4" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Reusable line item templates. Descriptions support placeholders:{" "}
          <code className="bg-muted px-1 py-0.5">{"{day}"}</code>,{" "}
          <code className="bg-muted px-1 py-0.5">{"{month}"}</code>,{" "}
          <code className="bg-muted px-1 py-0.5">{"{year}"}</code>{" "}
          — expanded to current date values when selected during document creation.
        </p>

        <InputGroup>
          <InputGroupAddon>
            <MagnifyingGlassIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        {entries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{search ? "No matching entries" : "No catalog entries yet"}</EmptyTitle>
              <EmptyDescription>
                {search ? "Adjust the search term and try again." : "Create reusable line item templates."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description (HR)</TableHead>
                <TableHead>Description (EN)</TableHead>
                <TableHead className="w-20" />
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
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${entry.descriptionHr}`}
                        onClick={() => openEdit(entry)}
                      >
                        <PencilSimpleIcon className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${entry.descriptionHr}`}
                        onClick={() => handleDelete(entry.id)}
                      >
                        <TrashIcon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditingEntry(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Catalog Entry" : "New Catalog Entry"}</DialogTitle>
            </DialogHeader>

            <ServiceCatalogForm
              key={editingEntry?.id ?? "new"}
              entry={editingEntry}
              onSaved={handleSaved}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
