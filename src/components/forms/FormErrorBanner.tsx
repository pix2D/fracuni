interface FormErrorBannerProps {
  error: string | null;
}

interface FormSuccessBannerProps {
  message: string | null;
}

export function FormErrorBanner({ error }: FormErrorBannerProps) {
  if (!error) return null;

  return (
    <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
      {error}
    </div>
  );
}

export function FormSuccessBanner({ message }: FormSuccessBannerProps) {
  if (!message) return null;

  return (
    <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-foreground">
      {message}
    </div>
  );
}
