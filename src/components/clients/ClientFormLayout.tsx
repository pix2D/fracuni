import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ClientFormShell({ title, error, children }: { title: string; error: string | null; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button asChild variant="outline">
          <a href="/clients">Back to Clients</a>
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {children}
    </div>
  );
}

export function FormActions({ submitLabel }: { submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-6">
      <Button asChild type="button" variant="outline">
        <a href="/clients">Cancel</a>
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
