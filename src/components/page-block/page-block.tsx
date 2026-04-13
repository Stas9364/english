"use client";

import { uploadTheoryImage } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeletePopover } from "@/components/ui/confirm-delete-popover";
import { Label } from "@/components/ui/label";
import { useImageUpload } from "@/hooks/use-image-upload";
import type { TestType } from "@/lib/supabase";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";
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
}


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
  quizId,
  onConfirmDeleteQuestion,
  onConfirmDeleteOption,
  onConfirmRemoveQuestionImage,
}: PageBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { uploadingTarget: uploadingQuestionTarget, uploadError, uploadForTarget } = useImageUpload<string>({
    uploadImage: uploadTheoryImage,
    baseFields: quizId ? { quizId } : undefined,
  });
  const pageType = form.watch(`pages.${pageIndex}.type`);
  const questionsArray = useFieldArray({
    control: form.control,
    name: `pages.${pageIndex}.questions`,
  });

  async function handleRemoveQuestion(qIndex: number) {
    const ok = onConfirmDeleteQuestion ? await onConfirmDeleteQuestion(pageIndex, qIndex) : true;
    if (ok) questionsArray.remove(qIndex);
  }

  async function handleUploadQuestionImage(qIndex: number, file: File) {
    const url = await uploadForTarget(`${pageIndex}-${qIndex}`, file, { folder: "questions" });
    if (!url) return;
    form.setValue(`pages.${pageIndex}.questions.${qIndex}.question_image_url`, url, { shouldDirty: true, shouldValidate: true });
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
                uploadingQuestionTarget={uploadingQuestionTarget}
                uploadError={uploadError}
                onUploadQuestionImage={handleUploadQuestionImage}
                onConfirmDeleteOption={
                  onConfirmDeleteOption
                    ? (oIndex) => onConfirmDeleteOption(pageIndex, qIndex, oIndex)
                    : undefined
                }
                onRemoveImage={
                  onConfirmRemoveQuestionImage
                    ? () => onConfirmRemoveQuestionImage(pageIndex, qIndex)
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
