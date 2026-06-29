import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormSection } from "@/components/forms/FormSection";
import { CompanyNumberedSettingForm } from "@/components/companies/CompanyNumberedSettingForm";
import { responseError } from "@/lib/api-response";
import type { CompanyNumberedSettingInput } from "@/lib/companies.schema";
import type { Location } from "@/lib/companies";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";

interface Props {
  companyId: number;
  locations: Location[];
  onUpdated: () => void;
}

export function LocationsSection({ companyId, locations, onUpdated }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingLocation(null);
    setDialogOpen(true);
  }

  function openEdit(location: Location) {
    setEditingLocation(location);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingLocation(null);
  }

  async function handleAdd(data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/companies/${companyId}/locations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to add location"));
    }
    closeDialog();
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
    closeDialog();
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
    <FormSection
      title="Locations"
      description="Issuing locations. The default is pre-selected on new documents and forms part of the document number."
      action={
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Add Location
        </Button>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div>
        {locations.length === 0 ? (
          <Empty className="border border-border">
            <EmptyHeader>
              <EmptyTitle>No locations yet</EmptyTitle>
              <EmptyDescription>Add an issuing location for this company.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-24">Default</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc) => (
                <TableRow key={loc.id}>
                  <TableCell className="font-mono">{loc.number}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{loc.nameHr}</div>
                      {loc.nameEn && <div className="text-muted-foreground">{loc.nameEn}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {loc.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${loc.nameHr}`}
                        onClick={() => openEdit(loc)}
                      >
                        <PencilSimpleIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${loc.nameHr}`}
                        onClick={() => handleDelete(loc.id)}
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
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
          </DialogHeader>

          <LocationForm
            key={editingLocation?.id ?? "new"}
            initial={editingLocation ?? undefined}
            onSave={(data) =>
              editingLocation ? handleUpdate(editingLocation.id, data) : handleAdd(data)
            }
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </FormSection>
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
