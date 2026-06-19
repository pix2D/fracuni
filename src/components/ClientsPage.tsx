import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { clientTypeLabel } from "@/lib/client-types";
import { countryName } from "@/lib/countries";
import type { Client } from "@/lib/clients";

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const fetchClients = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (showArchived) params.set("archived", "true");
    const res = await fetch(`/api/clients?${params}`);
    setClients(await res.json());
  }, [search, showArchived]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  async function handleArchive(id: number) {
    const res = await fetch(`/api/clients/${id}/archive`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to archive");
      return;
    }
    await fetchClients();
  }

  async function handleUnarchive(id: number) {
    const res = await fetch(`/api/clients/${id}/unarchive`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to unarchive");
      return;
    }
    await fetchClients();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clients</h1>
        <Button asChild>
          <a href="/clients/new">New Client</a>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived">Show archived</Label>
        </div>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {search ? "No clients match your search." : "No clients yet. Create your first client to get started."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{clientTypeLabel(client.clientType)}</TableCell>
                  <TableCell>{countryName(client.country)}</TableCell>
                  <TableCell className="text-sm">{client.email}</TableCell>
                  <TableCell>{client.defaultCurrency}</TableCell>
                  <TableCell>
                    {client.archivedAt ? (
                      <Badge variant="secondary">Archived</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/clients/${client.id}/edit`}>Edit</a>
                      </Button>
                      {client.archivedAt ? (
                        <Button variant="ghost" size="sm" onClick={() => handleUnarchive(client.id)}>
                          Restore
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(client.id)}>
                          Archive
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
