import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PaperclipIcon } from "@phosphor-icons/react";
import type { Invoice } from "@/lib/invoices";

interface EmailLog {
  id: number;
  recipient: string;
  subject: string;
  status: string;
  postmarkMessageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface EmailDefaults {
  to: string;
  subject: string;
  body: string;
  from: string;
  attachmentFilename: string;
  logs: EmailLog[];
}

interface Props {
  invoice: Invoice | null;
  onClose: () => void;
  onSent: () => void;
}

export function SendEmailDialog({ invoice, onClose, onSent }: Props) {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState("");
  const [logs, setLogs] = useState<EmailLog[]>([]);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}/email`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load email defaults");
        return;
      }
      const data: EmailDefaults = await res.json();
      setFrom(data.from);
      setTo(data.to);
      setSubject(data.subject);
      setBody(data.body);
      setAttachment(data.attachmentFilename);
      setLogs(data.logs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (invoice) load(invoice.id);
  }, [invoice, load]);

  async function handleSend() {
    if (!invoice) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to send email");
        return;
      }
      onSent();
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={invoice !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
          <DialogDescription>
            Email this document to the client. The recipient, subject and body are
            pre-filled and can be edited per send.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>From</Label>
              <Input value={from} readOnly disabled />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-to">To</Label>
              <Input
                id="email-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email-body">Body</Label>
              <Textarea
                id="email-body"
                rows={6}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <PaperclipIcon className="size-4" />
              <span>{attachment || "No PDF attached"}</span>
            </div>

            {logs.length > 0 && (
              <div className="space-y-1 border-t border-border pt-3">
                <Label>Send history</Label>
                <ul className="space-y-1">
                  {logs.map((log) => (
                    <li key={log.id} className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground">
                        {log.createdAt} → {log.recipient}
                      </span>
                      <span className={log.status === "sent" ? "text-foreground" : "text-destructive"}>
                        {log.status === "sent" ? "sent" : log.errorMessage || "error"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={loading || sending || !to}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
