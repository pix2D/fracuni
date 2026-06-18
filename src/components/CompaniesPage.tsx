import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CompanyWithRelations } from "@/lib/companies";

export function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithRelations[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    const res = await fetch("/api/companies");
    setCompanies(await res.json());
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this company?")) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to delete");
      return;
    }
    setError(null);
    document.cookie = "companyId=;path=/;max-age=0;samesite=lax";
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Companies</h1>
        <Button asChild>
          <a href="/companies/new">New Company</a>
        </Button>
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
                      <Button asChild variant="ghost" size="sm">
                        <a href={`/companies/${company.id}/edit`}>Edit</a>
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
    </div>
  );
}
