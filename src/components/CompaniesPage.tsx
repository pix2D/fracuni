import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyForm } from "@/components/CompanyForm";
import type { CompanyWithRelations, CompanyInput } from "@/lib/companies";

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithRelations[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    const list = await res.json();
    const detailed = await Promise.all(
      list.map(async (c: { id: number }) => {
        const r = await fetch(`/api/companies/${c.id}`);
        return r.json();
      })
    );
    setCompanies(detailed);
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleSave(data: CompanyInput) {
    const url = editingId ? `/api/companies/${editingId}` : "/api/companies";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to save");
      return;
    }
    setDialogOpen(false);
    setEditingId(null);
    setError(null);
    await fetchCompanies();
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this company?")) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to delete");
      return;
    }
    setError(null);
    await fetchCompanies();
  }

  function openCreate() {
    setEditingId(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(id: number) {
    setEditingId(id);
    setError(null);
    setDialogOpen(true);
  }

  const editingCompany = editingId
    ? companies.find((c) => c.id === editingId)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button onClick={openCreate}>New Company</Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {companies.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No companies yet. Create your first company to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>OIB</TableHead>
                <TableHead>IBAN</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Payment Methods</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell className="font-mono text-sm">{company.oib}</TableCell>
                  <TableCell className="font-mono text-sm">{company.iban}</TableCell>
                  <TableCell>{company.locations?.length ?? 0}</TableCell>
                  <TableCell>{company.paymentMethods?.length ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(company.id)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(company.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Company" : "New Company"}
            </DialogTitle>
          </DialogHeader>
          <CompanyForm
            company={editingCompany}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
            onCompanyUpdated={fetchCompanies}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
