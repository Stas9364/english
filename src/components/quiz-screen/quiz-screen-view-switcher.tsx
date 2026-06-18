"use client";

import { cn } from "@/lib/utils";

type ViewTab = "quiz" | "theory";

interface QuizScreenViewSwitcherProps {
  hasTheory: boolean;
  viewTab: ViewTab;
  setViewTab: (tab: ViewTab) => void;
  pageIndex: number;
  totalPages: number;
}

export function QuizScreenViewSwitcher({
  hasTheory,
  viewTab,
  setViewTab,
  pageIndex,
  totalPages,
}: QuizScreenViewSwitcherProps) {
  if (!hasTheory && totalPages <= 1) {
    return null;
  }

  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b">
      <div className="flex">
        {hasTheory && (
          <>
            <button
              type="button"
              onClick={() => setViewTab("quiz")}
              className={cn(
                "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                viewTab === "quiz"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Quiz
            </button>
            <button
              type="button"
              onClick={() => setViewTab("theory")}
              className={cn(
                "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                viewTab === "theory"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              Theory
            </button>
          </>
        )}
      </div>
      {totalPages > 1 && (
        <span className="mb-2 shrink-0 text-sm text-muted-foreground">
          Page {pageIndex + 1} of {totalPages}
        </span>
      )}
    </div>
  );
}
