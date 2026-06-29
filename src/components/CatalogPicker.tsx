import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpenIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import type { CatalogEntry } from "@/lib/service-catalog";

interface Props {
  entries: CatalogEntry[];
  onSelect: (entry: CatalogEntry) => void;
}

// Searchable Service Catalog dropdown. Picking an entry copies its descriptions into
// the Line Item (placeholders expanded by the caller); the fields stay freely editable.
export function CatalogPicker({ entries, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return entries;
    return entries.filter(
      (e) =>
        e.descriptionHr.toLowerCase().includes(term) ||
        (e.descriptionEn ?? "").toLowerCase().includes(term),
    );
  }, [entries, search]);

  function handlePick(entry: CatalogEntry) {
    onSelect(entry);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" title="Pick from Service Catalog">
          <BookOpenIcon className="size-4" />
          Catalog
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="relative border-b border-border p-2">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            autoFocus
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              {entries.length === 0 ? "No catalog entries." : "No matches."}
            </p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => handlePick(entry)}
                className="flex w-full cursor-pointer flex-col rounded-none px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
              >
                <span>{entry.descriptionHr}</span>
                {entry.descriptionEn && (
                  <span className="text-xs text-muted-foreground">{entry.descriptionEn}</span>
                )}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
