import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Card chrome shared by every form section. Renders a real <section> (not a
 * <div>) so that headings and structural selectors keep working, while giving
 * each logical group a contained, separated panel instead of a flat run of
 * fields divided only by hairlines.
 */
export function FormCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn("bg-card text-card-foreground ring-1 ring-foreground/10", "p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * A titled form section: a FormCard with a heading, optional one-line
 * description, and an optional action (e.g. an "Add" button) aligned right.
 */
export function FormSection({ title, description, action, children, className }: FormSectionProps) {
  return (
    <FormCard className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold leading-none">{title}</h2>
          {description ? <p className="max-w-prose text-xs/relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </FormCard>
  );
}
