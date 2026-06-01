"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CrosswordSelectOption = {
  id: string;
  title: string;
  slug: string;
};

export function CrosswordPageSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: CrosswordSelectOption[];
}) {
  const [query, setQuery] = useState("");
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter((option) =>
      `${option.title} ${option.slug}`.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor="crossword-search">Crossword</Label>
        <p className="text-sm text-muted-foreground">
          Select an existing crossword from the crossword section. It will be shown inline on this quiz page.
        </p>
      </div>
      <Input
        id="crossword-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search crossword..."
      />
      <select
        className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select crossword</option>
        {filteredOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.title}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No crosswords found. Create one in the crossword section first.
        </p>
      ) : null}
    </div>
  );
}
