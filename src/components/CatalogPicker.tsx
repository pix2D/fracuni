import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BookOpenIcon } from "@phosphor-icons/react";
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

  function handlePick(entry: CatalogEntry) {
    onSelect(entry);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <BookOpenIcon className="size-4" />
                Catalog
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent>Pick from Service Catalog</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search catalog..."
            value={search}
            onValueChange={setSearch}
            autoFocus
          />
          <CommandList>
            <CommandEmpty>{entries.length === 0 ? "No catalog entries." : "No matches."}</CommandEmpty>
            {entries.map((entry) => (
              <CommandItem
                key={entry.id}
                value={`${entry.descriptionHr} ${entry.descriptionEn ?? ""}`}
                onSelect={() => handlePick(entry)}
              >
                <div className="flex flex-col">
                  <span>{entry.descriptionHr}</span>
                  {entry.descriptionEn ? (
                    <span className="text-muted-foreground">{entry.descriptionEn}</span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
