import type { TestType } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';
import { UseFormReturn } from 'react-hook-form';
import { useState } from 'react';
import { QuestionTitleEditor } from '../question-title-editor';
import { QuizQuestionChoiceOptions, type QuizQuestionFormValues, QuizQuestionInputGapsOptions, QuizQuestionSelectGapsOptions, QuizQuestionMatchingOption } from '../quiz-question-options-editor';
import { TheoryImage } from '../theory-image';
import { Button } from '../ui/button';
import { ConfirmDeletePopover } from '../ui/confirm-delete-popover';
import { Input } from '../ui/input';
import { PageBlockFormValues } from './page-block';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';

interface QuestionItemCardProps {
    form: UseFormReturn<PageBlockFormValues>;
    pageIndex: number;
    qIndex: number;
    pageType: TestType;
    defaultOption: () => { option_text: string; is_correct: boolean };
    onRemove: () => void;
    canRemove: boolean;
    uploadingQuestionTarget: string | null;
    uploadError: string | null;
    onUploadQuestionImage: (qIndex: number, file: File) => void | Promise<void>;
    onConfirmDeleteOption?: (oIndex: number) => void | Promise<boolean>;
    onRemoveImage?: () => void | Promise<boolean>;
}

export function QuestionItemCard({
    form,
    pageIndex,
    qIndex,
    pageType,
    defaultOption,
    onRemove,
    canRemove,
    uploadingQuestionTarget,
    uploadError,
    onUploadQuestionImage,
    onConfirmDeleteOption,
    onRemoveImage,
}: QuestionItemCardProps) {
    const questionImage = form.watch(`pages.${pageIndex}.questions.${qIndex}.question_image_url`) ?? "";
    const uploadTarget = `${pageIndex}-${qIndex}`;
    const [isRemovingImage, setIsRemovingImage] = useState(false);

    async function handleRemoveImage() {
        if (isRemovingImage) return;
        setIsRemovingImage(true);
        try {
            const ok = onRemoveImage ? await onRemoveImage() : true;
            if (!ok) return;
            form.setValue(`pages.${pageIndex}.questions.${qIndex}.question_image_url`, "", { shouldDirty: true, shouldValidate: true });
        } finally {
            setIsRemovingImage(false);
        }
    }

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
                            placeholder={pageType === "matching" ? "Text shown on the right (or upload image below)" : "Enter the question (or upload image below)"}
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

                <div className="space-y-2">
                    <Label className="text-sm font-semibold text-foreground">Question image (optional)</Label>
                    <Input
                        type="file"
                        accept="image/*"
                        disabled={form.formState.isSubmitting || uploadingQuestionTarget === uploadTarget}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onUploadQuestionImage(qIndex, file);
                            e.currentTarget.value = "";
                        }}
                    />
                    {uploadError && uploadingQuestionTarget === null && (
                        <p className="text-sm text-destructive">{uploadError}</p>
                    )}
                    {questionImage ? (
                        <div className="space-y-2">
                            <TheoryImage src={questionImage} alt={`Question ${qIndex + 1}`} />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isRemovingImage || form.formState.isSubmitting}
                                onClick={() => void handleRemoveImage()}
                            >
                                {isRemovingImage ? "Removing..." : "Remove image"}
                            </Button>
                        </div>
                    ) : null}
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
