"use client";

import { useCallback } from "react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { deleteOption, deleteQuestion, deleteQuestionImage, deleteQuizPage } from "@/app/admin/actions";
import { runDeleteAction, type DeleteActionResult } from "@/hooks/delete-action-helper";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

interface UseEditQuizDeleteHandlersParams {
  form: UseFormReturn<EditQuizFormValues>;
  pagesArray: UseFieldArrayReturn<EditQuizFormValues, "pages", "id">;
  setActivePageIndex: (index: number) => void;
  setResult: (result: DeleteActionResult) => void;
  handleDeleteTheoryBlock: (index: number) => Promise<boolean>;
}

export function useEditQuizDeleteHandlers({
  form,
  pagesArray,
  setActivePageIndex,
  setResult,
  handleDeleteTheoryBlock,
}: UseEditQuizDeleteHandlersParams) {
  const handleDeletePage = useCallback(async (pageIndex: number) => {
    const page = form.getValues(`pages.${pageIndex}`);
    const removed = await runDeleteAction({
      id: page?.id,
      action: deleteQuizPage,
      setResult,
      errorTitle: "Failed to delete page",
      successTitle: "Page deleted",
    });
    if (!removed) return;

    pagesArray.remove(pageIndex);
    setActivePageIndex(0);
  }, [form, pagesArray, setActivePageIndex, setResult]);

  const handleConfirmDeleteQuestion = useCallback(async (pageIndex: number, questionIndex: number) => {
    const question = form.getValues(`pages.${pageIndex}.questions.${questionIndex}`);
    return runDeleteAction({
      id: question?.id,
      action: deleteQuestion,
      setResult,
      errorTitle: "Failed to delete question",
      successTitle: "Question deleted",
    });
  }, [form, setResult]);

  const handleConfirmDeleteOption = useCallback(async (pageIndex: number, questionIndex: number, optionIndex: number) => {
    const options = form.getValues(`pages.${pageIndex}.questions.${questionIndex}.options`) ?? [];
    const option = options[optionIndex];
    return runDeleteAction({
      id: option?.id,
      action: deleteOption,
      setResult,
      errorTitle: "Failed to delete answer option",
      successTitle: "Answer option deleted",
    });
  }, [form, setResult]);

  const handleConfirmRemoveQuestionImage = useCallback(async (pageIndex: number, questionIndex: number) => {
    const question = form.getValues(`pages.${pageIndex}.questions.${questionIndex}`);
    return runDeleteAction({
      id: question?.id,
      action: deleteQuestionImage,
      setResult,
      errorTitle: "Failed to delete image",
      successTitle: "Image deleted",
    });
  }, [form, setResult]);

  const handleRemoveTheoryBlock = useCallback(async (index: number) => {
    const removed = await handleDeleteTheoryBlock(index);
    if (removed) {
      toast.success("Theory block deleted");
      return;
    }
    toast.error("Failed to delete theory block");
  }, [handleDeleteTheoryBlock]);

  return {
    handleDeletePage,
    handleConfirmDeleteQuestion,
    handleConfirmDeleteOption,
    handleConfirmRemoveQuestionImage,
    handleRemoveTheoryBlock,
  };
}
