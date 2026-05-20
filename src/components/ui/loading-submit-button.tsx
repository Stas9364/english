"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type LoadingSubmitButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "type"> & {
  isLoading: boolean;
  idleText: string;
  loadingText?: string;
};

export function LoadingSubmitButton({
  isLoading,
  idleText,
  loadingText = "Saving...",
  disabled,
  ...props
}: LoadingSubmitButtonProps) {
  return (
    <Button type="submit" disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </span>
      ) : (
        idleText
      )}
    </Button>
  );
}
