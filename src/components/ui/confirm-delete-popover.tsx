"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ConfirmDeletePopoverProps {
  /** Question shown in the popover, e.g. "Delete page?" */
  title: string;
  /** Called when user clicks Delete. Can be async; popover closes after it completes. */
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  /** Trigger element (e.g. Button with trash icon). Must accept ref and onClick. */
  children: React.ReactNode;
}

export function ConfirmDeletePopover({
  title,
  onConfirm,
  disabled,
  children,
}: ConfirmDeletePopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await Promise.resolve(onConfirm());
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <p className="text-sm font-medium mb-3 text-center">{title}</p>
        <div className="flex justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" variant="destructive" onClick={handleConfirm} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
