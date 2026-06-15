"use client";

import type { UseFieldArrayReturn } from "react-hook-form";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";
import type { TestType } from "@/lib/supabase";
import type { useQuizAiGeneration } from "@/hooks/use-quiz-ai-generation";
import type { CrosswordSelectOption } from "@/components/page-block/crossword-page-select";
import { QuizDetailsSection } from "@/components/screens/quiz-details-section";

export interface CreateQuizGenerationStatus {
  state: "idle" | "loading" | "error" | "success";
  message?: string;
}

interface CreateQuizDetailsSectionProps {
  topics: { id: string; name: string }[];
  selectedTopicId: string;
  isListeningChapter: boolean;
  videoUrl: string;
  onVideoUrlChange: (url: string) => void;
  ai: ReturnType<typeof useQuizAiGeneration>;
  genStatus: CreateQuizGenerationStatus;
  onGenerate: (topicOverride: string) => Promise<void>;
  pagesArray: UseFieldArrayReturn<CreateQuizFormValues, "pages", "id">;
  activePageIndex: number;
  onActivePageIndexChange: (index: number) => void;
  defaultPage: (pageIndex: number, forcedType?: TestType) => CreateQuizFormValues["pages"][number];
  defaultOption: (gapIndex?: number) => CreateQuizFormValues["pages"][number]["questions"][number]["options"][number];
  defaultQuestion: (orderIndex: number, pageType?: TestType) => CreateQuizFormValues["pages"][number]["questions"][number];
  crosswordOptions: CrosswordSelectOption[];
}

export function CreateQuizDetailsSection({
  topics,
  selectedTopicId,
  isListeningChapter,
  videoUrl,
  onVideoUrlChange,
  ai,
  genStatus,
  onGenerate,
  pagesArray,
  activePageIndex,
  onActivePageIndexChange,
  defaultPage,
  defaultOption,
  defaultQuestion,
  crosswordOptions,
}: CreateQuizDetailsSectionProps) {
  return (
    <QuizDetailsSection<CreateQuizFormValues["pages"][number]>
      topics={topics}
      selectedTopicId={selectedTopicId}
      isListeningChapter={isListeningChapter}
      videoUrl={videoUrl}
      onVideoUrlChange={onVideoUrlChange}
      ai={ai}
      onGenerate={onGenerate}
      generatedSummary={genStatus.state === "success" ? genStatus.message ?? null : null}
      generationError={ai.errorMessage ?? (genStatus.state === "error" ? genStatus.message ?? null : null)}
      pagesController={{
        fields: pagesArray.fields,
        append: (value) => pagesArray.append(value),
        move: pagesArray.move,
        remove: pagesArray.remove,
      }}
      activePageIndex={activePageIndex}
      onActivePageIndexChange={onActivePageIndexChange}
      defaultPage={(pageIndex) => defaultPage(pageIndex)}
      defaultOption={() => defaultOption()}
      defaultQuestion={defaultQuestion}
      crosswordOptions={crosswordOptions}
      onDeletePage={(pageIndex) => {
        const nextIndex = Math.max(0, Math.min(pageIndex, pagesArray.fields.length - 2));
        pagesArray.remove(pageIndex);
        onActivePageIndexChange(nextIndex);
      }}
      sanitizeTitlePasteWhenEmpty={isListeningChapter}
    />
  );
}
