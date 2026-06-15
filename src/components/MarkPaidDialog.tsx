import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/DatePicker";
import type { Invoice } from "@/lib/invoices";

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onPaid: () => void;
}

export function MarkPaidDialog({ invoice, onClose, onPaid }: Props) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invoice) {
      setDate(new Date());
      setError(null);
    }
  }, [invoice]);

  async function handleConfirm() {
    if (!invoice || !date) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentDate: format(date, "yyyy-MM-dd") }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to mark invoice as paid");
        return;
      }
      onPaid();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>Record the date this invoice was settled.</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <Label>Payment date</Label>
          <DatePicker value={date} onChange={setDate} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !date}>
            {saving ? "Saving…" : "Mark as paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
