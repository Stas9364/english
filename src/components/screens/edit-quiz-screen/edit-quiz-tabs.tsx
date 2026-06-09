"use client";

import { cn } from "@/lib/utils";

export type EditQuizTabId = "details" | "theory";

interface EditQuizTabsProps {
  activeTab: EditQuizTabId;
  onChange: (tab: EditQuizTabId) => void;
}

export function getEditQuizTabMeta(tab: EditQuizTabId) {
  if (tab === "details") {
    return {
      title: "Quiz details",
      description: "Change title, description and pages. Each page has one question type.",
    };
  }

  return {
    title: "Theory",
    description: "Text and image blocks shown before taking the quiz.",
  };
}

export function EditQuizTabs({ activeTab, onChange }: EditQuizTabsProps) {
  return (
    <div className="flex items-center gap-2 border-b">
      <button
        type="button"
        onClick={() => onChange("details")}
        className={cn(
          "cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          activeTab === "details"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Details and pages
      </button>
      <button
        type="button"
        onClick={() => onChange("theory")}
        className={cn(
          "cursor-pointer border-b-2 px-3 py-2 text-sm font-medium transition-colors",
          activeTab === "theory"
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        Theory
      </button>
    </div>
  );
}
