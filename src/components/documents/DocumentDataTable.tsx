import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { CaretDownIcon, CaretUpDownIcon, CaretUpIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeInvoiceTotals } from "@/lib/invoice-totals";
import {
  formatMoneyWithCurrency,
  isCurrencyCode,
  sumAmounts,
  toSmallestUnit,
  type Money,
} from "@/lib/currency";
import { chargesCroatianPdv, determineTaxTreatment } from "@/lib/tax-engine";
import { cn } from "@/lib/utils";
import type { Client } from "@/lib/clients";
import type { Invoice } from "@/lib/invoices";
import type { Settings } from "@/lib/settings";
import type {
  DocumentStatusFilter,
  DocumentStatusOption,
  DocumentSummaryConfig,
  DocumentTableRow,
  DocumentYearFilter,
} from "@/components/documents/types";

interface Props<TDocument extends Invoice> {
  documents: TDocument[];
  clients: Client[];
  settings: Settings;
  empty: string;
  documentLabel: { singular: string; plural: string };
  dateLabel: string;
  statusOptions: DocumentStatusOption[];
  summary: DocumentSummaryConfig<TDocument>[];
  renderActions: (document: TDocument) => ReactNode;
  numberFormatter?: (document: TDocument) => string;
  showOriginalInvoiceNumber?: boolean;
}

function createGlobalDocumentFilter<TDocument extends Invoice>(): FilterFn<DocumentTableRow<TDocument>> {
  return (row, _columnId, filterValue) => {
    const term = String(filterValue ?? "").trim().toLowerCase();
    if (!term) return true;
    return row.original.searchText.includes(term);
  };
}

function defaultDocumentNumberFormatter(document: Invoice): string {
  return document.documentNumber ?? "-";
}

function parseDocumentNumberValue(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/^\d+/);
  return match ? Number(match[0]) : 0;
}

function formatAmount(amount: Money | null): string {
  return amount ? formatMoneyWithCurrency(amount) : "-";
}

function summaryByCurrency<TDocument extends Invoice>(
  rows: DocumentTableRow<TDocument>[],
  include: (row: DocumentTableRow<TDocument>) => boolean,
): string[] {
  const byCurrency = new Map<string, Money[]>();
  for (const row of rows) {
    if (!row.amount || !row.currency || !include(row)) continue;
    const list = byCurrency.get(row.currency) ?? [];
    list.push(row.amount);
    byCurrency.set(row.currency, list);
  }
  return [...byCurrency.values()].map((amounts) => formatMoneyWithCurrency(sumAmounts(amounts)));
}

function SortableHeader({
  label,
  column,
  align = "left",
}: {
  label: string;
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
  align?: "left" | "right";
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? CaretUpIcon : sorted === "desc" ? CaretDownIcon : CaretUpDownIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-2 h-8 px-2", align === "right" && "ml-auto -mr-2")}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {label}
      <Icon className="ml-1 size-3.5 text-muted-foreground" />
    </Button>
  );
}

function SummaryPill({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>{" "}
      <span className="font-medium">{values.length > 0 ? values.join(" / ") : "-"}</span>
    </div>
  );
}

export function DocumentDataTable<TDocument extends Invoice = Invoice>({
  documents,
  clients,
  settings,
  empty,
  documentLabel,
  dateLabel,
  statusOptions,
  summary,
  renderActions,
  numberFormatter = defaultDocumentNumberFormatter,
  showOriginalInvoiceNumber = false,
}: Props<TDocument>) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "issueDate", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility] = useState<VisibilityState>({ year: false });
  const [globalFilter, setGlobalFilter] = useState("");
  const globalFilterFn = useMemo(() => createGlobalDocumentFilter<TDocument>(), []);

  const clientName = useCallback(
    (id: number | null): string => {
      if (id === null) return "-";
      return clients.find((c) => c.id === id)?.name ?? "-";
    },
    [clients],
  );

  const rows = useMemo<DocumentTableRow<TDocument>[]>(
    () =>
      documents.map((document) => {
        const currency = document.currency && isCurrencyCode(document.currency) ? document.currency : "";
        const clientRecord = clients.find((c) => c.id === document.clientId);
        const chargeVat = clientRecord
          ? chargesCroatianPdv(
              determineTaxTreatment({
                clientType: clientRecord.clientType,
                clientCountry: clientRecord.country,
                clientVatNumber: clientRecord.vatNumber,
              }),
            )
          : false;
        const amount = currency
          ? computeInvoiceTotals(
              document.lineItems.map((li) => ({
                quantity: li.quantity ?? 0,
                unitPrice: li.unitPrice ?? 0,
              })),
              currency,
              { chargeVat, vatRate: settings.defaultVatRate },
            ).total
          : null;
        const number = numberFormatter(document);
        const originalInvoiceNumber = document.originalInvoiceNumber ?? "-";
        const client = clientName(document.clientId);
        const issueDate = document.issueDate ?? "";

        return {
          document,
          number,
          numberValue: parseDocumentNumberValue(document.documentNumber),
          originalInvoiceNumber,
          client,
          issueDate,
          year: issueDate ? issueDate.slice(0, 4) : "",
          amount,
          amountValue: amount ? toSmallestUnit(amount) : 0,
          currency: document.currency ?? "",
          status: document.status,
          searchText: [number, originalInvoiceNumber, client].join(" ").toLowerCase(),
        };
      }),
    [documents, clients, settings.defaultVatRate, numberFormatter, clientName],
  );

  const years = useMemo(
    () => [...new Set(rows.map((row) => row.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)),
    [rows],
  );

  const columns = useMemo<ColumnDef<DocumentTableRow<TDocument>>[]>(
    () => [
      {
        accessorKey: "numberValue",
        header: ({ column }) => <SortableHeader label="Number" column={column} />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.number}</span>,
      },
      ...(showOriginalInvoiceNumber
        ? [
            {
              accessorKey: "originalInvoiceNumber",
              header: "Ref. Invoice",
              cell: ({ row }) => (
                <span className="text-muted-foreground">{row.original.originalInvoiceNumber}</span>
              ),
            } satisfies ColumnDef<DocumentTableRow<TDocument>>,
          ]
        : []),
      {
        accessorKey: "client",
        header: ({ column }) => <SortableHeader label="Client" column={column} />,
        cell: ({ row }) => <span className="font-medium">{row.original.client}</span>,
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => <SortableHeader label={dateLabel} column={column} />,
        cell: ({ row }) => row.original.issueDate || "-",
      },
      {
        accessorKey: "amountValue",
        header: ({ column }) => <SortableHeader label="Amount" column={column} align="right" />,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{formatAmount(row.original.amount)}</span>
        ),
      },
      {
        accessorKey: "currency",
        header: ({ column }) => <SortableHeader label="Currency" column={column} />,
        cell: ({ row }) => row.original.currency || "-",
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader label="Status" column={column} />,
        cell: ({ row }) => (
          <Badge variant={row.original.status === "draft" ? "secondary" : "default"}>
            {row.original.status}
          </Badge>
        ),
        filterFn: "equals",
      },
      {
        accessorKey: "year",
        header: "Year",
        cell: ({ row }) => row.original.year || "-",
        filterFn: "equals",
      },
      {
        id: "actions",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => <div className="flex justify-end">{renderActions(row.original.document)}</div>,
      },
    ],
    [dateLabel, renderActions, showOriginalInvoiceNumber],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, columnFilters, columnVisibility, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const statusFilter =
    (table.getColumn("status")?.getFilterValue() as DocumentStatusFilter | undefined) ?? "all";
  const yearFilter =
    (table.getColumn("year")?.getFilterValue() as DocumentYearFilter | undefined) ?? "all";
  const filteredRows = table.getFilteredRowModel().rows.map((row) => row.original);

  function setStatusFilter(value: DocumentStatusFilter) {
    table.getColumn("status")?.setFilterValue(value === "all" ? undefined : value);
  }

  function setYearFilter(value: DocumentYearFilter) {
    table.getColumn("year")?.setFilterValue(value === "all" ? undefined : value);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search by client or number"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statusOptions.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={(v) => setYearFilter(v)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredRows.length} {filteredRows.length === 1 ? documentLabel.singular : documentLabel.plural}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {summary.map((item) => (
          <SummaryPill
            key={item.label}
            label={item.label}
            values={summaryByCurrency(filteredRows, item.include)}
          />
        ))}
      </div>

      <Card>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(header.column.id === "actions" && "w-12 text-right")}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                  {rows.length === 0 ? empty : "No documents match the current filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
