import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";

export function CompanyFormShell({ title, error, children }: { title: string; error: string | null; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button asChild variant="outline">
          <a href="/companies">Back to Companies</a>
        </Button>
      </div>
      <FormErrorBanner error={error} />
      {children}
    </div>
  );
}

export function FormActions({ submitLabel }: { submitLabel: string }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-4">
      <Button asChild variant="outline">
        <a href="/companies">Cancel</a>
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  );
}
