"use client";

import { uploadTheoryImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { CrosswordPageSelect, type CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import { Label } from "@/components/ui/label";
import { useImageUpload } from "@/hooks/use-image-upload";
import { usePageQuestions } from "@/hooks/use-page-questions";
import type { TestType } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import { PageTitleFields } from './page-title-fields';
import { PageTypeSelect } from './page-type-select';
import { QuestionItemCard } from './question-item-card';

export type PageBlockFormValues = {
  pages: {
    id?: string;
    type: TestType;
    title?: string;
    example?: string;
    order_index?: number;
      crossword_quiz_id?: string | null;
    questions: {
      id?: string;
      question_title: string;
      question_image_url?: string;
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
  totalPages?: number;
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
  quizId?: string;
  onConfirmDeleteQuestion?: (pageIndex: number, qIndex: number) => Promise<boolean>;
  onConfirmDeleteOption?: (pageIndex: number, qIndex: number, oIndex: number) => Promise<boolean>;
  onConfirmRemoveQuestionImage?: (pageIndex: number, qIndex: number) => Promise<boolean>;
  hidePageTypeSelect?: boolean;
  hidePageTitleFields?: boolean;
  hideAddQuestionButton?: boolean;
  hideQuestionImageBlock?: boolean;
  useLyricsTerminology?: boolean;
  /** Табы снаружи: без аккордеона и дубля заголовка страницы */
  embeddedInTabs?: boolean;
  crosswordOptions?: CrosswordSelectOption[];
}

export function PageBlock({
  form,
  pageIndex,
  totalPages,
  defaultOption,
  defaultQuestion,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  quizId,
  onConfirmDeleteQuestion,
  onConfirmDeleteOption,
  onConfirmRemoveQuestionImage,
  hidePageTypeSelect = false,
  hidePageTitleFields = false,
  hideAddQuestionButton = false,
  hideQuestionImageBlock = false,
  useLyricsTerminology = false,
  embeddedInTabs = false,
  crosswordOptions = [],
}: PageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [pendingFocusQuestionIndex, setPendingFocusQuestionIndex] = useState<number | null>(null);
  const { uploadingTarget: uploadingQuestionTarget, uploadError, uploadForTarget } = useImageUpload<string>({
    uploadImage: uploadTheoryImage,
    baseFields: quizId ? { quizId } : undefined,
  });
  const pageType = useWatch({
    control: form.control,
    name: `pages.${pageIndex}.type`,
  });
  const crosswordQuizId = useWatch({
    control: form.control,
    name: `pages.${pageIndex}.crossword_quiz_id`,
  });
  const { questionsArray, handleMoveQuestion, handleRemoveQuestion } = usePageQuestions({
    form,
    pageIndex,
    onConfirmDeleteQuestion,
  });

  const defaultOptionRef = useRef(defaultOption);
  useEffect(() => {
    defaultOptionRef.current = defaultOption;
  });
  const stableDefaultOption = useCallback(
    () => defaultOptionRef.current(),
    []
  );

  const clearPendingFocusQuestion = useCallback(() => {
    setPendingFocusQuestionIndex(null);
  }, []);

  const questionsCount = questionsArray.fields.length;

  const handleUploadQuestionImage = useCallback(
    async (qIndex: number, file: File) => {
      const url = await uploadForTarget(`${pageIndex}-${qIndex}`, file, { folder: "questions" });
      if (!url) return;
      form.setValue(`pages.${pageIndex}.questions.${qIndex}.question_image_url`, url, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form, pageIndex, uploadForTarget]
  );

  const showExpanded = embeddedInTabs || isExpanded;
  const pagesCount = totalPages ?? form.getValues("pages")?.length ?? pageIndex + 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex w-full items-center gap-2">
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveUp}
              disabled={!canMoveUp}
              title="Move page left"
              aria-label="Move page left"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <span className="min-w-10 text-center text-xs text-muted-foreground">
              {pageIndex + 1}/{Math.max(1, pagesCount)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onMoveDown}
              disabled={!canMoveDown}
              title="Move page right"
              aria-label="Move page right"
            >
              <ArrowRight className="size-4" />
            </Button>
          </div>
          {!embeddedInTabs ? (
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
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex shrink-0 items-center">
            <ConfirmDeletePopover title="Delete page?" onConfirm={onRemove} disabled={!canRemove}>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Удалить страницу">
                <Trash2 className="size-4" />
              </Button>
            </ConfirmDeletePopover>
          </div>
        </div>
      </CardHeader>
      {showExpanded && (
        <CardContent className="space-y-4">
          {!hidePageTypeSelect && (
            <PageTypeSelect form={form} pageIndex={pageIndex} defaultOption={defaultOption} />
          )}
          {!hidePageTitleFields && (
            <PageTitleFields form={form} pageIndex={pageIndex} />
          )}

          {pageType === "crossword" ? (
            <CrosswordPageSelect
              value={crosswordQuizId ?? ""}
              onChange={(value: string) =>
                form.setValue(`pages.${pageIndex}.crossword_quiz_id`, value, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              options={crosswordOptions}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label>{useLyricsTerminology ? "Lyrics" : "Questions"}</Label>
                <span className="text-sm text-muted-foreground">
                  {useLyricsTerminology ? "Lines" : "Questions"}: {questionsArray.fields.length}
                </span>
              </div>
              {questionsArray.fields.map((qField, qIndex) => (
                <QuestionItemCard
                  key={qField.id}
                  form={form}
                  pageIndex={pageIndex}
                  qIndex={qIndex}
                  pageType={pageType}
                  questionsCount={questionsCount}
                  defaultOption={stableDefaultOption}
                  onRemoveQuestion={handleRemoveQuestion}
                  onMoveQuestion={handleMoveQuestion}
                  canRemove={questionsCount > 1}
                  uploadingQuestionTarget={uploadingQuestionTarget}
                  uploadError={uploadError}
                  onUploadQuestionImage={handleUploadQuestionImage}
                  onConfirmDeleteOption={onConfirmDeleteOption}
                  onConfirmRemoveQuestionImage={onConfirmRemoveQuestionImage}
                  hideQuestionImageBlock={hideQuestionImageBlock}
                  hideQuestionTitle={useLyricsTerminology}
                  autoFocusTitle={qIndex === pendingFocusQuestionIndex}
                  onTitleAutoFocusDone={clearPendingFocusQuestion}
                />
              ))}
              <div className="flex justify-between items-center gap-2">
                {!hideAddQuestionButton && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newQuestionIndex = questionsArray.fields.length;
                      setPendingFocusQuestionIndex(newQuestionIndex);
                      questionsArray.append(
                        defaultQuestion(
                          questionsArray.fields.length,
                          pageType
                        ) as PageBlockFormValues["pages"][0]["questions"][0]
                      );
                    }}
                  >
                    <Plus className="size-4" /> Add question
                  </Button>
                )}
                {!embeddedInTabs && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(false)}
                  >
                    Collapse
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
