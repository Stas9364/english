"use client";

import { useEffect, useState } from "react";

type UseDebouncedDraftValueParams<T> = {
  value: T;
  onChange: (value: T) => void;
  delayMs: number;
};

export function useDebouncedDraftValue<T>({
  value,
  onChange,
  delayMs,
}: UseDebouncedDraftValueParams<T>) {
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  useEffect(() => {
    if (draftValue === value) return;

    const timeoutId = setTimeout(() => {
      onChange(draftValue);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [delayMs, draftValue, onChange, value]);

  return [draftValue, setDraftValue] as const;
}
