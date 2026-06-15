"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { UseFieldArrayReturn } from "react-hook-form";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";

type EditQuizPageValue = EditQuizFormValues["pages"][number];
type EditQuizQuestionValue = EditQuizPageValue["questions"][number];
type EditQuizOptionValue = EditQuizQuestionValue["options"][number];

interface EditQuizEditorContextValue {
  isListeningChapter: boolean;
  pagesArray: UseFieldArrayReturn<EditQuizFormValues, "pages", "id">;
  activePageIndex: number;
  setActivePageIndex: (index: number) => void;
  defaultOption: () => EditQuizOptionValue;
  defaultPage: (pageIndex?: number) => EditQuizPageValue;
  defaultQuestion: (orderIndex: number) => EditQuizQuestionValue;
  quizId: string;
  crosswordOptions: CrosswordSelectOption[];
  onDeletePage: (pageIndex: number) => Promise<void>;
  onConfirmDeleteQuestion: (pageIndex: number, questionIndex: number) => Promise<boolean>;
  onConfirmDeleteOption: (pageIndex: number, questionIndex: number, optionIndex: number) => Promise<boolean>;
  onConfirmRemoveQuestionImage: (pageIndex: number, questionIndex: number) => Promise<boolean>;
}

const EditQuizEditorContext = createContext<EditQuizEditorContextValue | null>(null);

interface EditQuizEditorProviderProps extends EditQuizEditorContextValue {
  children: ReactNode;
}

export function EditQuizEditorProvider({
  children,
  ...value
}: EditQuizEditorProviderProps) {
  return (
    <EditQuizEditorContext.Provider value={value}>
      {children}
    </EditQuizEditorContext.Provider>
  );
}

export function useEditQuizEditor() {
  const context = useContext(EditQuizEditorContext);
  if (!context) {
    throw new Error("useEditQuizEditor must be used within EditQuizEditorProvider");
  }
  return context;
}
