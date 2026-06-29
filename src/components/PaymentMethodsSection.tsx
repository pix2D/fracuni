import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormSection } from "@/components/forms/FormSection";
import { CompanyNumberedSettingForm } from "@/components/companies/CompanyNumberedSettingForm";
import { responseError } from "@/lib/api-response";
import type { CompanyNumberedSettingInput } from "@/lib/companies.schema";
import type { PaymentMethod } from "@/lib/companies";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";

interface Props {
  companyId: number;
  paymentMethods: PaymentMethod[];
  onUpdated: () => void;
}

export function PaymentMethodsSection({ companyId, paymentMethods, onUpdated }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditingPaymentMethod(null);
    setDialogOpen(true);
  }

  function openEdit(paymentMethod: PaymentMethod) {
    setEditingPaymentMethod(paymentMethod);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingPaymentMethod(null);
  }

  async function handleAdd(data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/companies/${companyId}/payment-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to add payment method"));
    }
    closeDialog();
    setError(null);
    onUpdated();
  }

  async function handleUpdate(id: number, data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/payment-methods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to update payment method"));
    }
    closeDialog();
    setError(null);
    onUpdated();
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError(await responseError(res, "Failed to delete payment method"));
      return;
    }
    setError(null);
    onUpdated();
  }

  return (
    <FormSection
      title="Payment Methods"
      description="Each payment method keeps its own document-number sequence. The default is pre-selected on new documents."
      action={
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <PlusIcon className="size-4" />
          Add Payment Method
        </Button>
      }
    >
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        {paymentMethods.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No payment methods yet.
          </p>
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
              {paymentMethods.map((pm) => (
                <TableRow key={pm.id}>
                  <TableCell className="font-mono">{pm.number}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium">{pm.nameHr}</div>
                      {pm.nameEn && <div className="text-muted-foreground">{pm.nameEn}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {pm.isDefault ? <Badge variant="secondary">Default</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${pm.nameHr}`}
                        onClick={() => openEdit(pm)}
                      >
                        <PencilSimpleIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${pm.nameHr}`}
                        onClick={() => handleDelete(pm.id)}
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
            <DialogTitle>{editingPaymentMethod ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>

          <PaymentMethodForm
            key={editingPaymentMethod?.id ?? "new"}
            initial={editingPaymentMethod ?? undefined}
            onSave={(data) =>
              editingPaymentMethod
                ? handleUpdate(editingPaymentMethod.id, data)
                : handleAdd(data)
            }
            onCancel={closeDialog}
          />
        </DialogContent>
      </Dialog>
    </FormSection>
  );
}

function PaymentMethodForm(props: {
  initial?: PaymentMethod;
  onSave: (data: CompanyNumberedSettingInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  return (
    <CompanyNumberedSettingForm {...props} />
  );
}
