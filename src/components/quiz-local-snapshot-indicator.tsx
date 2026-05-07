"use client";

import { Check, RotateCcw, Save, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { QuizSnapshotSaveStatus } from "@/hooks/use-quiz-local-snapshot-autosave";

type QuizLocalSnapshotIndicatorProps = {
  status: QuizSnapshotSaveStatus;
  savedAt: number | null;
  error?: string | null;
  onDiscard: () => void;
};

function getStatusText(status: QuizSnapshotSaveStatus): string {
  if (status === "pending") return "Saving snapshot...";
  if (status === "saved") return "Snapshot saved locally";
  if (status === "restored") return "Snapshot restored";
  if (status === "error") return "Snapshot error";
  return "Local snapshot";
}

function StatusIcon({ status }: { status: QuizSnapshotSaveStatus }) {
  if (status === "pending") return <Save data-icon="inline-start" />;
  if (status === "error") return <TriangleAlert data-icon="inline-start" />;
  if (status === "restored") return <RotateCcw data-icon="inline-start" />;
  return <Check data-icon="inline-start" />;
}

export function QuizLocalSnapshotIndicator({
  status,
  savedAt,
  error,
  onDiscard,
}: QuizLocalSnapshotIndicatorProps) {
  if (status === "idle") return null;

  const savedTime = savedAt ? new Date(savedAt).toLocaleTimeString() : null;

  return (
    <div className="fixed right-4 top-30 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <StatusIcon status={status} />
            {getStatusText(status)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <PopoverHeader>
            <PopoverTitle>{getStatusText(status)}</PopoverTitle>
            <PopoverDescription>
              {error ?? (savedTime ? `Last local save: ${savedTime}` : "Your changes are kept in this browser.")}
            </PopoverDescription>
          </PopoverHeader>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onDiscard}>
              <Trash2 data-icon="inline-start" />
              Discard snapshot
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
