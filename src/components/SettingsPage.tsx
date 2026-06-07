import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Settings {
  defaultVatRate: number;
  supportedCurrencies: string[];
  defaultPaymentTermsDays: number;
  defaultOfferValidityDays: number;
  postmarkApiKey: string | null;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [newCurrency, setNewCurrency] = useState("");

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    setSettings(await res.json());
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to save settings");
    } else {
      setSettings(await res.json());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setSaving(false);
  }

  function addCurrency() {
    if (!settings || !newCurrency.trim()) return;
    const code = newCurrency.trim().toUpperCase();
    if (settings.supportedCurrencies.includes(code)) return;
    setSettings({
      ...settings,
      supportedCurrencies: [...settings.supportedCurrencies, code],
    });
    setNewCurrency("");
  }

  function removeCurrency(code: string) {
    if (!settings) return;
    const updated = settings.supportedCurrencies.filter((c) => c !== code);
    if (updated.length === 0) return;
    setSettings({ ...settings, supportedCurrencies: updated });
  }

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          Settings saved.
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tax & Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vatRate">Default VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={settings.defaultVatRate}
                onChange={(e) =>
                  setSettings({ ...settings, defaultVatRate: parseFloat(e.target.value) || 0 })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Default Payment Terms (days)</Label>
              <Input
                id="paymentTerms"
                type="number"
                min={1}
                value={settings.defaultPaymentTermsDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultPaymentTermsDays: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="offerValidity">Default Offer Validity (days)</Label>
              <Input
                id="offerValidity"
                type="number"
                min={1}
                value={settings.defaultOfferValidityDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultOfferValidityDays: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supported Currencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {settings.supportedCurrencies.map((code) => (
                  <Badge key={code} variant="secondary" className="gap-1 pr-1">
                    {code}
                    <button
                      type="button"
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      onClick={() => removeCurrency(code)}
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. GBP"
                  value={newCurrency}
                  maxLength={3}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCurrency()}
                />
                <Button variant="outline" onClick={addCurrency}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email (Postmark)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="postmarkKey">Postmark API Key</Label>
              <Input
                id="postmarkKey"
                type="password"
                placeholder="Not configured"
                value={settings.postmarkApiKey ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    postmarkApiKey: e.target.value || null,
                  })
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
