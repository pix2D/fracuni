import type { ReactNode } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function FormCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section>
      <Card>
        <CardContent className={className}>{children}</CardContent>
      </Card>
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

export function FormSection({ title, description, action, children, className }: FormSectionProps) {
  return (
    <section>
      <Card className={className}>
        <CardHeader>
          <div className="space-y-1">
            <CardTitle role="heading" aria-level={2}>
              {title}
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {action ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    </section>
  );
}
