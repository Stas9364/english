"use client";

import { Button } from "@/components/ui/button";
import { sanitizeQuestionTitleHtml } from "@/lib/sanitize-question-title-html";
import { Plus } from "lucide-react";

export type QuizPagesTabStripProps = {
  fieldIds: string[];
  titles: string[];
  activeIndex: number;
  onSelect: (index: number) => void;
  showAddPage: boolean;
  onAddPage: () => void;
};

const label = ({ title, index }: { title: string, index: number }) => {
  return sanitizeQuestionTitleHtml(title ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim() || `Page ${index + 1}`;

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

        return (
          <Button
            key={id}
            type="button"
            variant={activeIndex === i ? "default" : "outline"}
            size="sm"
            className="max-w-[min(100%,16rem)] min-w-0 shrink justify-start"
            onClick={() => onSelect(i)}
          >
            <span className="block min-w-0 truncate">{label({ title: titles[i], index: i })}</span>
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
