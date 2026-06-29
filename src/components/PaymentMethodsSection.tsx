import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormSection } from "@/components/forms/FormSection";
import { CompanyNumberedSettingForm } from "@/components/companies/CompanyNumberedSettingForm";
import { responseError } from "@/lib/api-response";
import type { CompanyNumberedSettingInput } from "@/lib/companies.schema";
import type { PaymentMethod } from "@/lib/companies";

interface Props {
  companyId: number;
  paymentMethods: PaymentMethod[];
  onUpdated: () => void;
}

export function PaymentMethodsSection({ companyId, paymentMethods, onUpdated }: Props) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(data: CompanyNumberedSettingInput) {
    const res = await fetch(`/api/companies/${companyId}/payment-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error(await responseError(res, "Failed to add payment method"));
    }
    setAdding(false);
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
    setEditingId(null);
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
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          Add Payment Method
        </Button>
      }
    >
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {paymentMethods.length === 0 && !adding && (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No payment methods yet.
          </p>
        )}
        {paymentMethods.map((pm) =>
          editingId === pm.id ? (
            <PaymentMethodForm
              key={pm.id}
              initial={pm}
              onSave={(data) => handleUpdate(pm.id, data)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <Card key={pm.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">{pm.number}</span>
                  <span className="text-sm font-medium">{pm.nameHr}</span>
                  {pm.nameEn && <span className="text-sm text-muted-foreground">/ {pm.nameEn}</span>}
                  {pm.isDefault && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(pm.id)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(pm.id)}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {adding && (
        <PaymentMethodForm
          onSave={handleAdd}
          onCancel={() => setAdding(false)}
        />
      )}
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
