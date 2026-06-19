import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormErrorBanner } from "@/components/forms/FormErrorBanner";
import { useAppForm } from "@/components/forms/app-form";
import { responseError } from "@/lib/api-response";
import { SendEmailSchema, type SendEmailInput } from "@/lib/email.schema";

export interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  postmarkMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EmailDefaults {
  to: string;
  subject: string;
  body: string;
  from: string;
  attachmentFilename: string;
  logs: EmailLog[];
}

interface SendEmailFormProps {
  invoiceId: number;
  defaults: EmailDefaults;
  onCancel: () => void;
  onSent: () => Promise<void> | void;
}

const sendEmailFieldValidators = {
  to: { onSubmit: SendEmailSchema.shape.to },
  subject: { onSubmit: SendEmailSchema.shape.subject },
  body: { onSubmit: SendEmailSchema.shape.body },
};

export function SendEmailForm({ invoiceId, defaults, onCancel, onSent }: SendEmailFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const form = useAppForm({
    defaultValues: {
      to: defaults.to,
      subject: defaults.subject,
      body: defaults.body,
    } satisfies SendEmailInput,
    canSubmitWhenInvalid: true,
    validators: {
      onSubmit: SendEmailSchema,
    },
    onSubmitInvalid: () => {
      setError("Review the highlighted fields and try again.");
      setSending(false);
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const response = await fetch(`/api/invoices/${invoiceId}/email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });

        if (!response.ok) {
          setError(await responseError(response, "Failed to send email"));
          return;
        }

        await onSent();
      } finally {
        setSending(false);
      }
    },
  });

  function submit() {
    setSending(true);
    void form.handleSubmit().catch(() => setSending(false));
  }

  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormErrorBanner error={error} />

      <FieldGroup>
        <div className="space-y-1">
          <FieldLabel>From</FieldLabel>
          <Input value={defaults.from} readOnly disabled />
        </div>

        <form.AppField name="to" validators={sendEmailFieldValidators.to}>
          {(field) => <field.TextField label="To" type="email" />}
        </form.AppField>

        <form.AppField name="subject" validators={sendEmailFieldValidators.subject}>
          {(field) => <field.TextField label="Subject" />}
        </form.AppField>

        <form.AppField name="body" validators={sendEmailFieldValidators.body}>
          {(field) => <field.TextareaField label="Body" rows={6} />}
        </form.AppField>
      </FieldGroup>

      {defaults.logs.length > 0 && (
        <div className="space-y-1 border-t border-border pt-3">
          <FieldLabel>Send history</FieldLabel>
          <ul className="space-y-1">
            {defaults.logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">
                  {log.createdAt} {"->"} {log.recipient}
                </span>
                <span className={log.status === "sent" ? "text-foreground" : "text-destructive"}>
                  {log.status === "sent" ? "sent" : log.errorMessage || "error"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={sending}>
          Cancel
        </Button>
        <Button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send"}
        </Button>
      </DialogFooter>
    </form>
  );
}
