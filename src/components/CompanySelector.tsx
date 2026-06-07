import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Company {
  id: number;
  name: string;
}

export function CompanySelector({
  companies,
  selectedId,
}: {
  companies: Company[];
  selectedId: string | undefined;
}) {
  const [value, setValue] = useState(selectedId ?? "");

  useEffect(() => {
    const first = companies[0];
    if (!value && first) {
      setValue(String(first.id));
    }
  }, [companies, value]);

  function handleChange(id: string) {
    setValue(id);
    document.cookie = `companyId=${id};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`;
    window.location.reload();
  }

  if (companies.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">No companies yet</span>
    );
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
