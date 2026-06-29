import { useEffect, useState } from "react";

interface ApiHealth {
  vies: { reachable: boolean };
  hnb: { reachable: boolean };
}

function HealthDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? "bg-muted-foreground/40" : ok ? "bg-green-500" : "bg-destructive";
  return <span className={`inline-block size-2 ${color}`} aria-hidden="true" />;
}

export function InvoiceHealthStatus({ visible }: { visible: boolean }) {
  const [health, setHealth] = useState<ApiHealth | null>(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    fetch("/api/health")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ApiHealth | null) => {
        if (!cancelled) setHealth(data);
      })
      .catch(() => {
        if (!cancelled) setHealth({ vies: { reachable: false }, hnb: { reachable: false } });
      });

    return () => {
      cancelled = true;
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <HealthDot ok={health ? health.vies.reachable : null} />
        VIES
      </span>
      <span className="flex items-center gap-1.5">
        <HealthDot ok={health ? health.hnb.reachable : null} />
        HNB
      </span>
    </div>
  );
}
