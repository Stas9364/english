"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Plus, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

/** Minimal form shape used by both create and edit quiz pages. */
export type QuizQuestionFormValues = {
  pages: {
    questions: {
      question_title?: string;
      options: { option_text: string; is_correct: boolean; gap_index?: number }[];
    }[];
  }[];
  formState?: { errors?: unknown };
};

/** Errors shape for pages[pageIndex].questions[qIndex] when indexing by number. */
type PageQuestionErrors = {
  pages?: {
    [key: number]: {
      questions?: {
        [key: number]: {
          root?: { message?: string };
          options?: { [key: number]: { option_text?: { message?: string } } };
        };
      };
    };
  };
};

export interface QuizQuestionChoiceOptionsProps {
  form: UseFormReturn<QuizQuestionFormValues>;
  pageIndex: number;
  qIndex: number;
  pageType: "single" | "multiple";
  defaultOption: () => { option_text: string; is_correct: boolean };
  /** If provided (edit mode), called before removing an option; if returns false, option is not removed. */
  onBeforeRemoveOption?: (oIndex: number) => void | Promise<boolean>;
}

export function QuizQuestionChoiceOptions({
  form,
  pageIndex,
  qIndex,
  pageType,
  defaultOption,
  onBeforeRemoveOption,
}: QuizQuestionChoiceOptionsProps) {
  const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
  const basePath = `pages.${pageIndex}.questions.${qIndex}.options` as const;

  async function handleRemoveOption(oIndex: number) {
    if (onBeforeRemoveOption) {
      const ok = await onBeforeRemoveOption(oIndex);
      if (ok === false) return;
    }
    const opts = form.getValues(basePath);
    if (opts.length > 1) {
      form.setValue(basePath, opts.filter((_, i) => i !== oIndex));
    }
  }

  return (
    <div className="space-y-2 border-t border-border/60 pt-4">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-semibold text-foreground">Answers</Label>
        <span className="text-sm text-muted-foreground">Answers: {options.length}</span>
      </div>
      {options.map((_, oIndex) => (
        <div key={oIndex} className="flex items-center gap-2">
          <Input
            {...form.register(`${basePath}.${oIndex}.option_text`)}
            placeholder={`Answer ${oIndex + 1}`}
          />
          <label className="flex cursor-pointer shrink-0 items-center gap-2 whitespace-nowrap text-sm">
            <Checkbox
              checked={form.watch(`${basePath}.${oIndex}.is_correct`)}
              onCheckedChange={(checked) => {
                if (pageType === "single" && checked === true) {
                  const opts = form.getValues(basePath);
                  form.setValue(
                    basePath,
                    opts.map((o, i) => ({ ...o, is_correct: i === oIndex }))
                  );
                } else {
                  form.setValue(`${basePath}.${oIndex}.is_correct`, checked === true);
                }
              }}
            />
            Correct
          </label>
          <ConfirmDeletePopover
            title="Delete answer?"
            onConfirm={() => handleRemoveOption(oIndex)}
            disabled={options.length <= 1}
          >
            <Button type="button" variant="ghost" size="icon">
              <Trash2 className="size-4" />
            </Button>
          </ConfirmDeletePopover>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          const opts = form.getValues(basePath);
          form.setValue(basePath, [...opts, defaultOption()]);
        }}
      >
        <Plus className="size-4" /> Add answer
      </Button>
    </div>
  );
}

export interface QuizQuestionInputGapsOptionsProps {
  form: UseFormReturn<QuizQuestionFormValues>;
  pageIndex: number;
  qIndex: number;
  onBeforeRemoveOption?: (oIndex: number) => void | Promise<boolean>;
}

export function QuizQuestionInputGapsOptions({
  form,
  pageIndex,
  qIndex,
  onBeforeRemoveOption,
}: QuizQuestionInputGapsOptionsProps) {
  const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
  const gapCount = Math.max(1, Math.max(0, title.split("[[]]").length - 1));
  const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
  const questionError = (form.formState?.errors as PageQuestionErrors)?.pages?.[pageIndex]?.questions?.[qIndex]?.root;
  const questionErrorMessage = questionError?.message ?? "";
  const basePath = `pages.${pageIndex}.questions.${qIndex}.options` as const;

  async function handleRemoveOption(optIdx: number) {
    if (onBeforeRemoveOption) {
      const ok = await onBeforeRemoveOption(optIdx);
      if (ok === false) return;
    }
    const opts = form.getValues(basePath);
    if (opts.length > 1) {
      form.setValue(basePath, opts.filter((_, i) => i !== optIdx));
    }
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      {questionErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{questionErrorMessage}</AlertDescription>
        </Alert>
      )}
      {Array.from({ length: gapCount }, (_, gapIndex) => {
        const indices = options
          .map((o, i) => ({ o, i }))
          .filter(({ o }) => (o.gap_index ?? 0) === gapIndex)
          .map(({ i }) => i);
        return (
          <div key={gapIndex} className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {gapCount > 1 ? `Correct answers for gap ${gapIndex + 1}` : "Correct answers (any match counts)"}
            </Label>
            {indices.map((optIdx) => {
              const optError = (form.formState?.errors as PageQuestionErrors)?.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[optIdx];
              return (
              <div key={optIdx} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Input
                    {...form.register(`${basePath}.${optIdx}.option_text`)}
                    placeholder="Acceptable answer"
                    className={cn(optError?.option_text && "border-destructive")}
                  />
                <ConfirmDeletePopover
                  title="Delete correct answer?"
                  onConfirm={() => handleRemoveOption(optIdx)}
                  disabled={indices.length <= 1}
                >
                  <Button type="button" variant="ghost" size="icon">
                    <Trash2 className="size-4" />
                  </Button>
                </ConfirmDeletePopover>
                </div>
                {optError?.option_text?.message && (
                  <p className="text-sm text-destructive">{optError.option_text.message}</p>
                )}
              </div>
            );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const opts = form.getValues(basePath);
                form.setValue(basePath, [
                  ...opts,
                  { option_text: "", is_correct: true, gap_index: gapIndex },
                ]);
              }}
            >
              <Plus className="size-4" /> Add correct answer{gapCount > 1 ? ` for gap ${gapIndex + 1}` : ""}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export interface QuizQuestionSelectGapsOptionsProps {
  form: UseFormReturn<QuizQuestionFormValues>;
  pageIndex: number;
  qIndex: number;
  onBeforeRemoveOption?: (oIndex: number) => void | Promise<boolean>;
}

export function QuizQuestionSelectGapsOptions({
  form,
  pageIndex,
  qIndex,
  onBeforeRemoveOption,
}: QuizQuestionSelectGapsOptionsProps) {
  const title = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`) || "";
  const gapCount = Math.max(1, Math.max(0, title.split("[[]]").length - 1));
  const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
  const questionError = (form.formState?.errors as PageQuestionErrors)?.pages?.[pageIndex]?.questions?.[qIndex]?.root;
  const questionErrorMessage = questionError?.message ?? "";
  const basePath = `pages.${pageIndex}.questions.${qIndex}.options` as const;

  async function handleRemoveOption(optIdx: number) {
    if (onBeforeRemoveOption) {
      const ok = await onBeforeRemoveOption(optIdx);
      if (ok === false) return;
    }
    const opts = form.getValues(basePath);
    form.setValue(basePath, opts.filter((_, i) => i !== optIdx));
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      {questionErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{questionErrorMessage}</AlertDescription>
        </Alert>
      )}
      {Array.from({ length: gapCount }, (_, gapIndex) => {
        const indices = options
          .map((o, i) => ({ o, i }))
          .filter(({ o }) => (o.gap_index ?? 0) === gapIndex)
          .map(({ i }) => i);
        return (
          <div key={gapIndex} className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {gapCount > 1 ? `Answers for gap ${gapIndex + 1}` : "Answers (mark correct)"}
            </Label>
            {indices.map((optIdx) => {
              const optError = (form.formState?.errors as PageQuestionErrors)?.pages?.[pageIndex]?.questions?.[qIndex]?.options?.[optIdx];
              return (
              <div key={optIdx} className="flex items-center gap-2">
                <Input
                  {...form.register(`${basePath}.${optIdx}.option_text`)}
                  placeholder="Answer text"
                  className={cn(optError?.option_text && "border-destructive")}
                />
                <label className="flex cursor-pointer shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                  <Checkbox
                    checked={form.watch(`${basePath}.${optIdx}.is_correct`)}
                    onCheckedChange={(checked) =>
                      form.setValue(`${basePath}.${optIdx}.is_correct`, checked === true)
                    }
                  />
                  Correct
                </label>
                <ConfirmDeletePopover
                  title="Delete answer?"
                  onConfirm={() => handleRemoveOption(optIdx)}
                  disabled={indices.length <= 1}
                >
                  <Button type="button" variant="ghost" size="icon">
                    <Trash2 className="size-4" />
                  </Button>
                </ConfirmDeletePopover>
              </div>
            );
            })}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const opts = form.getValues(basePath);
                form.setValue(basePath, [
                  ...opts,
                  { option_text: "", is_correct: false, gap_index: gapIndex },
                ]);
              }}
            >
              <Plus className="size-4" /> Add answer{gapCount > 1 ? ` for gap ${gapIndex + 1}` : ""}
            </Button>
          </div>
        );
      })}
    </div>
  );
}

export interface QuizQuestionMatchingOptionProps {
  form: UseFormReturn<QuizQuestionFormValues>;
  pageIndex: number;
  qIndex: number;
}

export function QuizQuestionMatchingOption({
  form,
  pageIndex,
  qIndex,
}: QuizQuestionMatchingOptionProps) {
  const options = form.watch(`pages.${pageIndex}.questions.${qIndex}.options`) ?? [];
  const questionError = (form.formState?.errors as PageQuestionErrors)?.pages?.[pageIndex]?.questions?.[qIndex]?.root;
  const questionErrorMessage = questionError?.message ?? "";
  const basePath = `pages.${pageIndex}.questions.${qIndex}.options` as const;
  const opt = options[0];

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      {questionErrorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{questionErrorMessage}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-2">
        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Left column (matching item)
        </Label>
        {opt ? (
          <Input
            {...form.register(`${basePath}.0.option_text`)}
            placeholder="Item to drag to the right"
          />
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const opts = form.getValues(basePath);
              form.setValue(basePath, [...opts, { option_text: "", is_correct: true }]);
            }}
          >
            <Plus className="size-4" /> Add matching item
          </Button>
        )}
      </div>
    </div>
  );
}
