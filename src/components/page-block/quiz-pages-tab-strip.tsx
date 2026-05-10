"use client";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export type QuizPagesTabStripProps = {
  fieldIds: string[];
  titles: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  showAddPage: boolean;
  onAddPage: () => void;
};

export function QuizPagesTabStrip({
  fieldIds,
  titles,
  activeIndex,
  onSelect,
  showAddPage,
  onAddPage,
}: QuizPagesTabStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mt-10">
      {fieldIds.map((id, i) => {
        const label = titles[i]?.trim() ? titles[i].trim() : `Page ${i + 1}`;
        return (
          <Button
            key={id}
            type="button"
            variant={activeIndex === i ? "default" : "outline"}
            size="sm"
            className="max-w-[min(100%,16rem)] min-w-0 shrink"
            onClick={() => onSelect(i)}
          >
            <span className="truncate">{label}</span>
          </Button>
        );
      })}
      {showAddPage && (
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={onAddPage}>
          <Plus className="size-4" /> Add page
        </Button>
      )}
    </div>
  );
}
