"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type QuizLocalSnapshotRestoreDialogProps = {
  open: boolean;
  updatedAt?: number;
  onKeepCurrent: () => void;
  onApplySnapshot: () => void;
};

export function QuizLocalSnapshotRestoreDialog({
  open,
  updatedAt,
  onKeepCurrent,
  onApplySnapshot,
}: QuizLocalSnapshotRestoreDialogProps) {
  const savedTime = updatedAt ? new Date(updatedAt).toLocaleString() : "unknown time";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onKeepCurrent();
    }}>
      <DialogContent title="Local quiz snapshot found">
        <DialogHeader>
          <DialogTitle>Local snapshot found</DialogTitle>
          <DialogDescription>
            There is an unsaved local snapshot from {savedTime}. Keep the quiz loaded from the database or apply the local snapshot?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onKeepCurrent}>
            Keep database version
          </Button>
          <Button type="button" onClick={onApplySnapshot}>
            Apply local snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
