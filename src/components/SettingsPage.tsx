import { useCallback, useEffect, useState } from "react";
import { ServiceCatalogSection } from "@/components/ServiceCatalogSection";
import { SettingsForm } from "@/components/settings/SettingsForm";
import type { Settings } from "@/lib/settings";

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    setSettings((await res.json()) as Settings);
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  if (!settings) return null;

  return (
    <div className="space-y-8">
      <SettingsForm settings={settings} onSaved={setSettings} />
      <ServiceCatalogSection />
    </div>
  );
}
