import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FormSection } from "@/components/forms/FormSection";
import { responseError } from "@/lib/api-response";
import type { Location, PaymentMethod } from "@/lib/companies";
import type { DocumentNumberSequenceState } from "@/lib/document-number-sequences";
import { PencilSimpleIcon } from "@phosphor-icons/react";

interface Props {
  companyId: number;
  locations: Location[];
  paymentMethods: PaymentMethod[];
}

function currentYear(): number {
  return new Date().getFullYear();
}

function defaultLocationId(locations: Location[]): string {
  return String((locations.find((location) => location.isDefault) ?? locations[0])?.id ?? "");
}

function locationLabel(location: Location): string {
  return `${location.number} - ${location.nameHr}`;
}

function sequencePreview(sequence: DocumentNumberSequenceState, location?: Location): string {
  const locationNumber = location?.number ?? "{location}";
  return `${sequence.nextSequence}/${locationNumber}/${sequence.paymentMethodNumber}`;
}

export function DocumentNumberingSection({ companyId, locations, paymentMethods }: Props) {
  const [year, setYear] = useState(currentYear());
  const [selectedLocationId, setSelectedLocationId] = useState(defaultLocationId(locations));
  const [sequences, setSequences] = useState<DocumentNumberSequenceState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingSequence, setEditingSequence] = useState<DocumentNumberSequenceState | null>(null);

  const selectedLocation = useMemo(
    () => locations.find((location) => String(location.id) === selectedLocationId),
    [locations, selectedLocationId],
  );

  const fetchSequences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/document-number-sequences?year=${year}`);
      if (!response.ok) {
        setError(await responseError(response, "Failed to load document numbering"));
        setSequences([]);
        return;
      }
      setSequences(await response.json());
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    if (!locations.some((location) => String(location.id) === selectedLocationId)) {
      setSelectedLocationId(defaultLocationId(locations));
    }
  }, [locations, selectedLocationId]);

  useEffect(() => {
    void fetchSequences();
  }, [fetchSequences, paymentMethods]);

  async function handleSaved() {
    setEditingSequence(null);
    await fetchSequences();
  }

  return (
    <FormSection
      title="Document Numbering"
      description="Invoice and Credit Note sequence counters by year and payment method."
      action={
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="document-numbering-year">Year</Label>
            <Input
              id="document-numbering-year"
              type="number"
              min={2000}
              max={9999}
              className="w-24"
              value={year}
              onChange={(event) => setYear(Number(event.currentTarget.value))}
            />
          </div>
          {locations.length > 0 && (
            <div className="space-y-1">
              <Label>Preview Location</Label>
              <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={String(location.id)}>
                      {locationLabel(location)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {paymentMethods.length === 0 ? (
        <Empty className="border border-border">
          <EmptyHeader>
            <EmptyTitle>No payment methods yet</EmptyTitle>
            <EmptyDescription>Add a payment method before configuring document numbering.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Method</TableHead>
              <TableHead className="w-32">Last Issued</TableHead>
              <TableHead className="w-32">Next Sequence</TableHead>
              <TableHead className="w-36">Preview</TableHead>
              <TableHead className="w-14" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sequences.map((sequence) => (
              <TableRow key={sequence.paymentMethodId}>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-medium">{sequence.paymentMethodNameHr}</div>
                    <div className="text-muted-foreground">Number {sequence.paymentMethodNumber}</div>
                  </div>
                </TableCell>
                <TableCell className="font-mono">{sequence.lastValue}</TableCell>
                <TableCell className="font-mono">{sequence.nextSequence}</TableCell>
                <TableCell className="font-mono">{sequencePreview(sequence, selectedLocation)}</TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit next sequence for ${sequence.paymentMethodNameHr}`}
                    onClick={() => setEditingSequence(sequence)}
                  >
                    <PencilSimpleIcon className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {loading && sequences.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Spinner />
                    Loading...
                  </span>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <SequenceDialog
        companyId={companyId}
        year={year}
        sequence={editingSequence}
        onClose={() => setEditingSequence(null)}
        onSaved={handleSaved}
      />
    </FormSection>
  );
}

function SequenceDialog({
  companyId,
  year,
  sequence,
  onClose,
  onSaved,
}: {
  companyId: number;
  year: number;
  sequence: DocumentNumberSequenceState | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [nextSequence, setNextSequence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNextSequence(sequence ? String(sequence.nextSequence) : "");
    setError(null);
    setSaving(false);
  }, [sequence]);

  async function save() {
    if (!sequence) return;

    const parsed = Number(nextSequence);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setError("Next sequence must be a positive whole number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/companies/${companyId}/document-number-sequences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year,
          paymentMethodId: sequence.paymentMethodId,
          nextSequence: parsed,
        }),
      });

      if (!response.ok) {
        setError(await responseError(response, "Failed to save next sequence"));
        return;
      }

      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={sequence !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sequence ? `Set Next Sequence - ${sequence.paymentMethodNameHr}` : "Set Next Sequence"}</DialogTitle>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-1">
            <Label htmlFor="document-numbering-next-sequence">Next Sequence</Label>
            <Input
              id="document-numbering-next-sequence"
              type="number"
              min={1}
              value={nextSequence}
              onChange={(event) => setNextSequence(event.currentTarget.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
