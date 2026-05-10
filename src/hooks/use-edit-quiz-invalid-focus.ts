"use client";

import type { FieldErrors, UseFormReturn } from "react-hook-form";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

function findFirstErrorPath(errors: unknown, parentPath = ""): string | null {
  if (!errors || typeof errors !== "object") return null;
  const record = errors as Record<string, unknown>;

  if ("message" in record || "type" in record) {
    return parentPath || null;
  }

  for (const key of Object.keys(record)) {
    const childPath = parentPath ? `${parentPath}.${key}` : key;
    const found = findFirstErrorPath(record[key], childPath);
    if (found) return found;
  }

  return null;
}

function focusQuestionTitleEditor(path: string) {
  const match = path.match(/^pages\.(\d+)\.questions\.(\d+)\.question_title$/);
  if (!match) return false;

  const [, pageIndex, questionIndex] = match;
  const editorId = `question-title-${pageIndex}-${questionIndex}`;
  const container = document.querySelector<HTMLElement>(
    `[data-question-title-editor-id="${editorId}"]`
  );
  if (!container) return false;

  container.scrollIntoView({ behavior: "smooth", block: "center" });
  const editor = container.querySelector<HTMLElement>('[contenteditable="true"]');
  editor?.focus();
  return true;
}

function pageIndexFromFieldPath(path: string): number | null {
  const m = path.match(/^pages\.(\d+)/);
  return m ? Number(m[1]) : null;
}

export function useEditQuizInvalidFocus(
  form: UseFormReturn<EditQuizFormValues>,
  options?: { onFocusPage?: (pageIndex: number) => void }
) {
  function onInvalid(errors: FieldErrors<EditQuizFormValues>) {
    const firstErrorPath = findFirstErrorPath(errors);
    if (!firstErrorPath) return;

    const pageIndex = pageIndexFromFieldPath(firstErrorPath);
    if (pageIndex !== null) {
      options?.onFocusPage?.(pageIndex);
    }

    if (focusQuestionTitleEditor(firstErrorPath)) return;
    form.setFocus(firstErrorPath as keyof EditQuizFormValues);
  }

  return { onInvalid };
}
