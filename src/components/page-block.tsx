"use client";

import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Plus, Trash2, ChevronDown, ChevronUp, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TestType } from "@/lib/supabase";
import {
  QuizQuestionChoiceOptions,
  QuizQuestionInputGapsOptions,
  QuizQuestionSelectGapsOptions,
  QuizQuestionMatchingOption,
} from "@/components/quiz-question-options-editor";
import type { QuizQuestionFormValues } from "@/components/quiz-question-options-editor";
import { QuestionTitleEditor } from './question-title-editor';

export type PageBlockFormValues = {
  pages: {
    id?: string;
    type: TestType;
    title?: string;
    example?: string;
    order_index?: number;
    questions: {
      id?: string;
      question_title: string;
      explanation: string;
      order_index: number;
      options: {
        id?: string;
        option_text: string;
        is_correct: boolean;
        gap_index?: number;
      }[];
    }[];
  }[];
};

export interface PageBlockProps {
  form: UseFormReturn<PageBlockFormValues>;
  pageIndex: number;
  defaultOption: () => { option_text: string; is_correct: boolean };
  defaultQuestion: (
    orderIndex: number,
    pageType?: TestType
  ) => PageBlockFormValues["pages"][0]["questions"][0];
  onRemove: () => void;
  canRemove: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onConfirmDeleteQuestion?: (pageIndex: number, qIndex: number) => Promise<boolean>;
  onConfirmDeleteOption?: (pageIndex: number, qIndex: number, oIndex: number) => Promise<boolean>;
}

// ─── PageTypeSelect ───────────────────────────────────────────────────────────

interface PageTypeSelectProps {
  form: UseFormReturn<PageBlockFormValues>;
  pageIndex: number;
  defaultOption: () => { option_text: string; is_correct: boolean };
}

function PageTypeSelect({ form, pageIndex, defaultOption }: PageTypeSelectProps) {
  return (
    <div className="space-y-2">
      <Label>Page type</Label>
      <select
        className="cursor-pointer h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:scheme-dark"
        value={form.watch(`pages.${pageIndex}.type`)}
        onChange={(e) => {
          const value = e.target.value as TestType;
          form.setValue(`pages.${pageIndex}.type`, value);
          const questions = form.getValues(`pages.${pageIndex}.questions`);
          if (value === "input" || value === "select_gaps") {
            form.setValue(
              `pages.${pageIndex}.questions`,
              questions.map((q, i) => ({
                ...q,
                order_index: i,
                options: [{ option_text: "", is_correct: true, gap_index: 0 }],
              }))
            );
          } else if (value === "matching") {
            form.setValue(
              `pages.${pageIndex}.questions`,
              questions.map((q, i) => {
                const one = q.options?.find((o) => o.is_correct) ?? q.options?.[0];
                return {
                  ...q,
                  order_index: i,
                  options: [{ option_text: one?.option_text ?? "", is_correct: true }],
                };
              })
            );
          } else {
            form.setValue(
              `pages.${pageIndex}.questions`,
              questions.map((q, i) => ({
                ...q,
                order_index: i,
                options: q.options?.length ? q.options : [defaultOption()],
              }))
            );
          }
        }}
      >
        <option value="single">Single choice</option>
        <option value="multiple">Multiple choice</option>
        <option value="input">Text input</option>
        <option value="select_gaps">Dropdown in gaps</option>
        <option value="matching">Matching</option>
      </select>
    </div>
  );
}

// ─── PageTitleFields ──────────────────────────────────────────────────────────

interface PageTitleFieldsProps {
  form: UseFormReturn<PageBlockFormValues>;
  pageIndex: number;
}

function PageTitleFields({ form, pageIndex }: PageTitleFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label>Page title (optional)</Label>
        <textarea
          {...form.register(`pages.${pageIndex}.title`)}
          placeholder="e.g. Choose the right form"
          rows={4}
          className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none resize-y min-h-[80px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label>Example (optional)</Label>
        <textarea
          {...form.register(`pages.${pageIndex}.example`)}
          placeholder="e.g. I usually get up at 7 a.m."
          rows={4}
          className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none resize-y min-h-[80px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
      </div>
    </>
  );
}

// ─── QuestionItemCard ─────────────────────────────────────────────────────────

interface QuestionItemCardProps {
  form: UseFormReturn<PageBlockFormValues>;
  pageIndex: number;
  qIndex: number;
  pageType: TestType;
  defaultOption: () => { option_text: string; is_correct: boolean };
  onRemove: () => void;
  canRemove: boolean;
  onConfirmDeleteOption?: (oIndex: number) => void | Promise<boolean>;
}

function QuestionItemCard({
  form,
  pageIndex,
  qIndex,
  pageType,
  defaultOption,
  onRemove,
  canRemove,
  onConfirmDeleteOption,
}: QuestionItemCardProps) {
  return (
    <Card className="border-muted transition-[border-color,box-shadow,background-color] duration-200 focus-within:border-primary focus-within:bg-muted/40 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Question {qIndex + 1}</CardTitle>
          <ConfirmDeletePopover
            title="Delete question?"
            onConfirm={onRemove}
            disabled={!canRemove}
          >
            <Button type="button" variant="ghost" size="icon-sm">
              <Trash2 className="size-4" />
            </Button>
          </ConfirmDeletePopover>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            {pageType === "input" || pageType === "select_gaps"
              ? "Sentence (use [[]] for the gap)"
              : pageType === "matching"
                ? "Right column (question)"
                : "Question text"}
          </Label>
          {pageType === "input" || pageType === "select_gaps" ? (
            <>
              {/* <textarea
                {...form.register(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                placeholder="Use [[]] where the user should type or choose"
                rows={4}
                className={cn(
                  "placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none resize-y min-h-[80px]",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
                  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                  form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title &&
                  "border-destructive"
                )}
              /> */}
              <QuestionTitleEditor
                value={form.watch(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                onChange={(html) => form.setValue(`pages.${pageIndex}.questions.${qIndex}.question_title`, html)}
                onBlur={() => form.trigger(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
                disabled={form.formState.isSubmitting}
                invalid={
                  !!form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title
                }
              />
            </>
          ) : (
            <Input
              {...form.register(`pages.${pageIndex}.questions.${qIndex}.question_title`)}
              placeholder={pageType === "matching" ? "Text shown on the right" : "Enter the question"}
              className={cn(
                form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title &&
                "border-destructive"
              )}
            />
          )}
          {form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title && (
            <p className="text-sm text-destructive">
              {
                form.formState.errors.pages?.[pageIndex]?.questions?.[qIndex]?.question_title
                  ?.message
              }
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border/60 pt-4">
          <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Explanation (optional)
            {pageType === "input" || pageType === "select_gaps" ? " — use 1:, 2:, … for each gap" : ""}
          </Label>
          <textarea
            {...form.register(`pages.${pageIndex}.questions.${qIndex}.explanation`)}
            placeholder={
              pageType === "input" || pageType === "select_gaps"
                ? "e.g. 1: correct form; 2: synonym of …"
                : "Shown after answer"
            }
            rows={3}
            className="placeholder:text-muted-foreground border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none resize-y min-h-[72px] focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        {(pageType === "single" || pageType === "multiple") && (
          <QuizQuestionChoiceOptions
            form={form as unknown as UseFormReturn<QuizQuestionFormValues>}
            pageIndex={pageIndex}
            qIndex={qIndex}
            pageType={pageType}
            defaultOption={defaultOption}
            onBeforeRemoveOption={onConfirmDeleteOption}
          />
        )}

        {pageType === "input" && (
          <QuizQuestionInputGapsOptions
            form={form as unknown as UseFormReturn<QuizQuestionFormValues>}
            pageIndex={pageIndex}
            qIndex={qIndex}
            onBeforeRemoveOption={onConfirmDeleteOption}
          />
        )}

        {pageType === "select_gaps" && (
          <QuizQuestionSelectGapsOptions
            form={form as unknown as UseFormReturn<QuizQuestionFormValues>}
            pageIndex={pageIndex}
            qIndex={qIndex}
            onBeforeRemoveOption={onConfirmDeleteOption}
          />
        )}

        {pageType === "matching" && (
          <QuizQuestionMatchingOption
            form={form as unknown as UseFormReturn<QuizQuestionFormValues>}
            pageIndex={pageIndex}
            qIndex={qIndex}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ─── PageBlock ────────────────────────────────────────────────────────────────

export function PageBlock({
  form,
  pageIndex,
  defaultOption,
  defaultQuestion,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onConfirmDeleteQuestion,
  onConfirmDeleteOption,
}: PageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const pageType = form.watch(`pages.${pageIndex}.type`);
  const questionsArray = useFieldArray({
    control: form.control,
    name: `pages.${pageIndex}.questions`,
  });

  async function handleRemoveQuestion(qIndex: number) {
    const ok = onConfirmDeleteQuestion ? await onConfirmDeleteQuestion(pageIndex, qIndex) : true;
    if (ok) questionsArray.remove(qIndex);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={isExpanded}
          >
            <span className="shrink-0">
              {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
            <CardTitle className="text-base">Page {pageIndex + 1}</CardTitle>
          </button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveUp}
              disabled={!canMoveUp}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveDown}
              disabled={!canMoveDown}
            >
              <ArrowDown className="size-4" />
            </Button>
            <ConfirmDeletePopover title="Delete page?" onConfirm={onRemove} disabled={!canRemove}>
              <Button type="button" variant="ghost" size="icon-sm">
                <Trash2 className="size-4" />
              </Button>
            </ConfirmDeletePopover>
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <PageTypeSelect form={form} pageIndex={pageIndex} defaultOption={defaultOption} />
          <PageTitleFields form={form} pageIndex={pageIndex} />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label>Questions</Label>
              <span className="text-sm text-muted-foreground">
                Questions: {questionsArray.fields.length}
              </span>
            </div>
            {questionsArray.fields.map((qField, qIndex) => (
              <QuestionItemCard
                key={qField.id}
                form={form}
                pageIndex={pageIndex}
                qIndex={qIndex}
                pageType={pageType}
                defaultOption={defaultOption}
                onRemove={() => void handleRemoveQuestion(qIndex)}
                canRemove={questionsArray.fields.length > 1}
                onConfirmDeleteOption={
                  onConfirmDeleteOption
                    ? (oIndex) => onConfirmDeleteOption(pageIndex, qIndex, oIndex)
                    : undefined
                }
              />
            ))}
            <div className="flex justify-between items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  questionsArray.append(
                    defaultQuestion(
                      questionsArray.fields.length,
                      pageType
                    ) as PageBlockFormValues["pages"][0]["questions"][0]
                  )
                }
              >
                <Plus className="size-4" /> Add question
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
              >
                Collapse
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
