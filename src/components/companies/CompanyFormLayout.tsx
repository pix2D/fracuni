import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";

export function CompanyFormShell({
  title,
  error,
  children,
  backHref = "/companies",
  backLabel = "Back to Companies",
}: {
  title: string;
  error: string | null;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button asChild variant="outline">
          <a href={backHref}>{backLabel}</a>
        </Button>
      </div>
      <FormErrorBanner error={error} />
      {children}
    </div>
  );
}

export function FormActions({ submitLabel, cancelHref = "/companies" }: { submitLabel: string; cancelHref?: string }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Button asChild variant="outline">
        <a href={cancelHref}>Cancel</a>
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
